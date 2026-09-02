/**
 * El banco de prueba, contra la base de verdad.
 *
 *   npm run semilla -- cargar    → planta las 42 filas del mockup
 *   npm run semilla -- limpiar   → borra EXACTAMENTE lo que plantó
 *
 * 🔴 Todo lo que planta lleva `es_demo = true`, y `limpiar` borra solo eso.
 * Un seeder que estampa sobre filas reales ya nos costó caro: el `--limpiar`
 * no tocaba la fila, pero sí sus campos.
 *
 * 🔴 El instalador NO corre esto.
 */
import { PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO, ORO } from '../src/shared/datos/semilla.ts'
import { conectar, morir } from './comun.mjs'

const comando = process.argv[2]
const sb = await conectar()

if (comando === 'limpiar') {
  // orden: primero los reportes, que referencian a las personas
  for (const t of ['reportes_setter', 'reportes_closer']) {
    const { error, count } = await sb.from(t).delete({ count: 'exact' }).eq('es_demo', true)
    if (error) morir(`No se pudo limpiar ${t}: ${error.message}`)
    console.log(`✅ ${t}: ${count ?? 0} filas de demo borradas`)
  }
  const { error, count } = await sb.from('personas').delete({ count: 'exact' }).eq('es_demo', true)
  if (error) morir(`No se pudo limpiar personas: ${error.message}`)
  console.log(`✅ personas: ${count ?? 0} de demo borradas`)
  console.log('\nNada que no fuera de demo se tocó.\n')
  process.exit(0)
}

if (comando !== 'cargar') {
  console.log('\nUso: npm run semilla -- cargar | limpiar\n')
  process.exit(1)
}

// Las personas primero: los reportes cuelgan de ellas.
//
// 🔴 Acá NO se puede usar `upsert(..., { onConflict: 'nombre' })`. El índice
// único del esquema es sobre `lower(trim(nombre))` — una EXPRESIÓN — y
// `ON CONFLICT` solo apunta a columnas o a restricciones con nombre. Postgres
// responde "there is no unique or exclusion constraint matching the ON CONFLICT
// specification", que no dice nada de expresiones.
//
// Se hace a mano: leer quién está, insertar solo lo que falta. Y así también es
// idempotente si la semilla ya se cargó antes.
const { data: existentes, error: errLeer } = await sb.from('personas').select('id, nombre')
if (errLeer) morir(`No se pudieron leer las personas: ${errLeer.message}`)

const clave = (n) => n.trim().toLowerCase()
const mapa = new Map(existentes.map((p) => [clave(p.nombre), p.id]))

const faltan = PERSONAS_DEMO.filter((p) => !mapa.has(clave(p.nombre)))
if (faltan.length > 0) {
  const { data: nuevas, error } = await sb
    .from('personas')
    .insert(faltan.map((p) => ({ nombre: p.nombre, rol: p.rol, orden: p.orden, es_demo: true })))
    .select('id, nombre')
  if (error) morir(`No se pudo plantar las personas: ${error.message}`)
  for (const p of nuevas) mapa.set(clave(p.nombre), p.id)
}
console.log(`✅ personas: ${faltan.length} nuevas, ${PERSONAS_DEMO.length - faltan.length} ya estaban`)

const idDe = (demoId) => {
  const p = PERSONAS_DEMO.find((x) => x.id === demoId)
  const id = p && mapa.get(clave(p.nombre))
  if (!id) morir(`No encuentro en la base a ${p?.nombre ?? demoId}`)
  return id
}

const { error: errS } = await sb.from('reportes_setter').upsert(
  REPORTES_SETTER_DEMO.map((r) => ({
    fecha: r.fecha, persona_id: idDe(r.personaId),
    conversaciones: r.conversaciones, agendas: r.agendas, es_demo: true,
  })),
  { onConflict: 'fecha,persona_id' }
)
if (errS) morir(`reportes_setter: ${errS.message}`)
console.log(`✅ reportes_setter: ${REPORTES_SETTER_DEMO.length}`)

const { error: errC } = await sb.from('reportes_closer').upsert(
  REPORTES_CLOSER_DEMO.map((r) => ({
    fecha: r.fecha, persona_id: idDe(r.personaId),
    llamadas: r.llamadas, asistieron: r.asistieron, reagendadas: r.reagendadas,
    cierres: r.cierres, revenue_cents: r.revenueCents, cash_cents: r.cashCents, es_demo: true,
  })),
  { onConflict: 'fecha,persona_id' }
)
if (errC) morir(`reportes_closer: ${errC.message}`)
console.log(`✅ reportes_closer: ${REPORTES_CLOSER_DEMO.length}`)

console.log(`\n${ORO.filas} filas plantadas. Ahora: npm run verificar\n`)
