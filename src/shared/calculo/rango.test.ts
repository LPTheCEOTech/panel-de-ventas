/**
 * El filtro de fechas del Panel. Hoy, para todos los tests, es el jueves
 * 1 de octubre de 2026 —el día que los alumnos vieron el Panel en cero—, con
 * la semana empezando en lunes salvo que se diga otra cosa.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { barrasPorMes } from './metricas'
import {
  atajoDe, deQueDe, encabezadoSemana, esFecha, etiquetaDeRango, graficoDe, grillaDelMes, leerPedido,
  nombreDelMes, queryDe, rangoAnterior, resolverRango, sumarMeses, tituloDeRango, ventanaDeAtajo,
  type Rango,
} from './rango'

const HOY = '2026-10-01'
const rango = (sp: Record<string, string>, primera: string | null = null): Rango =>
  resolverRango(leerPedido(sp, 1), HOY, 1, primera)

test('sin parámetros abre en el mes en curso', () => {
  assert.deepEqual(rango({}), { desde: '2026-10-01', hasta: '2026-10-31', atajo: 'mes' })
})

test('cada atajo resuelve su ventana', () => {
  const v = (r: string) => { const x = rango({ r }); return [x.desde, x.hasta] }
  assert.deepEqual(v('hoy'), ['2026-10-01', '2026-10-01'])
  assert.deepEqual(v('semana'), ['2026-09-28', '2026-10-04'])
  assert.deepEqual(v('mes'), ['2026-10-01', '2026-10-31'])
  assert.deepEqual(v('mes-pasado'), ['2026-09-01', '2026-09-30'])
  assert.deepEqual(v('30-dias'), ['2026-09-02', '2026-10-01'])
  assert.deepEqual(v('año'), ['2026-01-01', '2026-12-31'])
})

test('«Todo» arranca en el primer dato; sin datos, hoy', () => {
  assert.deepEqual(rango({ r: 'todo' }, '2026-07-17'), { desde: '2026-07-17', hasta: HOY, atajo: 'todo' })
  assert.deepEqual(rango({ r: 'todo' }, null), { desde: HOY, hasta: HOY, atajo: 'todo' })
})

test('«Mes pasado» en enero es diciembre del año anterior', () => {
  assert.deepEqual(ventanaDeAtajo('mes-pasado', '2027-01-15', 1), { desde: '2026-12-01', hasta: '2026-12-31' })
})

test('la semana respeta el día de inicio del negocio', () => {
  assert.deepEqual(ventanaDeAtajo('semana', HOY, 0), { desde: '2026-09-27', hasta: '2026-10-03' })
})

test('un rango libre se lee, se ordena y reconoce su atajo', () => {
  assert.deepEqual(rango({ desde: '2026-09-10', hasta: '2026-08-15' }), { desde: '2026-08-15', hasta: '2026-09-10', atajo: null })
  assert.equal(rango({ desde: '2026-09-01', hasta: '2026-09-30' }).atajo, 'mes-pasado')
  assert.equal(atajoDe({ desde: '2026-08-01', hasta: '2026-08-31' }, HOY, 1), null)
})

test('los links viejos ?p&f siguen abriendo lo mismo', () => {
  assert.deepEqual(rango({ p: 'mes', f: '2026-08-15' }), { desde: '2026-08-01', hasta: '2026-08-31', atajo: null })
  assert.deepEqual(rango({ p: 'semana', f: '2026-07-23' }), { desde: '2026-07-20', hasta: '2026-07-26', atajo: null })
  assert.equal(rango({ p: 'dia' }).atajo, 'hoy')
  assert.equal(rango({ p: 'semana' }).atajo, 'semana')
})

test('lo malformado cae al mes en curso en vez de reventar', () => {
  assert.equal(rango({ r: 'cualquiera' }).atajo, 'mes')
  assert.equal(rango({ desde: '2026-02-30', hasta: '2026-03-05' }).atajo, 'mes')
  assert.equal(rango({ desde: 'ayer', hasta: 'hoy' }).atajo, 'mes')
  assert.equal(rango({ p: 'mes', f: '1900-01-01' }).atajo, 'mes')
  assert.equal(esFecha('2026-13-01'), false)
  assert.equal(esFecha('2028-02-29'), true)
})

test('la query de un atajo es el atajo; la de un rango libre, sus fechas', () => {
  assert.deepEqual(queryDe({ desde: 'x', hasta: 'y', atajo: 'mes-pasado' }), { r: 'mes-pasado' })
  assert.deepEqual(queryDe({ desde: '2026-08-15', hasta: '2026-09-10', atajo: null }), { desde: '2026-08-15', hasta: '2026-09-10' })
})

test('el período anterior: mes contra mes, año contra año, el resto mismo largo', () => {
  assert.deepEqual(rangoAnterior(rango({})), { desde: '2026-09-01', hasta: '2026-09-30' })
  assert.deepEqual(rangoAnterior(rango({ r: 'mes-pasado' })), { desde: '2026-08-01', hasta: '2026-08-31' })
  assert.deepEqual(rangoAnterior(rango({ r: 'año' })), { desde: '2025-01-01', hasta: '2025-12-31' })
  assert.deepEqual(rangoAnterior(rango({ r: 'semana' })), { desde: '2026-09-21', hasta: '2026-09-27' })
  assert.deepEqual(rangoAnterior(rango({ desde: '2026-08-15', hasta: '2026-09-10' })), { desde: '2026-07-19', hasta: '2026-08-14' })
  assert.equal(rangoAnterior(rango({ r: 'todo' }, '2026-07-17')), null)
})

test('el gráfico elige la unidad por el largo del rango', () => {
  const g = (sp: Record<string, string>) => graficoDe(rango(sp))
  assert.deepEqual(g({ r: 'hoy' }).ventana, { desde: '2026-09-25', hasta: HOY })
  assert.equal(g({ r: 'hoy' }).unidad, 'día')
  assert.equal(g({ r: 'semana' }).unidad, 'día')
  assert.equal(g({ r: 'mes' }).unidad, 'semana')
  assert.equal(g({ r: '30-dias' }).unidad, 'semana')
  assert.equal(g({ r: 'año' }).unidad, 'mes')
})

test('barras por mes: una por mes, con el año si cruza', () => {
  const b = barrasPorMes({ desde: '2026-07-17', hasta: '2026-10-01' }, [
    { personaId: 'a', fecha: '2026-08-03', cashCents: 100 } as never,
    { personaId: 'a', fecha: '2026-08-20', cashCents: 300 } as never,
    { personaId: 'a', fecha: '2026-09-01', cashCents: 200 } as never,
    { personaId: 'a', fecha: '2026-11-01', cashCents: 999 } as never, // afuera
  ])
  assert.deepEqual(b.map((x) => [x.etiqueta, x.cashCents]), [['Jul', 0], ['Ago', 400], ['Sep', 200], ['Oct', 0]])
  assert.equal(b[1].altura, 100)
  assert.deepEqual(barrasPorMes({ desde: '2025-12-01', hasta: '2026-01-31' }, []).map((x) => x.etiqueta), ['Dic 25', 'Ene 26'])
})

test('el subtítulo nombra el período con todas las letras', () => {
  const t = (sp: Record<string, string>, primera: string | null = null) => tituloDeRango(rango(sp, primera), 1)
  assert.equal(t({}), 'Octubre de 2026')
  assert.equal(t({ r: 'hoy' }), '1 de octubre de 2026')
  assert.equal(t({ r: 'semana' }), 'Semana 28 de septiembre – 4 de octubre de 2026')
  assert.equal(t({ p: 'semana', f: '2026-07-23' }), 'Semana 20–26 de julio de 2026')
  assert.equal(t({ r: 'año' }), 'Año 2026')
  assert.equal(t({ desde: '2026-08-15', hasta: '2026-09-10' }), '15 de agosto – 10 de septiembre de 2026')
  assert.equal(t({ desde: '2025-12-20', hasta: '2026-01-05' }), '20 de diciembre de 2025 – 5 de enero de 2026')
  assert.equal(t({ r: 'todo' }, '2026-07-17'), 'Desde el 17 de julio de 2026')
})

test('el botón dice el atajo o el rango en corto', () => {
  const e = (sp: Record<string, string>) => etiquetaDeRango(rango(sp), HOY)
  assert.equal(e({}), 'Este mes')
  assert.equal(e({ r: 'mes-pasado' }), 'Mes pasado')
  assert.equal(e({ desde: '2026-09-01', hasta: '2026-09-30' }), 'Mes pasado')
  assert.equal(e({ desde: '2026-08-01', hasta: '2026-08-31' }), 'Agosto 2026')
  assert.equal(e({ desde: '2026-08-15', hasta: '2026-09-10' }), '15 ago – 10 sep')
  assert.equal(e({ desde: '2026-08-03', hasta: '2026-08-18' }), '3–18 ago')
  assert.equal(e({ desde: '2026-08-03', hasta: '2026-08-03' }), '3 ago')
  assert.equal(e({ desde: '2025-08-03', hasta: '2025-08-18' }), '3–18 ago 2025')
  assert.equal(e({ desde: '2025-12-20', hasta: '2026-01-05' }), '20 dic 2025 – 5 ene 2026')
})

test('el embudo dice de qué período habla', () => {
  assert.equal(deQueDe(rango({ r: 'hoy' }), 1), 'del día')
  assert.equal(deQueDe(rango({ r: 'semana' }), 1), 'de la semana')
  assert.equal(deQueDe(rango({}), 1), 'del mes')
  assert.equal(deQueDe(rango({ r: 'año' }), 1), 'del año')
  assert.equal(deQueDe(rango({ r: '30-dias' }), 1), 'del período')
})

test('la grilla del calendario: octubre 2026 arranca jueves', () => {
  const g = grillaDelMes('2026-10', 1)
  assert.deepEqual(g[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
  assert.equal(g.flat().filter(Boolean).length, 31)
  assert.equal(g.every((s) => s.length === 7), true)
  assert.deepEqual(grillaDelMes('2026-10', 0)[0].slice(0, 5), [null, null, null, null, '2026-10-01'])
  assert.deepEqual(encabezadoSemana(1), ['L', 'M', 'X', 'J', 'V', 'S', 'D'])
  assert.deepEqual(encabezadoSemana(0), ['D', 'L', 'M', 'X', 'J', 'V', 'S'])
})

test('meses: sumar, restar y nombrar', () => {
  assert.equal(sumarMeses('2026-01', -1), '2025-12')
  assert.equal(sumarMeses('2026-12', 1), '2027-01')
  assert.equal(sumarMeses('2026-10', -14), '2025-08')
  assert.equal(nombreDelMes('2026-09'), 'Septiembre 2026')
})
