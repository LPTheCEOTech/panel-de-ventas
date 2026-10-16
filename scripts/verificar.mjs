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
import { agregarLlamadas, embudo, metricas, metricasConCosto, midieronCalificadas, rankingClosers, rankingSetters, barrasPorDia } from '../src/shared/calculo/metricas.ts'
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
// 🔴 Con `*`: `calificadas` existe solo si la base aplicó la 009. Pedirla por
// nombre haría fallar el verificador entero en una base sin actualizar.
const { data: sCrudos, error: e2 } = await sb.from('reportes_setter')
  .select('*').gte('fecha', V.desde).lte('fecha', V.hasta)
// 🔴 Fase D · leemos `llamadas` (una fila por llamada) en vez de
// `reportes_closer`. Solo activa=true. El puente `agregarLlamadas()` las
// convierte al shape que espera el kernel.
const { data: llCrudas, error: e3 } = await sb.from('llamadas')
  .select('id, persona_id, fecha, asistio, reagendada, cerro, revenue_cents, cash_cents, activa')
  .eq('activa', true).gte('fecha', V.desde).lte('fecha', V.hasta)
// Fase A · gastos de la misma ventana. Si la tabla todavia no existe (la
// migracion 003 no se corrio contra la base), se ignora el error y se sigue:
// las 4 comprobaciones nuevas fallaran diciendo que el gasto dio 0.
const gastosResp = await sb.from('gastos').select('fecha, monto_cents')
  .gte('fecha', V.desde).lte('fecha', V.hasta)
const gastosCrudos = gastosResp.data ?? []
const gastosError = gastosResp.error

for (const e of [e1, e2, e3]) {
  if (e) { console.error(`\n🔴 No se pudo leer la base: ${e.message}\n`); process.exit(1) }
}

const personas = personasCrudas.map((p) => ({ ...p }))
const tieneColumna = sCrudos.length > 0 && 'calificadas' in sCrudos[0]
const setters = sCrudos.map((r) => ({
  fecha: r.fecha, personaId: r.persona_id, conversaciones: r.conversaciones, agendas: r.agendas,
  calificadas: typeof r.calificadas === 'number' ? r.calificadas : null,
}))
// Fase D · llamadas crudas → shape del kernel → agregar por (fecha, persona)
const llamadas = llCrudas.map((l) => ({
  id: l.id, personaId: l.persona_id, fecha: l.fecha,
  asistio: l.asistio, reagendada: l.reagendada, cerro: l.cerro,
  revenueCents: Number(l.revenue_cents), cashCents: Number(l.cash_cents),
  activa: l.activa, nota: null,
}))
const closers = agregarLlamadas(llamadas)

console.log(`\n── Semana de oro ${V.desde} a ${V.hasta} ──\n`)

// 🔴 contar filas: es lo único que delata un corte silencioso. Fase D separa
// las dos tablas (setter y llamadas): son fuentes distintas.
comprobar('filas leídas de setter', setters.length, ORO.filasSetter)
comprobar('filas leídas de llamadas', llamadas.length, ORO.filasLlamadas)

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

// Con la semana medida, el ranking ordena por calificadas; sin medir, por
// agendas. Las agendas de cada uno se comprueban en los dos casos.
const filasSetters = rankingSetters(personas.map((p) => ({ ...p, id: p.id })), setters)
const porCalificadas = filasSetters.some((f) => f.detalle.agendas !== undefined)
console.log(`\n── Ranking de setters (por ${porCalificadas ? 'calificadas' : 'agendas'}) ──\n`)
filasSetters.forEach((f, i) => {
  const o = ORO.setters[i]
  if (!o) { fallos.push(`setter de más en el puesto ${i + 1}`); return }
  const agendas = f.detalle.agendas ?? f.valor
  comprobar(`${i + 1}. ${o.nombre}`, `${f.persona.nombre} ${agendas}`, `${o.nombre} ${o.agendas}`)
  if (porCalificadas) {
    comprobar(`   calificadas · % calif.`, `${f.valor} · ${porcentajeEntero(f.detalle.tasa)}`, `${o.calificadas} · ${o.tasaCalificacion}`)
  }
})

// ── 009 · agendas calificadas ─────────────────────────────────
console.log('\n── Agendas calificadas (009) ──\n')
if (!tieneColumna) {
  console.log('⚠️  la base no tiene la columna `calificadas`: falta apretar «Actualizar ahora» en el panel')
  fallos.push('calificadas: la base no tiene la columna (falta la actualización 009)')
} else if (!midieronCalificadas(setters)) {
  console.log('⚠️  la columna existe, pero la semana de oro no tiene calificadas cargadas')
  fallos.push('calificadas: la semana de oro no tiene calificadas cargadas')
} else {
  comprobar('calificadas', m.calificadas, ORO.calificadas)
  comprobar('tasa de calificación', porcentaje(m.tasaCalificacion), ORO.tasaCalificacion)
  comprobar('llamadas «de calif.»', porcentajeEntero(m.llamadasSobreCalificadas), ORO.llamadasSobreCalificadas)
  comprobar('escalón Calificadas en el embudo', embudo(m).map((p) => p.nombre).join(' › '),
    'Leads › Agendas › Calificadas › Llamadas › Asistieron › Cierres › Cash')
}

console.log('\n── Cash por día ──\n')
const barras = barrasPorDia(V, closers)
comprobar('barras', barras.length, 7)
comprobar('cash por día', barras.map((b) => b.cashCents).join(','), ORO.cashPorDia.join(','))
comprobar('la más alta llega al 100', barras.find((b) => b.esMaxima)?.altura ?? 0, 100)

// ── Fase A · gasto y derivados ─────────────────────────────────
console.log('\n── Gasto y derivados (Fase A) ──\n')
if (gastosError) {
  console.log(`⚠️  no pude leer gastos: ${gastosError.message}`)
  fallos.push(`gastos: ${gastosError.message}`)
} else {
  const gastoCents = gastosCrudos.reduce((s, g) => s + Number(g.monto_cents), 0)
  const mc = metricasConCosto(setters, closers, gastoCents)
  comprobar('gasto de la semana', dinero(mc.gastoCents), dinero(ORO.gastoSemana))
  comprobar('CAC', dinero(mc.cac ?? 0), dinero(ORO.cacSemana))
  comprobar('costo por asistida', dinero(mc.costoPorLlamadaAsistida ?? 0), dinero(ORO.costoAsistida))
  comprobar('AOV', dinero(mc.aov ?? 0), dinero(ORO.aovSemana))
}

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
