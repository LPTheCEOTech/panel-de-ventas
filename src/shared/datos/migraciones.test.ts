import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

/** El SQL sin comentarios y con los espacios aplastados: para comparar contenido, no formato. */
function sinFormato(sql: string): string {
  return sql.split('\n').map((l) => l.replace(/--.*$/, '')).join(' ').replace(/\s+/g, ' ').trim()
}
const leer = (...partes: string[]) => readFileSync(join(process.cwd(), ...partes), 'utf8')

test('🔴 cada migración vive igual en su archivo, en el código y en la instalación', () => {
  // si una instalación nueva no la trae (o no la marca), el alumno recién
  // instalado ve una barra de actualización el primer día; si el archivo y el
  // código dicen cosas distintas, la base de cada uno depende de cómo se instaló
  const todoEnUno = sinFormato(leer('docs', 'todo-en-uno.sql'))
  for (const m of MIGRACIONES) {
    const archivo = join('supabase', 'migraciones', `${m.id}.sql`)
    assert.ok(existsSync(join(process.cwd(), archivo)), `falta ${archivo}`)
    assert.equal(sinFormato(leer(archivo)), sinFormato(m.sql), `${archivo} y MIGRACIONES no dicen lo mismo`)
    assert.ok(todoEnUno.includes(sinFormato(m.sql)), `${m.id} no está en docs/todo-en-uno.sql`)
    assert.ok(todoEnUno.includes(`('${m.id}')`), `${m.id} no está marcada como aplicada en docs/todo-en-uno.sql`)
  }
})

test('🔴 el SQL de soporte para bases viejas solo instala el actualizador', () => {
  const sql = leer('docs', 'actualizador.sql')
  const cuerpo = sinFormato(sql)
  // nada de admin ni de placeholders: el alumno lo corre tal cual
  assert.ok(!/TU_CORREO_AQUI|TU_CONTRASENA_AQUI|auth\.users|insert into usuarios/i.test(cuerpo))
  // y la función es la MISMA que deja la instalación
  const funcion = cuerpo.slice(cuerpo.indexOf('create or replace function aplicar_migracion'), cuerpo.indexOf('select (select count'))
  assert.ok(funcion.length > 100, 'no encontré la función en docs/actualizador.sql')
  assert.ok(sinFormato(leer('docs', 'todo-en-uno.sql')).includes(funcion.trim()), 'la función de docs/actualizador.sql no es la de la instalación')
})
