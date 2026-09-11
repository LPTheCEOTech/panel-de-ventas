/**
 * El kernel de cálculo. TODO lo derivado nace acá y NADA de esto se guarda.
 *
 * 🔴 La regla que gobierna el archivo entero: **si el divisor es 0, la tasa es
 * `null`** — nunca `NaN`, nunca `Infinity`, nunca un `0.0%` que miente. Una
 * instalación recién hecha tiene 0 leads y 0 llamadas: si esto devolviera
 * números, la primera pantalla que ve el dueño diría `NaN%` y la app parecería
 * rota antes de que nadie cargue nada. `null` se pinta como `—`, que es lo que
 * el mockup dibuja en la pantalla "Recién instalado".
 */
import type { Persona, ReporteCloser, ReporteSetter, Ventana } from '@/shared/tipos'
import { dentro, diasDe, sumarDias } from './periodo'

/** Una tasa entre 0 y 1, o `null` si no se puede calcular. */
export type Tasa = number | null

export function tasa(numerador: number, divisor: number): Tasa {
  return divisor > 0 ? numerador / divisor : null
}

export interface Totales {
  leads: number
  agendas: number
  llamadas: number
  asistieron: number
  reagendadas: number
  cierres: number
  revenueCents: number
  cashCents: number
}

export interface Metricas extends Totales {
  tasaAgenda: Tasa
  tasaAsistencia: Tasa
  tasaCierre: Tasa
  /** Llamadas ÷ agendas. El mockup lo muestra en el embudo como "de agenda". */
  llamadasSobreAgendas: Tasa
  porcentajeCobro: Tasa
  /** En centavos, o `null` si no hubo cierres. */
  ticketPromedioCents: number | null
}

/**
 * Métricas + tres derivados que cuestan plata: CAC, costo por asistida y AOV.
 *
 * 🔴 Nada acá se guarda. Se calcula al leer, en cada render. Un mes sin
 * cierres deja `cac` y `aov` en `null`; un mes sin asistidos deja
 * `costoPorLlamadaAsistida` en `null`. Todo se pinta como `—`.
 *
 * 🔴 AOV NO es lo mismo que ticket promedio. Ticket = revenue ÷ cierres
 * («cuánto vale una venta firmada»). AOV = cash ÷ cierres («cuánto entra por
 * cliente ganado»). Son dos preguntas distintas y por eso conviven.
 */
export interface MetricasConCosto extends Metricas {
  gastoCents: number
  cac: number | null
  costoPorLlamadaAsistida: number | null
  aov: number | null
}

const CERO: Totales = {
  leads: 0, agendas: 0, llamadas: 0, asistieron: 0,
  reagendadas: 0, cierres: 0, revenueCents: 0, cashCents: 0,
}

export function totales(
  setters: readonly ReporteSetter[],
  closers: readonly ReporteCloser[]
): Totales {
  const t = { ...CERO }
  for (const r of setters) {
    t.leads += r.conversaciones
    t.agendas += r.agendas
  }
  for (const r of closers) {
    t.llamadas += r.llamadas
    t.asistieron += r.asistieron
    t.reagendadas += r.reagendadas
    t.cierres += r.cierres
    t.revenueCents += r.revenueCents
    t.cashCents += r.cashCents
  }
  return t
}

export function metricas(
  setters: readonly ReporteSetter[],
  closers: readonly ReporteCloser[]
): Metricas {
  const t = totales(setters, closers)
  return {
    ...t,
    tasaAgenda: tasa(t.agendas, t.leads),
    tasaAsistencia: tasa(t.asistieron, t.llamadas),
    tasaCierre: tasa(t.cierres, t.asistieron),
    llamadasSobreAgendas: tasa(t.llamadas, t.agendas),
    porcentajeCobro: tasa(t.cashCents, t.revenueCents),
    ticketPromedioCents: t.cierres > 0 ? Math.round(t.revenueCents / t.cierres) : null,
  }
}

/**
 * La diferencia en PUNTOS porcentuales contra el período anterior.
 *
 * Devuelve `null` cuando alguno de los dos lados no se puede calcular — que es
 * el caso de la primera semana de uso. El mockup lo pinta con `.delta.nil`.
 */
export function delta(actual: Tasa, previa: Tasa): number | null {
  if (actual === null || previa === null) return null
  return (actual - previa) * 100
}

// ---------------------------------------------------------------- rankings

export interface FilaRanking {
  persona: Persona
  valor: number
  /** Lo de abajo del nombre. Se arma en el componente, no acá. */
  detalle: { cierres?: number; tasa: Tasa; leads?: number }
}

/** Closers ordenados por cash collected. Todos los que tuvieron actividad. */
export function rankingClosers(
  personas: readonly Persona[],
  reportes: readonly ReporteCloser[]
): FilaRanking[] {
  const porPersona = new Map<string, ReporteCloser[]>()
  for (const r of reportes) {
    const lista = porPersona.get(r.personaId)
    if (lista) lista.push(r)
    else porPersona.set(r.personaId, [r])
  }
  const filas: FilaRanking[] = []
  for (const [id, rs] of porPersona) {
    // 🔴 Se busca en TODAS las personas, no solo en las activas: alguien dado de
    // baja el viernes tiene que seguir apareciendo en el ranking de esa semana.
    const persona = personas.find((p) => p.id === id)
    if (!persona) continue
    const t = totales([], rs)
    filas.push({
      persona,
      valor: t.cashCents,
      detalle: { cierres: t.cierres, tasa: tasa(t.cierres, t.asistieron) },
    })
  }
  return filas.sort((a, b) => b.valor - a.valor || a.persona.nombre.localeCompare(b.persona.nombre))
}

/** Setters ordenados por agendas. */
export function rankingSetters(
  personas: readonly Persona[],
  reportes: readonly ReporteSetter[]
): FilaRanking[] {
  const porPersona = new Map<string, ReporteSetter[]>()
  for (const r of reportes) {
    const lista = porPersona.get(r.personaId)
    if (lista) lista.push(r)
    else porPersona.set(r.personaId, [r])
  }
  const filas: FilaRanking[] = []
  for (const [id, rs] of porPersona) {
    const persona = personas.find((p) => p.id === id)
    if (!persona) continue
    const t = totales(rs, [])
    filas.push({
      persona,
      valor: t.agendas,
      detalle: { tasa: tasa(t.agendas, t.leads), leads: t.leads },
    })
  }
  return filas.sort((a, b) => b.valor - a.valor || a.persona.nombre.localeCompare(b.persona.nombre))
}

// ---------------------------------------------------------------- por día

export interface Barra {
  clave: string
  /** Lo que se lee abajo: `L M M J V S D` por día, `S1…S5` por semana. */
  etiqueta: string
  cashCents: number
  /** 0-100. La barra más alta del período llega a 100. */
  altura: number
  esMaxima: boolean
}

/**
 * Las barras de "Cash collected por día".
 *
 * 🔴 La altura es `valor ÷ máximo × 100`, así que **la más alta llega al tope**.
 * El mockup original dibujaba la más alta al 92%; ese 92 es arte de la demo, no
 * una escala derivable. Con todo en cero, todas las barras quedan en 0 y no se
 * divide por nada.
 */
export function barrasPorDia(v: Ventana, closers: readonly ReporteCloser[]): Barra[] {
  const porFecha = new Map<string, number>()
  for (const r of closers) {
    if (!dentro(r.fecha, v)) continue
    porFecha.set(r.fecha, (porFecha.get(r.fecha) ?? 0) + r.cashCents)
  }
  return escalar(
    diasDe(v).map((fecha) => ({
      clave: fecha,
      etiqueta: INICIAL_DIA[new Date(`${fecha}T00:00:00Z`).getUTCDay()],
      cashCents: porFecha.get(fecha) ?? 0,
    }))
  )
}

/**
 * Las barras de un MES, agrupadas por semana.
 *
 * 🔴 Un mes tiene 28 a 31 días. Dibujar una barra por día da 31 rayitas de 3 px
 * en un celular de 390: no se lee ninguna. Por semana son 5 o 6 barras, que es
 * la misma forma que ya tiene la vista semanal y se lee igual de bien.
 */
export function barrasPorSemana(
  v: Ventana,
  closers: readonly ReporteCloser[],
  inicioSemana: 0 | 1
): Barra[] {
  const grupos: { clave: string; etiqueta: string; cashCents: number }[] = []
  const indice = new Map<string, number>()
  for (const fecha of diasDe(v)) {
    const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay()
    const atras = (dow - inicioSemana + 7) % 7
    // el lunes de esa semana; si cae antes del mes, se agrupa igual bajo él
    const lunes = sumarDias(fecha, -atras)
    if (!indice.has(lunes)) {
      indice.set(lunes, grupos.length)
      grupos.push({ clave: lunes, etiqueta: `S${grupos.length + 1}`, cashCents: 0 })
    }
  }
  for (const r of closers) {
    if (!dentro(r.fecha, v)) continue
    const dow = new Date(`${r.fecha}T00:00:00Z`).getUTCDay()
    const lunes = sumarDias(r.fecha, -((dow - inicioSemana + 7) % 7))
    const i = indice.get(lunes)
    if (i !== undefined) grupos[i].cashCents += r.cashCents
  }
  return escalar(grupos)
}

const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/**
 * 🔴 La altura es `valor ÷ máximo × 100`, así que **la más alta llega al tope**.
 * El mockup original dibujaba la más alta al 92%; ese 92 es arte de la demo, no
 * una escala derivable. Con todo en cero, todas quedan en 0 y no se divide por
 * nada.
 */
function escalar(crudas: { clave: string; etiqueta: string; cashCents: number }[]): Barra[] {
  const maximo = Math.max(0, ...crudas.map((b) => b.cashCents))
  return crudas.map((b) => ({
    ...b,
    altura: maximo > 0 ? (b.cashCents / maximo) * 100 : 0,
    esMaxima: maximo > 0 && b.cashCents === maximo,
  }))
}

// ---------------------------------------------------------------- embudo

export interface PasoEmbudo {
  nombre: string
  valor: number
  /** Ancho de la barra, 0-100, relativo al primer paso. */
  ancho: number
  /** El texto de la derecha. `null` cuando no hay divisor. */
  conversion: { etiqueta: string; tasa: Tasa } | null
  esDinero?: boolean
  /** 🔴 Fase A · el paso 0 del embudo. No comparte escala con los leads (es
   *  plata, no un conteo) y se dibuja sin barra: el número solo. */
  esGasto?: boolean
}

/**
 * 🔴 Los anchos son PROPORCIONALES al valor, y por eso no coinciden con los del
 * mockup.
 *
 * El mockup dibuja Agendas al 70% cuando son el 30% de los leads: es la forma
 * de un embudo, dibujada a mano para que se vea lindo. Portarla sería poner una
 * barra que dice «30%» al lado y mide 70% — un número con una afirmación al
 * lado que lo contradice es exactamente lo que la gente cree sin mirar.
 *
 * La legibilidad la resuelve el `min-width` de la barra, que garantiza que el
 * número de adentro se lea aunque el paso sea el 4% del primero.
 */
export function embudo(m: Metricas, gastoCents?: number): PasoEmbudo[] {
  const base = m.leads
  const ancho = (n: number) => (base > 0 ? Math.max(4, (n / base) * 100) : 4)
  // El cash NO es un conteo: no puede compartir la escala de los leads. Se
  // dibuja como la porción de los cierres que efectivamente se cobró.
  const anchoCash = ancho(m.cierres) * (m.porcentajeCobro ?? 0)
  // 🔴 Si el caller pasa un `gastoCents` (Fase A), el embudo arranca en Gasto.
  // Sin arg, el kernel devuelve los 6 pasos históricos: el test antiguo sigue
  // verde y el llamador que todavía no sabe de gasto sigue funcionando.
  const gasto: PasoEmbudo[] = gastoCents === undefined ? [] : [
    { nombre: 'Gasto', valor: gastoCents, ancho: 0, conversion: null, esDinero: true, esGasto: true },
  ]
  return [
    ...gasto,
    { nombre: 'Leads', valor: m.leads, ancho: base > 0 ? 100 : 4, conversion: { etiqueta: '', tasa: base > 0 ? 1 : null } },
    { nombre: 'Agendas', valor: m.agendas, ancho: ancho(m.agendas), conversion: { etiqueta: 'agenda', tasa: m.tasaAgenda } },
    { nombre: 'Llamadas', valor: m.llamadas, ancho: ancho(m.llamadas), conversion: { etiqueta: 'de agenda', tasa: m.llamadasSobreAgendas } },
    { nombre: 'Asistieron', valor: m.asistieron, ancho: ancho(m.asistieron), conversion: { etiqueta: 'asist.', tasa: m.tasaAsistencia } },
    { nombre: 'Cierres', valor: m.cierres, ancho: ancho(m.cierres), conversion: { etiqueta: 'cierre', tasa: m.tasaCierre } },
    { nombre: 'Cash', valor: m.cashCents, ancho: Math.max(4, anchoCash), conversion: { etiqueta: 'cobro', tasa: m.porcentajeCobro }, esDinero: true },
  ]
}

export function enVentana<T extends { fecha: string }>(filas: readonly T[], v: Ventana): T[] {
  return filas.filter((r) => dentro(r.fecha, v))
}

// ---------------------------------------------------------------- costo

/**
 * Cost per Acquired Customer: cuánto costó cada cierre.
 *
 * 🔴 Divisor 0 → `null`. Redondeo a centavo entero con `Math.round`, igual que
 * `ticketPromedioCents`. Redondear al peso lo hace `dinero()` al pintar; acá
 * se guarda el centavo real para que `verificar.mjs` pueda comparar exacto.
 */
export function cac(gastoCents: number, cierres: number): number | null {
  return cierres > 0 ? Math.round(gastoCents / cierres) : null
}

export function costoPorLlamadaAsistida(gastoCents: number, asistieron: number): number | null {
  return asistieron > 0 ? Math.round(gastoCents / asistieron) : null
}

/**
 * Average Order Value: cash cobrado ÷ cierres.
 *
 * 🔴 No es lo mismo que ticket promedio (revenue ÷ cierres). Ticket es lo que
 * se firmó; AOV es lo que efectivamente entró por cliente ganado.
 */
export function aov(cashCents: number, cierres: number): number | null {
  return cierres > 0 ? Math.round(cashCents / cierres) : null
}

export function metricasConCosto(
  setters: readonly ReporteSetter[],
  closers: readonly ReporteCloser[],
  gastoCents: number
): MetricasConCosto {
  const m = metricas(setters, closers)
  return {
    ...m,
    gastoCents,
    cac: cac(gastoCents, m.cierres),
    costoPorLlamadaAsistida: costoPorLlamadaAsistida(gastoCents, m.asistieron),
    aov: aov(m.cashCents, m.cierres),
  }
}
