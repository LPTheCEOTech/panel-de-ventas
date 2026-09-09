/**
 * Llena la base con datos de ejemplo PLAUSIBLES hasta hoy, para que quien
 * entre a mirar la app la vea viva en vez de en cero.
 *
 *   npm run demo-vivo -- cargar
 *   npm run demo-vivo -- limpiar
 *
 * 🔴 Todo va marcado `es_demo = true`, igual que la semilla: `limpiar` borra
 * exactamente esto y nunca una fila real.
 *
 * 🔴 NO toca la semana de oro (20 al 26 de julio de 2026). Esa es la que
 * compara `npm run verificar` contra los números del mockup: si se le
 * escribiera encima, el verificador dejaría de significar nada.
 */
import { conectar, morir } from './comun.mjs'

const ORO_DESDE = '2026-07-20', ORO_HASTA = '2026-07-26'
const SEMANAS_ATRAS = 8

const sb = await conectar()
const comando = process.argv[2]

/** Hoy en la zona del negocio, leída de la configuración. */
const { data: cfg } = await sb.from('configuracion').select('zona_horaria').eq('id', 1).maybeSingle()
const zona = cfg?.zona_horaria ?? 'America/New_York'
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const dia = 86_400_000
const aMs = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const aIso = (ms) => new Date(ms).toISOString().slice(0, 10)

if (comando === 'limpiar') {
  for (const t of ['reportes_setter', 'reportes_closer']) {
    const { error, count } = await sb.from(t).delete({ count: 'exact' })
      .eq('es_demo', true).not('fecha', 'gte', ORO_DESDE).not('fecha', 'lte', ORO_HASTA)
    if (error) morir(`${t}: ${error.message}`)
    console.log(`✅ ${t}: ${count ?? 0} filas de ejemplo borradas (la semana de oro NO se tocó)`)
  }
  process.exit(0)
}
if (comando !== 'cargar') { console.log('\nUso: npm run demo-vivo -- cargar | limpiar\n'); process.exit(1) }

const { data: personas, error: eP } = await sb.from('personas').select('id, nombre, rol, activo')
if (eP) morir(eP.message)
const setters = personas.filter((p) => p.activo && (p.rol === 'setter' || p.rol === 'ambos'))
const closers = personas.filter((p) => p.activo && (p.rol === 'closer' || p.rol === 'ambos'))
if (!setters.length || !closers.length) morir('No hay equipo cargado. Corré `npm run semilla -- cargar` primero.')

/** Aleatorio REPETIBLE: la misma fecha y la misma persona dan siempre el mismo
 *  número, así que volver a correr el script no cambia el panel. */
function dado(semilla) {
  let h = 2166136261
  for (const c of semilla) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}
const entre = (s, min, max) => Math.round(min + dado(s) * (max - min))

const TICKET = 300_000 // $3.000 en centavos

const filasSetter = [], filasCloser = []
const desde = aMs(hoy) - SEMANAS_ATRAS * 7 * dia

for (let t = desde; t <= aMs(hoy); t += dia) {
  const fecha = aIso(t)
  if (fecha >= ORO_DESDE && fecha <= ORO_HASTA) continue // la semana de oro no se toca
  const dow = new Date(t).getUTCDay()
  const finde = dow === 0 || dow === 6

  for (const p of setters) {
    // el fin de semana el equipo trabaja, pero mucho menos
    const convs = finde ? entre(`c${fecha}${p.id}`, 3, 9) : entre(`c${fecha}${p.id}`, 14, 28)
    // tasa de agenda plausible: entre 26% y 36%
    const agendas = Math.max(0, Math.round(convs * (0.26 + dado(`a${fecha}${p.id}`) * 0.10)))
    filasSetter.push({ fecha, persona_id: p.id, conversaciones: convs, agendas, es_demo: true })
  }

  for (const p of closers) {
    // 🔴 Menos llamadas que agendas, a propósito. El setter agenda y una parte
    // se cae antes de llegar al calendario del closer: si los dos totales dan
    // igual, el embudo muestra «de agenda 100%» y eso se lee como dato inventado.
    const llamadas = finde ? entre(`l${fecha}${p.id}`, 0, 2) : entre(`l${fecha}${p.id}`, 3, 8)
    const asistieron = Math.round(llamadas * (0.58 + dado(`s${fecha}${p.id}`) * 0.22))
    const reagendadas = Math.max(0, Math.min(llamadas - asistieron, entre(`r${fecha}${p.id}`, 0, 2)))
    const cierres = Math.round(asistieron * (0.28 + dado(`x${fecha}${p.id}`) * 0.22))
    const revenue = cierres * TICKET
    // se cobra entre el 45% y el 75% de lo firmado, en múltiplos de $50
    const cash = Math.round((revenue * (0.45 + dado(`m${fecha}${p.id}`) * 0.30)) / 5000) * 5000
    filasCloser.push({
      fecha, persona_id: p.id, llamadas, asistieron, reagendadas, cierres,
      revenue_cents: revenue, cash_cents: Math.min(cash, revenue), es_demo: true,
    })
  }
}

for (const [tabla, filas] of [['reportes_setter', filasSetter], ['reportes_closer', filasCloser]]) {
  for (let i = 0; i < filas.length; i += 400) {
    const { error } = await sb.from(tabla).upsert(filas.slice(i, i + 400), { onConflict: 'fecha,persona_id' })
    if (error) morir(`${tabla}: ${error.message}`)
  }
  console.log(`✅ ${tabla}: ${filas.length} filas`)
}
console.log(`\nDatos de ejemplo desde ${aIso(desde)} hasta ${hoy}. La semana de oro quedó intacta.\n`)
