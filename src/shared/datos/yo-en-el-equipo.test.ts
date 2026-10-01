import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Persona } from '@/shared/tipos'
import { decidirAccionYo, mismoNombre, type EstadoYo } from './yo-en-el-equipo'

const leandro: Persona = { id: 'p1', nombre: 'Leandro P.', rol: 'closer', activo: true, orden: 1 }
const nadie: EstadoYo = { propia: null, mismoNombre: null, mismoNombreTieneAcceso: false }

test('la primera vez con nombre crea la persona', () => {
  assert.deepEqual(decidirAccionYo(nadie, { rol: 'closer', nombre: ' Leandro P. ' }), { tipo: 'crear', nombre: 'Leandro P.', rol: 'closer' })
})

test('la primera vez sin nombre (o con una letra) pide el nombre', () => {
  for (const nombre of [undefined, '', ' L ']) {
    const a = decidirAccionYo(nadie, { rol: 'setter', nombre })
    assert.equal(a.tipo, 'error')
    assert.equal(a.tipo === 'error' && a.status, 400)
  }
})

test('«Sin rol de venta» sin ser parte del equipo no hace nada', () => {
  assert.deepEqual(decidirAccionYo(nadie, { rol: null }), { tipo: 'nada' })
})

test('ya en el equipo: cambia el rol, o se da de baja con null', () => {
  const yo: EstadoYo = { ...nadie, propia: leandro }
  assert.deepEqual(decidirAccionYo(yo, { rol: 'ambos' }), { tipo: 'cambiar', personaId: 'p1', rol: 'ambos' })
  assert.deepEqual(decidirAccionYo(yo, { rol: null }), { tipo: 'cambiar', personaId: 'p1', rol: null })
  // volver después de la baja reutiliza la misma persona: no pide el nombre de nuevo
  assert.deepEqual(decidirAccionYo(yo, { rol: 'setter', nombre: 'Otro' }), { tipo: 'cambiar', personaId: 'p1', rol: 'setter' })
})

test('el mismo nombre sin acceso propio: pregunta, y con el sí la liga', () => {
  const choca: EstadoYo = { ...nadie, mismoNombre: leandro }
  const pregunta = decidirAccionYo(choca, { rol: 'closer', nombre: 'leandro p.' })
  assert.equal(pregunta.tipo === 'error' && pregunta.confirmar, true)
  assert.equal(pregunta.tipo === 'error' && pregunta.status, 409)
  assert.deepEqual(decidirAccionYo(choca, { rol: 'closer', nombre: 'leandro p.', ligarExistente: true }), { tipo: 'ligar', personaId: 'p1', rol: 'closer' })
})

test('el mismo nombre con acceso de otra cuenta: nunca se la quita', () => {
  const ajena: EstadoYo = { ...nadie, mismoNombre: leandro, mismoNombreTieneAcceso: true }
  const a = decidirAccionYo(ajena, { rol: 'closer', nombre: 'Leandro P.', ligarExistente: true })
  assert.equal(a.tipo, 'error')
  assert.equal(a.tipo === 'error' && a.confirmar, undefined)
  assert.match(a.tipo === 'error' ? a.error : '', /ya tiene su propio acceso/)
})

test('los nombres se comparan como el índice único de la base', () => {
  assert.equal(mismoNombre(' Leandro P. ', 'leandro p.'), true)
  assert.equal(mismoNombre('Leandro', 'Leandro P.'), false)
})
