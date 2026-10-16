/** El aviso de lead repetido en Post Llamada. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Llamada } from '@/shared/tipos'
import { leadRepetido, normalizarLead } from './leads'

const llamada = (id: string, leadNombre: string, fecha = '2026-10-13', activa = true): Llamada => ({
  id, personaId: 'p-marco', fecha, asistio: true, reagendada: false, cerro: false,
  revenueCents: 0, cashCents: 0, nota: null, activa, leadNombre, origenLead: 'anuncios',
})

test('normalizar quita tildes, mayúsculas y espacios de más', () => {
  assert.equal(normalizarLead('  Sofía   RAMÍREZ '), 'sofia ramirez')
  assert.equal(normalizarLead('Núñez'), 'nunez')
})

test('encuentra el mismo lead aunque se escriba distinto', () => {
  const lista = [llamada('a', 'Bruno Álvarez'), llamada('b', 'Sofía Ramírez')]
  assert.equal(leadRepetido('sofia  ramirez', lista, '2026-10-13')?.id, 'b')
})

test('solo mira ese día y las llamadas activas', () => {
  const lista = [llamada('a', 'Sofía Ramírez', '2026-10-12'), llamada('b', 'Sofía Ramírez', '2026-10-13', false)]
  assert.equal(leadRepetido('Sofía Ramírez', lista, '2026-10-13'), null)
})

test('con menos de dos letras no avisa', () => {
  assert.equal(leadRepetido('s', [llamada('a', 'S')], '2026-10-13'), null)
  assert.equal(leadRepetido('   ', [llamada('a', '')], '2026-10-13'), null)
})

test('un nombre parecido no es el mismo', () => {
  assert.equal(leadRepetido('Sofía Ramírez Gil', [llamada('a', 'Sofía Ramírez')], '2026-10-13'), null)
})
