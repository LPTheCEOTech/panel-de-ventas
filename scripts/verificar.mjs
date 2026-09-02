/**
 * EL GATE. Lee la base de verdad, calcula con el kernel de verdad, y compara
 * contra los NÚMEROS DE ORO del mockup — que son externos y fijos.
 *
 *   npm run semilla -- cargar && npm run verificar
 *
 * 🔴 No compara el total contra la suma de sus partes: eso da verde con la base
 * vacía. Compara contra literales escritos a mano desde un documento que ya no
 * cambia, Y cuenta las filas (un corte silencioso de PostgREST a las 1.000
 * filas solo se ve contando).
 */
import { metricas, rankingClosers, rankingSetters, barrasPorDia } from '../src/shared/calculo/metricas.ts'
import { ORO, SEMANA_ORO } from '../src/shared/datos/semilla.ts'
import { dinero, porcentaje, porcentajeEntero } from '../src/shared/formato/index.ts'
import { conectar } from './comun.mjs'

const V = { desde: SEMANA_ORO[0], hasta: SEMANA_ORO[6] }
const sb = await conectar()

const fallos = []
function comprobar(que, obtenido, esperado) {
  const ok = String(obtenido) === String(esperado)
  console.log(`${ok ? '✅' : '❌'} ${que.padEnd(34)} ${String(obtenido).padStart(12)}${ok ? '' : `   esperaba ${esperado}`}`)
  if (!ok) fallos.push(`${que}: dio ${obtenido}, esperaba ${esperado}`)
}

const { data: personasCrudas, error: e1 } = await sb.from('personas').select('id, nombre, rol, activo, orden')
const { data: sCrudos, error: e2 } = await sb.from('reportes_setter')
  .select('fecha, persona_id, conversaciones, agendas').gte('fecha', V.desde).lte('fecha', V.hasta)
const { data: cCrudos, error: e3 } = await sb.from('reportes_closer')
  .select('fecha, persona_id, llamadas, asistieron, reagendadas, cierres, revenue_cents, cash_cents')
  .gte('fecha', V.desde).lte('fecha', V.hasta)

for (const e of [e1, e2, e3]) {
  if (e) { console.error(`\n🔴 No se pudo leer la base: ${e.message}\n`); process.exit(1) }
}

const personas = personasCrudas.map((p) => ({ ...p }))
const setters = sCrudos.map((r) => ({ fecha: r.fecha, personaId: r.persona_id, conversaciones: r.conversaciones, agendas: r.agendas }))
const closers = cCrudos.map((r) => ({
  fecha: r.fecha, personaId: r.persona_id, llamadas: r.llamadas, asistieron: r.asistieron,
  reagendadas: r.reagendadas, cierres: r.cierres, revenueCents: r.revenue_cents, cashCents: r.cash_cents,
}))

console.log(`\n── Semana de oro ${V.desde} a ${V.hasta} ──\n`)

// 🔴 contar filas: es lo único que delata un corte silencioso
comprobar('filas leídas de la base', setters.length + closers.length, ORO.filas)

const m = metricas(setters, closers)
comprobar('leads', m.leads, ORO.leads)
comprobar('agendas', m.agendas, ORO.agendas)
comprobar('llamadas', m.llamadas, ORO.llamadas)
comprobar('asistieron', m.asistieron, ORO.asistieron)
comprobar('cierres', m.cierres, ORO.cierres)
comprobar('revenue contratado', dinero(m.revenueCents), dinero(ORO.revenue))
comprobar('cash collected', dinero(m.cashCents), dinero(ORO.cash))
comprobar('tasa de agenda', porcentaje(m.tasaAgenda), ORO.tasaAgenda)
comprobar('tasa de asistencia', porcentaje(m.tasaAsistencia), ORO.tasaAsistencia)
comprobar('tasa de cierre', porcentaje(m.tasaCierre), ORO.tasaCierre)
comprobar('% de cobro', porcentajeEntero(m.porcentajeCobro), ORO.cobro)
comprobar('ticket promedio', dinero(m.ticketPromedioCents ?? 0), dinero(ORO.ticketPromedio))

console.log('\n── Ranking de closers ──\n')
rankingClosers(personas.map((p) => ({ ...p, id: p.id })), closers).forEach((f, i) => {
  const o = ORO.closers[i]
  if (!o) { fallos.push(`closer de más en el puesto ${i + 1}`); return }
  comprobar(`${i + 1}. ${o.nombre}`, `${f.persona.nombre} ${dinero(f.valor)}`, `${o.nombre} ${dinero(o.cash)}`)
})

console.log('\n── Ranking de setters ──\n')
rankingSetters(personas.map((p) => ({ ...p, id: p.id })), setters).forEach((f, i) => {
  const o = ORO.setters[i]
  if (!o) { fallos.push(`setter de más en el puesto ${i + 1}`); return }
  comprobar(`${i + 1}. ${o.nombre}`, `${f.persona.nombre} ${f.valor}`, `${o.nombre} ${o.agendas}`)
})

console.log('\n── Cash por día ──\n')
const barras = barrasPorDia(V, closers)
comprobar('barras', barras.length, 7)
comprobar('cash por día', barras.map((b) => b.cashCents).join(','), ORO.cashPorDia.join(','))
comprobar('la más alta llega al 100', barras.find((b) => b.esMaxima)?.altura ?? 0, 100)

console.log(`
────────────────────────────────────────────────
${fallos.length === 0 ? '✅ TODO CUADRA con el mockup aprobado.' : `❌ ${fallos.length} DIFERENCIA(S):`}
${fallos.map((f) => `   · ${f}`).join('\n')}

🔴 Lo que este verificador NO cubre, y hay que mirar a mano:
   · que las variables de Vercel estén bien cargadas (se prueba con un login real)
   · que el deploy de producción sea el SEGUNDO, no el del import
   · que el proyecto de Supabase no esté pausado (dig al subdominio)
   · cómo se ve la app (eso es el gate por foto, no esto)
   · si a quien la usa le sirve el orden de las pantallas
────────────────────────────────────────────────
`)
process.exit(fallos.length === 0 ? 0 : 1)
