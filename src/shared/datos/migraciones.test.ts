import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calcularPendientes, idsDeMigraciones, idsDuplicados, MIGRACIONES } from './migraciones'

test('🔴 dos migraciones con el mismo id: la segunda no se aplicaría nunca', () => {
  // la base guarda el id como clave primaria, así que un duplicado se marca
  // aplicado con la primera y la segunda queda perdida en silencio
  assert.deepEqual(idsDuplicados(), [])
})

test('🔴 una migración no puede traer datos de un alumno', () => {
  // el mismo SQL corre en el panel de todos: un correo o una contraseña ahí
  // dentro se aplicaría en la base de otro
  for (const m of MIGRACIONES) {
    assert.ok(!/TU_CORREO_AQUI|TU_CONTRASENA_AQUI/.test(m.sql), `${m.id} tiene un placeholder de instalación`)
    assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(m.sql), `${m.id} parece tener un correo adentro`)
  }
})

test('🔴 una migración tiene que poder correrse dos veces', () => {
  // si el alumno aprieta el botón y algo corta a mitad, va a volver a apretar
  for (const m of MIGRACIONES) {
    const crea = /create\s+(table|index|type|function)/i.test(m.sql)
    if (crea) {
      assert.ok(
        /if not exists|or replace|do \$/i.test(m.sql),
        `${m.id} crea algo sin protección de idempotencia`
      )
    }
  }
})

test('cada migración tiene un título legible para el alumno', () => {
  for (const m of MIGRACIONES) {
    assert.ok(m.titulo.length > 0 && m.titulo.length < 120, `${m.id} necesita un título corto`)
    assert.ok(!/migraci[oó]n|sql|alter table/i.test(m.titulo), `${m.id}: el título tiene jerga`)
  }
})

test('pendientes = las del código que no están en la base', () => {
  const falsas = [
    { id: 'a', titulo: 'Una', sql: 'select 1' },
    { id: 'b', titulo: 'Dos', sql: 'select 1' },
  ]
  const calc = (aplicadas: string[]) => falsas.filter((m) => !new Set(aplicadas).has(m.id))
  assert.equal(calc([]).length, 2)
  assert.equal(calc(['a']).length, 1)
  assert.equal(calc(['a', 'b']).length, 0)
  // y sobre las de verdad: con todo aplicado no queda nada pendiente
  assert.deepEqual(calcularPendientes(idsDeMigraciones()), [])
})
