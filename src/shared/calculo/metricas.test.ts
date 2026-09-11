/**
 * El gate del kernel. Compara contra los números de oro del mockup — que son
 * EXTERNOS y fijos — y cuenta las filas. No compara la semilla consigo misma.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  GASTOS_DEMO, LLAMADAS_DEMO, ORO, PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO, SEMANA_ORO,
} from '../datos/semilla'
import { dineroCorto, dinero, porcentaje, porcentajeEntero, puntos, EL_GUION, iniciales, tituloDeVentana } from '../formato'
import {
  agregarLlamadas, aov, barrasPorDia, barrasPorSemana, cac, costoPorLlamadaAsistida,
  delta, embudo, metricas, metricasConCosto, rankingClosers, rankingSetters, tasa,
} from './metricas'
import { diasDe, ventana, ventanaAnterior } from './periodo'

const V = { desde: SEMANA_ORO[0], hasta: SEMANA_ORO[6] }

test('la semilla tiene exactamente 42 filas', () => {
  assert.equal(REPORTES_SETTER_DEMO.length + REPORTES_CLOSER_DEMO.length, ORO.filas)
  assert.equal(REPORTES_SETTER_DEMO.length, 21)
  assert.equal(REPORTES_CLOSER_DEMO.length, 21)
})

test('los totales dan los números del mockup', () => {
  const m = metricas(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO)
  assert.equal(m.leads, ORO.leads)
  assert.equal(m.agendas, ORO.agendas)
  assert.equal(m.llamadas, ORO.llamadas)
  assert.equal(m.asistieron, ORO.asistieron)
  assert.equal(m.cierres, ORO.cierres)
  assert.equal(m.revenueCents, ORO.revenue)
  assert.equal(m.cashCents, ORO.cash)
})

test('las tasas se escriben como en el mockup', () => {
  const m = metricas(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO)
  assert.equal(porcentaje(m.tasaAgenda), ORO.tasaAgenda)
  assert.equal(porcentaje(m.tasaAsistencia), ORO.tasaAsistencia)
  assert.equal(porcentaje(m.tasaCierre), ORO.tasaCierre)
  assert.equal(porcentajeEntero(m.porcentajeCobro), ORO.cobro)
  assert.equal(porcentajeEntero(m.llamadasSobreAgendas), ORO.llamadasSobreAgendas)
  assert.equal(m.ticketPromedioCents, ORO.ticketPromedio)
})

test('🔴 con divisor 0 la tasa es null y se pinta —, nunca NaN', () => {
  const m = metricas([], [])
  for (const t of [m.tasaAgenda, m.tasaAsistencia, m.tasaCierre, m.porcentajeCobro, m.llamadasSobreAgendas]) {
    assert.equal(t, null)
    assert.equal(porcentaje(t), EL_GUION)
  }
  assert.equal(m.ticketPromedioCents, null)
  assert.equal(tasa(5, 0), null)
  assert.equal(delta(null, 0.3), null)
  assert.equal(puntos(null), EL_GUION)
  // y los totales siguen siendo números, no NaN
  assert.equal(m.leads, 0)
  assert.equal(dinero(m.cashCents), '$0')
})

test('el ranking de closers da el orden y los montos del mockup', () => {
  const filas = rankingClosers(PERSONAS_DEMO, REPORTES_CLOSER_DEMO)
  assert.equal(filas.length, 3)
  filas.forEach((f, i) => {
    assert.equal(f.persona.nombre, ORO.closers[i].nombre)
    assert.equal(f.valor, ORO.closers[i].cash)
    assert.equal(f.detalle.cierres, ORO.closers[i].cierres)
    assert.equal(porcentajeEntero(f.detalle.tasa), ORO.closers[i].tasaCierre)
  })
})

test('el ranking de setters da el orden, las agendas y los leads del mockup', () => {
  const filas = rankingSetters(PERSONAS_DEMO, REPORTES_SETTER_DEMO)
  assert.equal(filas.length, 3)
  filas.forEach((f, i) => {
    assert.equal(f.persona.nombre, ORO.setters[i].nombre)
    assert.equal(f.valor, ORO.setters[i].agendas)
    assert.equal(f.detalle.leads, ORO.setters[i].leads)
    assert.equal(porcentajeEntero(f.detalle.tasa), ORO.setters[i].tasaAgenda)
  })
})

test('el cash por día cuadra y la barra más alta llega al 100', () => {
  const barras = barrasPorDia(V, REPORTES_CLOSER_DEMO)
  assert.equal(barras.length, 7)
  assert.deepEqual(barras.map((b) => b.cashCents), [...ORO.cashPorDia])
  assert.equal(barras.reduce((s, b) => s + b.cashCents, 0), ORO.cash)
  const maxima = barras.filter((b) => b.esMaxima)
  assert.equal(maxima.length, 1)
  assert.equal(maxima[0].clave, '2026-07-23') // el jueves
  assert.equal(maxima[0].altura, 100)
  assert.deepEqual(barras.map((b) => b.etiqueta), ['L', 'M', 'M', 'J', 'V', 'S', 'D'])
})

test('sin datos, ninguna barra se dibuja y no se divide por cero', () => {
  const barras = barrasPorDia(V, [])
  assert.equal(barras.length, 7)
  assert.ok(barras.every((b) => b.altura === 0 && !b.esMaxima))
})

test('en modo Mes las barras se agrupan por semana, no una por día', () => {
  // julio de 2026 tiene 31 días: por día serían 31 rayitas ilegibles en un celular
  const julio = ventana('mes', '2026-07-15')
  const barras = barrasPorSemana(julio, REPORTES_CLOSER_DEMO, 1)
  assert.ok(barras.length >= 4 && barras.length <= 6, `esperaba 4-6 barras, hubo ${barras.length}`)
  assert.deepEqual(barras.map((b) => b.etiqueta), barras.map((_, i) => `S${i + 1}`))
  // toda la semilla vive en una sola semana, así que todo el cash cae en una barra
  assert.equal(barras.reduce((s, b) => s + b.cashCents, 0), ORO.cash)
  const conPlata = barras.filter((b) => b.cashCents > 0)
  assert.equal(conPlata.length, 1)
  assert.equal(conPlata[0].altura, 100)
})

test('el embudo tiene los 6 pasos del mockup, en orden', () => {
  const pasos = embudo(metricas(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO))
  assert.deepEqual(pasos.map((p) => p.nombre), ['Leads','Agendas','Llamadas','Asistieron','Cierres','Cash'])
  assert.equal(pasos[0].ancho, 100)
  assert.equal(pasos[5].valor, ORO.cash)
  assert.equal(dineroCorto(pasos[5].valor), '$41.4k')
})

test('la semana es de lunes a domingo y la anterior es la de antes', () => {
  // el jueves 23 cae en la semana del lunes 20
  assert.deepEqual(ventana('semana', '2026-07-23'), { desde: '2026-07-20', hasta: '2026-07-26' })
  // el propio lunes también
  assert.deepEqual(ventana('semana', '2026-07-20'), { desde: '2026-07-20', hasta: '2026-07-26' })
  // y el domingo 26 es el ÚLTIMO día de esa semana, no el primero de la próxima
  assert.deepEqual(ventana('semana', '2026-07-26'), { desde: '2026-07-20', hasta: '2026-07-26' })
  // con la semana arrancando en domingo, el 26 abre la siguiente
  assert.deepEqual(ventana('semana', '2026-07-26', 0), { desde: '2026-07-26', hasta: '2026-08-01' })
  assert.deepEqual(ventanaAnterior('semana', V), { desde: '2026-07-13', hasta: '2026-07-19' })
  assert.equal(diasDe(V).length, 7)
})

test('el mes conoce los meses cortos, los largos y febrero bisiesto', () => {
  assert.deepEqual(ventana('mes', '2026-07-15'), { desde: '2026-07-01', hasta: '2026-07-31' })
  assert.deepEqual(ventana('mes', '2026-06-15'), { desde: '2026-06-01', hasta: '2026-06-30' })
  assert.deepEqual(ventana('mes', '2026-02-10'), { desde: '2026-02-01', hasta: '2026-02-28' })
  assert.deepEqual(ventana('mes', '2028-02-10'), { desde: '2028-02-01', hasta: '2028-02-29' })
  assert.deepEqual(ventanaAnterior('mes', ventana('mes', '2026-01-15')), { desde: '2025-12-01', hasta: '2025-12-31' })
})

test('🔴 la fecha no se corre por zona horaria', () => {
  // Si esto usara `new Date('2026-07-20')` en una zona al oeste de Greenwich,
  // el lunes se leería como domingo y caería en la semana anterior.
  assert.deepEqual(ventana('dia', '2026-07-20'), { desde: '2026-07-20', hasta: '2026-07-20' })
  assert.equal(diasDe(V)[0], '2026-07-20')
  assert.equal(diasDe(V)[6], '2026-07-26')
})

test('los formatos son los del mockup', () => {
  assert.equal(dinero(ORO.cash), '$41,400')
  assert.equal(dinero(ORO.revenue), '$69,000')
  assert.equal(dinero(ORO.ticketPromedio), '$3,000')
  assert.equal(puntos(2.1), '+2.1 pts')
  assert.equal(puntos(-1.5), '−1.5 pts')
  assert.equal(iniciales('Sofía Lara'), 'SL')
  assert.equal(iniciales('Leandro Pascual'), 'LP')
  assert.equal(tituloDeVentana('semana', V.desde, V.hasta), 'Semana 20–26 de julio de 2026')
})

test('un día del período rinde solo ese día', () => {
  const v = ventana('dia', '2026-07-23')
  const m = metricas(
    REPORTES_SETTER_DEMO.filter((r) => r.fecha === v.desde),
    REPORTES_CLOSER_DEMO.filter((r) => r.fecha === v.desde)
  )
  assert.equal(m.cashCents, ORO.cashPorDia[3])
  assert.equal(m.cierres, 5)
})

// ---------------------------------------------------------------- Fase A · costo

test('Fase A · la semilla de gastos suma la semana de oro', () => {
  assert.equal(GASTOS_DEMO.length, 7)
  const total = GASTOS_DEMO.reduce((s, g) => s + g.montoCents, 0)
  assert.equal(total, ORO.gastoSemana)
  assert.equal(dinero(total), '$14,400')
})

test('Fase A · CAC / costo por asistida / AOV cuadran contra el oro', () => {
  const total = GASTOS_DEMO.reduce((s, g) => s + g.montoCents, 0)
  const m = metricasConCosto(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO, total)
  assert.equal(m.gastoCents, ORO.gastoSemana)
  assert.equal(m.cac, ORO.cacSemana)
  assert.equal(m.costoPorLlamadaAsistida, ORO.costoAsistida)
  assert.equal(m.aov, ORO.aovSemana)
  // y las pinturas: dinero() redondea al peso con Math.round
  assert.equal(dinero(m.cac!), '$626')
  assert.equal(dinero(m.costoPorLlamadaAsistida!), '$229')
  assert.equal(dinero(m.aov!), '$1,800')
})

test('🔴 Fase A · divisor 0 en CAC / AOV / c-asistida devuelve null', () => {
  // vacío: 0 cierres, 0 asistidos
  const m = metricasConCosto([], [], 100_000_00)
  assert.equal(m.gastoCents, 100_000_00)   // el gasto se lee igual
  assert.equal(m.cac, null)
  assert.equal(m.costoPorLlamadaAsistida, null)
  assert.equal(m.aov, null)
  assert.equal(dinero(m.gastoCents), '$100,000')
  // y las funciones sueltas, para ancla:
  assert.equal(cac(100_000_00, 0), null)
  assert.equal(costoPorLlamadaAsistida(100_000_00, 0), null)
  assert.equal(aov(100_000_00, 0), null)
})

// ---------------------------------------------------------------- Fase D · llamadas

test('Fase D · LLAMADAS_DEMO tiene exactamente 96 filas y todas activas', () => {
  assert.equal(LLAMADAS_DEMO.length, ORO.filasLlamadas)
  assert.equal(LLAMADAS_DEMO.length, 96)
  assert.ok(LLAMADAS_DEMO.every((l) => l.activa === true))
})

test('Fase D · agregarLlamadas suma EXACTAMENTE lo mismo que REPORTES_CLOSER_DEMO', () => {
  // el puente convierte 96 llamadas en 21 filas agregadas por (fecha × persona)
  const agregados = agregarLlamadas(LLAMADAS_DEMO)
  assert.equal(agregados.length, REPORTES_CLOSER_DEMO.length)
  // comparación entera contra el agregado que hoy vive en la semilla
  const m1 = metricas(REPORTES_SETTER_DEMO, agregados)
  const m2 = metricas(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO)
  assert.equal(m1.llamadas, m2.llamadas)
  assert.equal(m1.asistieron, m2.asistieron)
  assert.equal(m1.cierres, m2.cierres)
  assert.equal(m1.revenueCents, m2.revenueCents)
  assert.equal(m1.cashCents, m2.cashCents)
})

test('Fase D · los totales derivados de llamadas cuadran contra el ORO', () => {
  const agregados = agregarLlamadas(LLAMADAS_DEMO)
  const m = metricas(REPORTES_SETTER_DEMO, agregados)
  assert.equal(m.llamadas, ORO.llamadas)
  assert.equal(m.asistieron, ORO.asistieron)
  assert.equal(m.cierres, ORO.cierres)
  assert.equal(m.revenueCents, ORO.revenue)
  assert.equal(m.cashCents, ORO.cash)
})

test('🔴 Fase D · una llamada con activa=false NO se cuenta', () => {
  // marca la primera activa=false y verifica que las cuentas bajan
  const primera = LLAMADAS_DEMO[0]
  const mutadas = LLAMADAS_DEMO.map((l, i) => i === 0 ? { ...l, activa: false } : l)
  const agregados = agregarLlamadas(mutadas)
  const m = metricas(REPORTES_SETTER_DEMO, agregados)
  assert.equal(m.llamadas, ORO.llamadas - 1)
  if (primera.asistio) assert.equal(m.asistieron, ORO.asistieron - 1)
  if (primera.cerro) {
    assert.equal(m.cierres, ORO.cierres - 1)
    assert.equal(m.revenueCents, ORO.revenue - primera.revenueCents)
  }
  assert.equal(m.cashCents, ORO.cash - primera.cashCents)
})

test('Fase D · una llamada agenda cuenta aunque no asista', () => {
  const l = [{
    id: 'x', personaId: 'p', fecha: '2026-07-20',
    asistio: false, reagendada: true, cerro: false,
    revenueCents: 0, cashCents: 0, activa: true, nota: null,
  }]
  const [a] = agregarLlamadas(l)
  assert.equal(a.llamadas, 1)
  assert.equal(a.asistieron, 0)
  assert.equal(a.reagendadas, 1)
})

test('Fase A · gasto = 0 no rompe: CAC y c-asistida quedan en 0, AOV sigue vivo', () => {
  // mes sin gastos cargados: los tres derivados que dependen del gasto dan 0,
  // pero AOV se calcula igual porque no depende del gasto
  const m = metricasConCosto(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO, 0)
  assert.equal(m.gastoCents, 0)
  assert.equal(m.cac, 0)
  assert.equal(m.costoPorLlamadaAsistida, 0)
  assert.equal(m.aov, ORO.aovSemana)
})

test('Fase A · el embudo con gasto tiene 7 pasos y el 0 es Gasto sin barra', () => {
  const m = metricas(REPORTES_SETTER_DEMO, REPORTES_CLOSER_DEMO)
  const pasos = embudo(m, ORO.gastoSemana)
  assert.deepEqual(pasos.map((p) => p.nombre),
    ['Gasto', 'Leads', 'Agendas', 'Llamadas', 'Asistieron', 'Cierres', 'Cash'])
  assert.equal(pasos[0].esGasto, true)
  assert.equal(pasos[0].esDinero, true)
  assert.equal(pasos[0].ancho, 0)   // sin barra: el paso 0 es un número solo
  assert.equal(pasos[0].valor, ORO.gastoSemana)
  // el resto queda igual: la escala sigue siendo Leads = 100
  assert.equal(pasos[1].nombre, 'Leads')
  assert.equal(pasos[1].ancho, 100)
})
