/**
 * El Día por día del Panel. La regla que manda: la suma de las filas da los
 * totales de arriba. Si no cuadra, el manager deja de creerle a las dos cosas.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LLAMADAS_DEMO, REPORTES_SETTER_DEMO, SEMANA_ORO } from '../datos/semilla'
import { diaPorDia, diaVacio } from './dia-por-dia'
import { agregarLlamadas, totales } from './metricas'

const SEMANA = { desde: SEMANA_ORO[0], hasta: SEMANA_ORO[6] }
const CLOSERS = agregarLlamadas(LLAMADAS_DEMO)

test('la suma de las filas da los totales del período', () => {
  const filas = diaPorDia(SEMANA, '2026-10-01', REPORTES_SETTER_DEMO, CLOSERS)
  const t = totales(REPORTES_SETTER_DEMO, CLOSERS)
  const suma = (k: 'agendas' | 'llamadas' | 'asistieron' | 'cierres' | 'cashCents') =>
    filas.reduce((s, f) => s + f[k], 0)
  assert.equal(filas.length, 7)
  assert.equal(suma('agendas'), t.agendas)
  assert.equal(suma('llamadas'), t.llamadas)
  assert.equal(suma('asistieron'), t.asistieron)
  assert.equal(suma('cierres'), t.cierres)
  assert.equal(suma('cashCents'), t.cashCents)
})

test('de la más reciente a la más vieja', () => {
  const filas = diaPorDia(SEMANA, '2026-10-01', REPORTES_SETTER_DEMO, CLOSERS)
  assert.deepEqual(filas.map((f) => f.fecha), [...SEMANA_ORO].reverse())
})

test('corta en hoy: los días que no pasaron no salen', () => {
  const filas = diaPorDia({ desde: '2026-07-01', hasta: '2026-07-31' }, '2026-07-23', REPORTES_SETTER_DEMO, CLOSERS)
  assert.equal(filas[0].fecha, '2026-07-23')
  assert.equal(filas.at(-1)?.fecha, '2026-07-01')
  assert.equal(filas.length, 23)
})

test('los días sin nada salen igual, en cero', () => {
  const filas = diaPorDia({ desde: '2026-07-18', hasta: '2026-07-20' }, '2026-10-01', REPORTES_SETTER_DEMO, CLOSERS)
  assert.deepEqual(filas.map((f) => f.fecha), ['2026-07-20', '2026-07-19', '2026-07-18'])
  assert.equal(diaVacio(filas[1]), true)
  assert.equal(diaVacio(filas[0]), false)
})

test('un período que todavía no empezó no tiene filas', () => {
  assert.deepEqual(diaPorDia({ desde: '2026-11-01', hasta: '2026-11-30' }, '2026-10-15', [], []), [])
})

test('lo que cae fuera del período no se suma', () => {
  const filas = diaPorDia({ desde: '2026-07-21', hasta: '2026-07-21' }, '2026-10-01', REPORTES_SETTER_DEMO, CLOSERS)
  const delDia = CLOSERS.filter((r) => r.fecha === '2026-07-21')
  assert.equal(filas.length, 1)
  assert.equal(filas[0].llamadas, delDia.reduce((s, r) => s + r.llamadas, 0))
})
