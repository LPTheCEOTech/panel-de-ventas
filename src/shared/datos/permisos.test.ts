import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'

import type { Nivel } from '@/shared/tipos'
import {
  esManager, marcaManager, nivelDe, nivelDelObjetivo, puede, puedeSerManager, puedeTocar, soloDelDueno,
  type Accion, type EntradaNivel,
} from './permisos'

const admin: EntradaNivel = { usuario: { rol: 'admin', personaId: null }, appMetadata: {} }
const miembro: EntradaNivel = { usuario: { rol: 'miembro', personaId: 'p1' }, appMetadata: { provider: 'email' } }
const marcado: EntradaNivel = { ...miembro, appMetadata: { provider: 'email', panel_rol: 'manager' } }

test('el nivel: las seis reglas, en orden', () => {
  // 1 · modo demo: dueño, haya lo que haya
  assert.equal(nivelDe(null, false), 'dueno')
  assert.equal(nivelDe(miembro, false), 'dueno')
  // 2 · sin cuenta vinculada
  assert.equal(nivelDe(null, true), 'sin-acceso')
  assert.equal(nivelDe({ usuario: null, appMetadata: {} }, true), 'sin-acceso')
  // 3 · el admin es dueño, con o sin persona, con o sin marca
  assert.equal(nivelDe(admin, true), 'dueno')
  assert.equal(nivelDe({ usuario: { rol: 'admin', personaId: 'p9' }, appMetadata: { panel_rol: 'manager' } }, true), 'dueno')
  // 4 · miembro sin persona
  assert.equal(nivelDe({ usuario: { rol: 'miembro', personaId: null }, appMetadata: { panel_rol: 'manager' } }, true), 'sin-acceso')
  // 5 · miembro con la marca
  assert.equal(nivelDe(marcado, true), 'manager')
  // 6 · el resto
  assert.equal(nivelDe(miembro, true), 'vendedor')
})

test('la marca: solo el string exacto cuenta; lo demás cae en vendedor', () => {
  for (const raro of [undefined, null, 'manager', {}, { panel_rol: null }, { panel_rol: 'Manager' },
    { panel_rol: ' manager' }, { panel_rol: true }, { panel_rol: ['manager'] }, { rol: 'manager' }]) {
    assert.equal(esManager(raro), false, JSON.stringify(raro))
    assert.equal(nivelDe({ ...miembro, appMetadata: raro }, true), 'vendedor')
  }
  assert.equal(esManager({ panel_rol: 'manager' }), true)
  assert.deepEqual(marcaManager(true), { panel_rol: 'manager' })
  assert.deepEqual(marcaManager(false), { panel_rol: null })
  assert.equal(esManager(marcaManager(true)), true)
  assert.equal(esManager(marcaManager(false)), false)
})

test('la matriz completa: nivel × acción', () => {
  const esperado: Record<Accion, Nivel[]> = {
    'ver-negocio': ['dueno', 'manager'],
    'cargar-por-otros': ['dueno', 'manager'],
    'cargar-gasto': ['dueno', 'manager'],
    'gestionar-equipo': ['dueno', 'manager'],
    'dar-de-baja': ['dueno'],
    'marcar-manager': ['dueno'],
    'sumarse-al-equipo': ['dueno'],
    'ajustes': ['dueno'],
    'actualizar-base': ['dueno'],
  }
  const niveles: Nivel[] = ['dueno', 'manager', 'vendedor', 'sin-acceso']
  for (const [accion, quienes] of Object.entries(esperado) as [Accion, Nivel[]][]) {
    for (const n of niveles) assert.equal(puede(n, accion), quienes.includes(n), `${n} · ${accion}`)
    assert.equal(soloDelDueno(accion), !quienes.includes('manager'))
  }
})

test('a quién puede tocar cada uno en Equipo', () => {
  const dueno = { rol: 'admin' as const, manager: false, esYo: false }
  const otroManager = { rol: 'miembro' as const, manager: true, esYo: false }
  const vendedor = { rol: 'miembro' as const, manager: false, esYo: false }
  const yoManager = { ...otroManager, esYo: true }
  const sinAcceso = null

  for (const o of [dueno, otroManager, vendedor, yoManager, sinAcceso]) assert.equal(puedeTocar('dueno', o), true)

  assert.equal(puedeTocar('manager', vendedor), true)
  assert.equal(puedeTocar('manager', sinAcceso), true)
  assert.equal(puedeTocar('manager', dueno), false, 'nunca al dueño: le cambiaría la contraseña')
  assert.equal(puedeTocar('manager', otroManager), false)
  assert.equal(puedeTocar('manager', yoManager), false)

  for (const n of ['vendedor', 'sin-acceso'] as const) {
    for (const o of [dueno, otroManager, vendedor, sinAcceso]) assert.equal(puedeTocar(n, o), false)
  }

  assert.equal(nivelDelObjetivo(dueno), 'dueno')
  assert.equal(nivelDelObjetivo({ ...dueno, manager: true }), 'dueno')
  assert.equal(nivelDelObjetivo(otroManager), 'manager')
  assert.equal(nivelDelObjetivo(vendedor), 'vendedor')
  assert.equal(nivelDelObjetivo(sinAcceso), null)

  assert.equal(puedeSerManager(vendedor), true)
  assert.equal(puedeSerManager(otroManager), true)
  assert.equal(puedeSerManager(dueno), false)
  assert.equal(puedeSerManager(sinAcceso), false)
})

/** 🔴 El blindaje: si alguien vuelve a decidir permisos por su cuenta, el gate
 *  no pasa. Mismo espíritu que `sin-cliente`. */
test('nadie decide permisos fuera de permisos.ts', () => {
  const raiz = join(process.cwd(), 'src')
  const prohibido = /usuario\.rol\s*[!=]==|\brol\s*[!=]==\s*'(admin|miembro)'|soloAdmin\b/
  const sueltos: string[] = []
  for (const archivo of readdirSync(raiz, { recursive: true }) as string[]) {
    if (!/\.tsx?$/.test(archivo) || archivo.endsWith('.test.ts') || archivo.endsWith('permisos.ts')) continue
    readFileSync(join(raiz, archivo), 'utf8').split('\n').forEach((linea, i) => {
      if (prohibido.test(linea)) sueltos.push(`${relative(process.cwd(), join(raiz, archivo))}:${i + 1}  ${linea.trim()}`)
    })
  }
  assert.deepEqual(sueltos, [], 'Pregúntale a `puede()` / `puedeTocar()` en vez de mirar el rol:\n' + sueltos.join('\n'))
})
