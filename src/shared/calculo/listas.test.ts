/** El orden y el tope de las listas de las pantallas de carga. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { masNuevasPrimero, pagina, TOPE_LISTA } from './listas'

const R = { desde: '2026-10-01', hasta: '2026-10-15', atajo: null }

test('lo más nuevo arriba, y dentro de un día el orden de carga', () => {
  const filas = [
    { fecha: '2026-10-13', id: 'a' }, { fecha: '2026-10-15', id: 'b' },
    { fecha: '2026-10-13', id: 'c' }, { fecha: '2026-10-15', id: 'd' },
  ]
  assert.deepEqual(masNuevasPrimero(filas).map((f) => f.id), ['b', 'd', 'a', 'c'])
})

test('la página corta en el tope y dice cuántas había', () => {
  const muchas = Array.from({ length: TOPE_LISTA + 20 }, (_, i) => ({ fecha: '2026-10-01', id: String(i) }))
  const p = pagina(R, muchas)
  assert.equal(p.filas.length, TOPE_LISTA)
  assert.equal(p.total, TOPE_LISTA + 20)
  assert.equal(p.filas[0].id, '0')
})
