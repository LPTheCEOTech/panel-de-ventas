import assert from 'node:assert/strict'
import { test } from 'node:test'

import { todasLasFilas } from './tandas'

/** Una «base» de `n` filas que, como PostgREST, corta cada pedido en `tope`. */
function base(n: number, tope: number) {
  const filas = Array.from({ length: n }, (_, i) => i)
  const pedidos: [number, number][] = []
  const pedir = async (desde: number, hasta: number) => {
    pedidos.push([desde, hasta])
    return { data: filas.slice(desde, Math.min(hasta + 1, desde + tope)), error: null }
  }
  return { pedir, pedidos }
}

test('trae todo aunque pase el tope de una consulta', async () => {
  const { pedir, pedidos } = base(2350, 1000)
  const filas = await todasLasFilas('prueba', pedir)
  assert.equal(filas.length, 2350)
  assert.deepEqual(filas.slice(998, 1002), [998, 999, 1000, 1001]) // sin huecos ni repetidas
  assert.deepEqual(pedidos, [[0, 999], [1000, 1999], [2000, 2999]])
})

test('con menos de una tanda hace un solo pedido', async () => {
  const { pedir, pedidos } = base(747, 1000)
  assert.equal((await todasLasFilas('prueba', pedir)).length, 747)
  assert.equal(pedidos.length, 1)
})

test('justo una tanda llena pide una más, que vuelve vacía', async () => {
  const { pedir, pedidos } = base(1000, 1000)
  assert.equal((await todasLasFilas('prueba', pedir)).length, 1000)
  assert.equal(pedidos.length, 2)
})

test('un error de la base se lee con su lugar', async () => {
  await assert.rejects(
    todasLasFilas('leerLlamadas', async () => ({ data: null, error: { message: 'column x does not exist' } })),
    /\[datos\] leerLlamadas: column x does not exist/
  )
})
