import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hexToHsv, hexValido, hsvToHex } from './color-utils'

test('hexValido acepta lo correcto y rechaza lo demás', () => {
  assert.equal(hexValido('#000000'), true)
  assert.equal(hexValido('#FFFFFF'), true)
  assert.equal(hexValido('#00D97E'), true)
  assert.equal(hexValido('#00d97e'), true)
  assert.equal(hexValido('#00D'), false)          // muy corto
  assert.equal(hexValido('00D97E'), false)        // sin #
  assert.equal(hexValido('#GGGGGG'), false)       // caracteres no-hex
  assert.equal(hexValido(''), false)
  assert.equal(hexValido('#00D97E0'), false)      // muy largo
})

test('hsvToHex casos redondos', () => {
  assert.equal(hsvToHex(0, 0, 1), '#FFFFFF')     // blanco
  assert.equal(hsvToHex(0, 0, 0), '#000000')     // negro
  assert.equal(hsvToHex(0, 1, 1), '#FF0000')     // rojo puro
  assert.equal(hsvToHex(120, 1, 1), '#00FF00')   // verde puro
  assert.equal(hsvToHex(240, 1, 1), '#0000FF')   // azul puro
})

test('hexToHsv inverso: aplicar hexToHsv → hsvToHex es idempotente ± redondeo', () => {
  for (const hex of ['#00D97E', '#3AB0FF', '#F54927', '#8B5CF6', '#FFFFFF', '#000000', '#123456']) {
    const hsv = hexToHsv(hex)
    const back = hsvToHex(hsv.h, hsv.s, hsv.v)
    // permitimos ± 1 unidad por canal por el round-trip de float
    for (let i = 1; i < 7; i += 2) {
      const a = parseInt(hex.slice(i, i + 2), 16)
      const b = parseInt(back.slice(i, i + 2), 16)
      assert.ok(Math.abs(a - b) <= 1, `${hex} → ${back}: canal en pos ${i} difiere ${Math.abs(a - b)}`)
    }
  }
})

test('🔴 hex inválido devuelve HSV inerte, sin explotar', () => {
  const h = hexToHsv('cualquier cosa')
  assert.deepEqual(h, { h: 0, s: 0, v: 0 })
})
