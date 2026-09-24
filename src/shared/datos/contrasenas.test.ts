import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LARGO_MINIMO, mensajeParaElEquipo, revisarContrasena, sugerirContrasena } from './contrasenas'

test('la contraseña se valida antes de llegar a Supabase', () => {
  assert.equal(revisarContrasena('unaBuena123'), null)
  assert.equal(revisarContrasena('corta'), 'corta')
  assert.equal(revisarContrasena('a'.repeat(LARGO_MINIMO - 1)), 'corta')
  assert.equal(revisarContrasena('a'.repeat(LARGO_MINIMO)), null)
})

test("🔴 sin comillas simples: rompen el SQL de instalación", () => {
  // el SQL del instalador mete la contraseña entre comillas simples; una
  // comilla adentro corta la sentencia y el alumno ve un error rojo que no
  // puede interpretar
  assert.equal(revisarContrasena("tiene'comilla"), 'comilla')
})

test('🔴 sin espacios al borde: se copian sin verse y el login falla', () => {
  // al pasarla por mensaje es facilísimo arrastrar un espacio; después el
  // login dice «contraseña incorrecta» y nadie entiende por qué
  assert.equal(revisarContrasena(' arranca-con-espacio'), 'espacios')
  assert.equal(revisarContrasena('termina-con-espacio '), 'espacios')
})

test('la sugerida sirve y se puede dictar por teléfono', () => {
  for (let i = 0; i < 200; i++) {
    const c = sugerirContrasena()
    assert.equal(revisarContrasena(c), null, `la sugerida no pasa su propia validación: ${c}`)
    // nada que se confunda al dictar: ni ele/uno/i, ni o/cero
    assert.ok(!/[lI1O0]/.test(c), `tiene caracteres que se confunden: ${c}`)
    assert.ok(/^[A-Za-z]+\d\d$/.test(c), `formato inesperado: ${c}`)
  }
})

test('la sugerida cambia entre llamadas', () => {
  const muchas = new Set(Array.from({ length: 50 }, () => sugerirContrasena()))
  assert.ok(muchas.size > 40, 'demasiadas repetidas')
})

test('el mensaje para el equipo trae todo lo que hace falta para entrar', () => {
  const m = mensajeParaElEquipo('Camila', 'https://mi-panel.vercel.app', 'cami@correo.com', 'Karomi45')
  assert.ok(m.includes('Camila'))
  assert.ok(m.includes('https://mi-panel.vercel.app'))
  assert.ok(m.includes('cami@correo.com'))
  assert.ok(m.includes('Karomi45'))
})
