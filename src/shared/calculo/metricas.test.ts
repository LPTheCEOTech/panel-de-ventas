/**
 * El gate del kernel. Compara contra los números de oro del mockup — que son
 * EXTERNOS y fijos — y cuenta las filas. No compara la semilla consigo misma.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ORO, PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO, SEMANA_ORO,
} from '../datos/semilla'
import { dineroCorto, dinero, porcentaje, porcentajeEntero, puntos, EL_GUION, iniciales, tituloDeVentana } from '../formato'
import {
  barrasPorDia, barrasPorSemana, delta, embudo, metricas, rankingClosers, rankingSetters, tasa,
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
