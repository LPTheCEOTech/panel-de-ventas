import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cookieSegura, destinoSeguro, esRutaPublica, MENSAJE_ERROR } from './sesion-reglas'

test('solo el login, su POST y la solicitud de acceso se ven sin sesión', () => {
  assert.equal(esRutaPublica('/login'), true)
  assert.equal(esRutaPublica('/api/auth/login'), true)
  assert.equal(esRutaPublica('/solicitar-acceso'), true)
  assert.equal(esRutaPublica('/api/solicitar-acceso'), true)
  for (const r of ['/panel', '/equipo', '/ajustes', '/reporte-setter', '/reporte-closer',
                   '/api/equipo', '/api/ajustes', '/api/reportes/setter', '/api/auth/logout', '/']) {
    assert.equal(esRutaPublica(r), false, `${r} NO puede ser pública`)
  }
})

test('🔴 el `next` del login no puede sacarte de la app', () => {
  // sin esto, un enlace que parece de la app termina en una copia que pide la
  // contraseña otra vez
  assert.equal(destinoSeguro('https://otro-sitio.com'), '/panel')
  assert.equal(destinoSeguro('//otro-sitio.com'), '/panel')
  assert.equal(destinoSeguro('javascript:alert(1)'), '/panel')
  assert.equal(destinoSeguro(undefined), '/panel')
  // y tampoco te deja en un bucle de vuelta al login
  assert.equal(destinoSeguro('/login'), '/panel')
  assert.equal(destinoSeguro('/login?x=1'), '/panel')
  // lo interno sí pasa, con su query
  assert.equal(destinoSeguro('/equipo'), '/equipo')
  assert.equal(destinoSeguro('/panel?p=mes&f=2026-07-23'), '/panel?p=mes&f=2026-07-23')
})

test('🔴 el mensaje de servidor no culpa a la contraseña', () => {
  assert.match(MENSAJE_ERROR.servidor, /servidor/i)
  assert.doesNotMatch(MENSAJE_ERROR.servidor, /incorrect/i)
  // y credenciales NO distingue "no existe el correo" de "contraseña mal"
  assert.match(MENSAJE_ERROR.credenciales, /Correo o contraseña/)
})

test('la cookie es httpOnly, Lax, y Secure solo en producción', () => {
  const prod = cookieSegura({}, true)
  assert.equal(prod.httpOnly, true)
  assert.equal(prod.sameSite, 'lax')
  assert.equal(prod.secure, true)
  // en local no hay https: forzar Secure dejaría la sesión sin guardar
  assert.equal(cookieSegura({}, false).secure, false)
})
