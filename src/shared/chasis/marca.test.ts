import assert from 'node:assert/strict'
import { test } from 'node:test'

import { estiloDeMarca, hexAHsl } from './marca'

test('hexAHsl saca tono, saturación y luz', () => {
  const verde = hexAHsl('#00D97E')
  assert.ok(verde)
  assert.equal(Math.round(verde.h), 155)
  assert.equal(Math.round(verde.s), 100)
  assert.equal(Math.round(verde.l), 43)

  const blanco = hexAHsl('#FFFFFF')
  assert.deepEqual(blanco, { h: 0, s: 0, l: 100 })
})

test('un hex a medio escribir no rompe nada', () => {
  for (const malo of ['', '#', '#00D9', '00D97E', '#GGGGGG', '#00D97E7']) {
    assert.equal(hexAHsl(malo), null, malo)
    assert.equal(estiloDeMarca(malo), null, malo)
  }
})

test('la rampa conserva el tono de la marca en los siete peldaños', () => {
  const css = estiloDeMarca('#7C3AED') // violeta, tono 262
  assert.ok(css)
  const tonos = [...css.matchAll(/hsl\((\d+(?:\.\d+)?) /g)].map((m) => Number(m[1]))
  assert.ok(tonos.length >= 21, 'los tres bloques traen siete peldaños cada uno')
  // el papel, los bordes y la tinta llevan el mismo tono que la marca: si no,
  // un panel violeta queda sobre un fondo verde menta
  assert.ok(css.includes('--bg:hsl(262'), 'los neutros también giran')
  for (const t of tonos) assert.equal(Math.round(t), 262)
})

test('la rampa clara sube de oscuro a claro y la oscura al revés', () => {
  const css = estiloDeMarca('#00D97E')
  assert.ok(css)
  const claro = css.slice(css.indexOf(':root{'), css.indexOf(':root[data-theme'))
  const luces = [...claro.matchAll(/--m\d:hsl\([\d.]+ [\d.]+% ([\d.]+)%\)/g)].map((m) => Number(m[1]))
  // m1 es el tinte más claro y m7 el más oscuro: la escala va bajando
  assert.deepEqual(luces, [...luces].sort((a, b) => b - a))
})

test('el texto sobre la marca se da vuelta según el tema', () => {
  const css = estiloDeMarca('#00D97E')
  assert.ok(css)
  // en claro el m6 es oscuro → texto blanco; en oscuro el m6 es brillante → texto casi negro
  const sobre = [...css.matchAll(/--sobre-marca:([^;}]+)/g)].map((m) => m[1])
  assert.equal(sobre.length, 3)
  assert.equal(sobre[0], '#FFFFFF')
  assert.ok(sobre[1].startsWith('hsl('))
})

test('el blanco de la hoja no se tiñe en tema claro', () => {
  const css = estiloDeMarca('#7C3AED')
  assert.ok(css)
  const claro = css.slice(0, css.indexOf(':root[data-theme'))
  assert.ok(!claro.includes('--card:'), 'en claro la tarjeta sigue siendo el blanco del CSS')
})

test('una marca apagada no deja la rampa sin color, pero un gris sí es gris', () => {
  // solo los peldaños --m1…--m7: `--sobre-marca` es texto, no un tinte
  const saturaciones = (css: string) =>
    [...css.matchAll(/--m\d:hsl\([\d.]+ ([\d.]+)%/g)].map((m) => Number(m[1]))

  const apagada = estiloDeMarca('#6B7C74') // saturación 7%
  assert.ok(apagada)
  const sats = saturaciones(apagada)
  // siete peldaños por bloque, y la rampa oscura se escribe dos veces
  assert.equal(sats.length, 21)
  for (const s of sats) assert.ok(s >= 8, `un piso de saturación evita tintes invisibles: ${s}`)

  const gris = estiloDeMarca('#808080')
  assert.ok(gris)
  for (const s of saturaciones(gris)) assert.equal(s, 0, 'un gris elegido a propósito se respeta')
})

test('los tres selectores del CSS portado están, en el mismo orden', () => {
  const css = estiloDeMarca('#00D97E')
  assert.ok(css)
  const i1 = css.indexOf(':root{')
  const i2 = css.indexOf(':root[data-theme="dark"]{')
  const i3 = css.indexOf('@media (prefers-color-scheme:dark)')
  assert.ok(i1 >= 0 && i2 > i1 && i3 > i2)
})
