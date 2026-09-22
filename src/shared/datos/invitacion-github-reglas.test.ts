import assert from 'node:assert/strict'
import { test } from 'node:test'

import { correoValido, esEstadoInvitacion, interpretarRespuestaGitHub, MENSAJE_INVITACION } from './invitacion-github-reglas'

test('201 de GitHub es «invitado»', () => {
  assert.deepEqual(interpretarRespuestaGitHub(201, '{"id":1}'), { estado: 'invitado' })
})

test('🔴 GitHub devuelve 422 para dos cosas distintas y hay que distinguirlas', () => {
  // si «ya es miembro» se mostrara como error, el alumno que ya aceptó
  // creería que algo falló y volvería a pedir acceso en bucle
  assert.equal(interpretarRespuestaGitHub(422, '{"message":"Validation Failed","errors":[{"message":"Invitee is already a part of this org"}]}').estado, 'ya-miembro')
  assert.equal(interpretarRespuestaGitHub(422, '{"message":"User is already a member of this organization"}').estado, 'ya-miembro')
  assert.equal(interpretarRespuestaGitHub(422, '{"message":"Invitee is already invited"}').estado, 'ya-invitado')
  assert.equal(interpretarRespuestaGitHub(422, '{"message":"there is a pending invitation"}').estado, 'ya-invitado')
})

test('cualquier otra cosa es error con el detalle para el log', () => {
  const r = interpretarRespuestaGitHub(401, '{"message":"Bad credentials"}')
  assert.equal(r.estado, 'error')
  assert.ok(r.estado === 'error' && r.detalle.includes('401'))
})

test('el correo se valida antes de gastar una llamada a GitHub', () => {
  assert.equal(correoValido('ana@correo.com'), true)
  assert.equal(correoValido('sin-arroba'), false)
  assert.equal(correoValido('con espacio@x.com'), false)
  assert.equal(correoValido(''), false)
})

test('todo estado tiene su mensaje y solo esos se aceptan por URL', () => {
  for (const e of ['invitado', 'ya-miembro', 'ya-invitado', 'no-configurado', 'error'] as const) {
    assert.ok(MENSAJE_INVITACION[e].titulo.length > 0)
    assert.equal(esEstadoInvitacion(e), true)
  }
  assert.equal(esEstadoInvitacion('cualquiera'), false)
  assert.equal(esEstadoInvitacion(undefined), false)
})
