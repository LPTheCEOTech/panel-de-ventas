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
import { GASTOS_DEMO, LLAMADAS_DEMO, PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO, ORO } from '../src/shared/datos/semilla.ts'
import { conectar, morir } from './comun.mjs'

const comando = process.argv[2]
const sb = await conectar()

if (comando === 'limpiar') {
  // orden: primero los reportes/llamadas, que referencian a las personas.
  // Fase D · `llamadas` también se limpia (best-effort si la tabla todavía
  // no existe).
  for (const t of ['reportes_setter', 'reportes_closer', 'llamadas']) {
    const { error, count } = await sb.from(t).delete({ count: 'exact' }).eq('es_demo', true)
    if (error) {
      if (/does not exist/i.test(error.message)) { console.log(`✅ ${t}: tabla no existe, saltado`); continue }
      morir(`No se pudo limpiar ${t}: ${error.message}`)
    }
    console.log(`✅ ${t}: ${count ?? 0} filas de demo borradas`)
  }
  // Fase A · los gastos no dependen de personas: se pueden borrar acá o al
  // final, da igual. Se ignora "relation does not exist" para que `limpiar`
  // funcione contra bases que todavía no aplicaron la migración 003.
  const g = await sb.from('gastos').delete({ count: 'exact' }).eq('es_demo', true)
  if (g.error && !/does not exist/i.test(g.error.message)) morir(`No se pudo limpiar gastos: ${g.error.message}`)
  console.log(`✅ gastos: ${g.count ?? 0} de demo borrados`)
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

// 🔴 Fase D · `reportes_closer` queda como LEGACY (agregado diario). El
// modelo activo es `llamadas` (una fila por llamada). Se cargan las dos por
// ahora: el panel y `verificar.mjs` solo miran `llamadas`, pero mantener la
// tabla vieja poblada nos deja rebobinar si Jack lo pide antes de la 007.
const { error: errC } = await sb.from('reportes_closer').upsert(
  REPORTES_CLOSER_DEMO.map((r) => ({
    fecha: r.fecha, persona_id: idDe(r.personaId),
    llamadas: r.llamadas, asistieron: r.asistieron, reagendadas: r.reagendadas,
    cierres: r.cierres, revenue_cents: r.revenueCents, cash_cents: r.cashCents, es_demo: true,
  })),
  { onConflict: 'fecha,persona_id' }
)
if (errC) morir(`reportes_closer: ${errC.message}`)
console.log(`✅ reportes_closer: ${REPORTES_CLOSER_DEMO.length} (legacy)`)

// 🔴 Fase D · las 96 llamadas granulares. El id de la tabla es `uuid` con
// default `gen_random_uuid()`, así que no le mandamos el nuestro. Para que
// `cargar` sea idempotente, primero borramos las demo existentes y luego
// insertamos: correrlo dos veces deja siempre 96 filas de demo, ni una más.
const bResp = await sb.from('llamadas').delete().eq('es_demo', true)
if (bResp.error && !/does not exist/i.test(bResp.error.message)) {
  morir(`llamadas (limpieza previa): ${bResp.error.message}`)
}
const lResp = await sb.from('llamadas').insert(
  LLAMADAS_DEMO.map((l) => ({
    persona_id: idDe(l.personaId), fecha: l.fecha,
    asistio: l.asistio, reagendada: l.reagendada, cerro: l.cerro,
    revenue_cents: l.revenueCents, cash_cents: l.cashCents,
    nota: l.nota ?? null, activa: l.activa, es_demo: true,
  }))
)
if (lResp.error) {
  if (/does not exist/i.test(lResp.error.message)) {
    console.log(`⚠️  llamadas: tabla no encontrada. Correr migración 006_llamadas.sql. Saltado.`)
  } else {
    morir(`llamadas: ${lResp.error.message}`)
  }
} else {
  console.log(`✅ llamadas: ${LLAMADAS_DEMO.length}`)
}

// Fase A · los siete gastos de la semana de oro. Suman $14.400 y ese es el
// número que el verificador contrasta. Si la migración 003 todavía no corrió,
// se avisa pero no se muere: las 4 comprobaciones nuevas fallarán y quedará
// claro qué se rompió.
const gResp = await sb.from('gastos').upsert(
  GASTOS_DEMO.map((g) => ({
    fecha: g.fecha, monto_cents: g.montoCents, nota: g.nota ?? null, es_demo: true,
  })),
  { onConflict: 'fecha' }
)
if (gResp.error) {
  if (/does not exist/i.test(gResp.error.message)) {
    console.log(`⚠️  gastos: tabla no encontrada. Correr migración 003_gastos.sql. Saltado.`)
  } else {
    morir(`gastos: ${gResp.error.message}`)
  }
} else {
  console.log(`✅ gastos: ${GASTOS_DEMO.length}`)
}

console.log(`\n${ORO.filas} filas plantadas${gResp.error ? '' : ' + ' + GASTOS_DEMO.length + ' gastos'}. Ahora: npm run verificar\n`)
