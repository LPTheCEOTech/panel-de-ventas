/**
 * El rango de fechas del Panel: qué se pide en la URL, qué ventana es, contra
 * qué se compara y cómo se nombra.
 *
 * Todo con cadenas `YYYY-MM-DD`, igual que `periodo.ts` (ver ahí por qué nunca
 * `Date` a secas). Son funciones puras: el servidor las usa para calcular y el
 * selector del cliente para dibujar el calendario.
 */
import type { Periodo, Ventana } from '@/shared/tipos'

import { diaDeLaSemana, sumarDias, ventana, ventanaAnterior } from './periodo'

export type Atajo = 'hoy' | 'semana' | 'mes' | 'mes-pasado' | '30-dias' | 'año' | 'todo'

/** En el orden en que se muestran. */
export const ATAJOS: readonly { valor: Atajo; texto: string }[] = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'semana', texto: 'Esta semana' },
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'mes-pasado', texto: 'Mes pasado' },
  { valor: '30-dias', texto: 'Últimos 30 días' },
  { valor: 'año', texto: 'Este año' },
  { valor: 'todo', texto: 'Todo' },
]

/** El período por defecto: el mes en curso (decisión de Jack, 2026-10-01). */
export const ATAJO_POR_DEFECTO: Atajo = 'mes'

export interface Rango extends Ventana {
  /** El atajo que lo produjo o con el que coincide; `null` si es un rango libre. */
  atajo: Atajo | null
}

/** Lo que pide la URL, antes de saber fechas como «hoy» o «el primer reporte». */
export type Pedido = { atajo: Atajo } | { ventana: Ventana }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** El piso de cualquier fecha que venga de afuera: evita recorrer siglos. */
const PISO = '2000-01-01'

// ---------------------------------------------------------------- fechas sueltas

/** ¿Es una fecha real con forma `YYYY-MM-DD`? (`2026-02-30` no lo es). */
export function esFecha(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false
  return sumarDias(x, 0) === x
}

export function diasEntre(v: Ventana): number {
  const a = Date.UTC(...partes(v.desde))
  const b = Date.UTC(...partes(v.hasta))
  return Math.round((b - a) / 86_400_000) + 1
}

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.split('-').map(Number)
  return [a, m - 1, d]
}

function ultimoDelMes(iso: string): string {
  return ventana('mes', iso).hasta
}

function esMesEntero(v: Ventana): boolean {
  return v.desde.endsWith('-01') && v.hasta === ultimoDelMes(v.desde)
}

function esAñoEntero(v: Ventana): boolean {
  return v.desde.slice(0, 4) === v.hasta.slice(0, 4) && v.desde.endsWith('-01-01') && v.hasta.endsWith('-12-31')
}

function esSemanaEntera(v: Ventana, inicioSemana: 0 | 1): boolean {
  return diasEntre(v) === 7 && diaDeLaSemana(v.desde) === inicioSemana
}

// ---------------------------------------------------------------- URL → rango

type Parametros = Record<string, string | string[] | undefined>

function uno(sp: Parametros, clave: string): string | undefined {
  const v = sp[clave]
  return Array.isArray(v) ? v[0] : v
}

/**
 * Qué pide la URL. Precedencia: `?r=` (atajo) → `?desde&hasta` (rango libre)
 * → `?p&f` (el formato viejo, para que los links guardados sigan andando) →
 * el mes en curso. Lo malformado cae al defecto: un parámetro raro nunca
 * revienta la página.
 */
export function leerPedido(sp: Parametros, inicioSemana: 0 | 1): Pedido {
  const r = uno(sp, 'r')
  if (ATAJOS.some((a) => a.valor === r)) return { atajo: r as Atajo }

  const desde = uno(sp, 'desde')
  const hasta = uno(sp, 'hasta')
  if (esFecha(desde) && esFecha(hasta)) {
    const [a, b] = desde <= hasta ? [desde, hasta] : [hasta, desde]
    return { ventana: { desde: a < PISO ? PISO : a, hasta: b < PISO ? PISO : b } }
  }

  const p = uno(sp, 'p') as Periodo | undefined
  if (p === 'dia' || p === 'semana' || p === 'mes') {
    const f = uno(sp, 'f')
    if (esFecha(f) && f >= PISO) return { ventana: ventana(p, f, inicioSemana) }
    return { atajo: ({ dia: 'hoy', semana: 'semana', mes: 'mes' } as const)[p] }
  }

  return { atajo: ATAJO_POR_DEFECTO }
}

/**
 * La ventana de un atajo. «Este mes» y «Este año» son la unidad calendario
 * entera (incluye días que todavía no pasaron), igual que el «Mes» de antes.
 * «Todo» empieza en el primer dato cargado; sin datos, hoy.
 */
export function ventanaDeAtajo(atajo: Atajo, hoy: string, inicioSemana: 0 | 1, primera: string | null = null): Ventana {
  switch (atajo) {
    case 'hoy': return { desde: hoy, hasta: hoy }
    case 'semana': return ventana('semana', hoy, inicioSemana)
    case 'mes': return ventana('mes', hoy)
    case 'mes-pasado': return ventanaAnterior('mes', ventana('mes', hoy))
    case '30-dias': return { desde: sumarDias(hoy, -29), hasta: hoy }
    case 'año': return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: `${hoy.slice(0, 4)}-12-31` }
    case 'todo': return { desde: primera && primera < hoy ? primera : hoy, hasta: hoy }
  }
}

/**
 * El atajo con el que coincide una ventana, para marcarlo en el selector y
 * nombrar el botón. «Todo» no se adivina: solo cuenta si se pidió.
 */
export function atajoDe(v: Ventana, hoy: string, inicioSemana: 0 | 1): Atajo | null {
  for (const { valor } of ATAJOS) {
    if (valor === 'todo') continue
    const w = ventanaDeAtajo(valor, hoy, inicioSemana)
    if (w.desde === v.desde && w.hasta === v.hasta) return valor
  }
  return null
}

export function resolverRango(pedido: Pedido, hoy: string, inicioSemana: 0 | 1, primera: string | null = null): Rango {
  if ('atajo' in pedido) {
    return { ...ventanaDeAtajo(pedido.atajo, hoy, inicioSemana, primera), atajo: pedido.atajo }
  }
  return { ...pedido.ventana, atajo: atajoDe(pedido.ventana, hoy, inicioSemana) }
}

/** La query que pide un rango: los atajos viajan como atajo, así un favorito sigue siendo «Este mes» el mes que viene. */
export function queryDe(r: { desde: string; hasta: string; atajo: Atajo | null }): Record<string, string> {
  return r.atajo ? { r: r.atajo } : { desde: r.desde, hasta: r.hasta }
}

// ---------------------------------------------------------------- comparación

/**
 * Contra qué se comparan las tasas (los chips ▲▼). Un mes entero, contra el
 * mes anterior (que puede tener otro largo); un año entero, contra el año
 * anterior; cualquier otro rango, contra los mismos días inmediatamente antes.
 * «Todo» no tiene anterior.
 */
export function rangoAnterior(r: Rango): Ventana | null {
  if (r.atajo === 'todo') return null
  if (esMesEntero(r)) return ventanaAnterior('mes', r)
  if (esAñoEntero(r)) {
    const a = Number(r.desde.slice(0, 4)) - 1
    return { desde: `${a}-01-01`, hasta: `${a}-12-31` }
  }
  const largo = diasEntre(r)
  return { desde: sumarDias(r.desde, -largo), hasta: sumarDias(r.desde, -1) }
}

// ---------------------------------------------------------------- gráfico

export type Unidad = 'día' | 'semana' | 'mes'

/**
 * Cómo se agrupa el gráfico de cash. Un día suelto no es un gráfico: se
 * muestran los 7 días que terminan en él. Hasta dos semanas, barra por día;
 * hasta un trimestre, por semana (el «Mes» de siempre); más largo, por mes.
 */
export function graficoDe(v: Ventana): { unidad: Unidad; ventana: Ventana; subtitulo: string } {
  const n = diasEntre(v)
  if (n === 1) return { unidad: 'día', ventana: { desde: sumarDias(v.hasta, -6), hasta: v.hasta }, subtitulo: 'los últimos 7 días' }
  if (n <= 14) return { unidad: 'día', ventana: v, subtitulo: 'día por día' }
  if (n <= 92) return { unidad: 'semana', ventana: v, subtitulo: 'semana por semana' }
  return { unidad: 'mes', ventana: v, subtitulo: 'mes por mes' }
}

// ---------------------------------------------------------------- nombres

function capital(s: string): string {
  return s[0].toUpperCase() + s.slice(1)
}

function diaLargo(iso: string, conAño = true): string {
  const [a, m, d] = iso.split('-').map(Number)
  return conAño ? `${d} de ${MESES[m - 1]} de ${a}` : `${d} de ${MESES[m - 1]}`
}

function diaCorto(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES_CORTOS[m - 1]}`
}

/**
 * El subtítulo del Panel: el período con todas las letras.
 * `Octubre de 2026` · `Semana 20–26 de julio de 2026` · `1 de octubre de 2026`
 * · `Año 2026` · `15 de agosto – 10 de septiembre de 2026` · `Desde el 17 de julio de 2026`
 */
export function tituloDeRango(r: Rango, inicioSemana: 0 | 1): string {
  const [a1, m1, d1] = r.desde.split('-').map(Number)
  const [a2, m2, d2] = r.hasta.split('-').map(Number)
  if (r.atajo === 'todo') return `Desde el ${diaLargo(r.desde)}`
  if (r.desde === r.hasta) return diaLargo(r.desde)
  if (esMesEntero(r)) return `${capital(MESES[m1 - 1])} de ${a1}`
  if (esAñoEntero(r)) return `Año ${a1}`
  const pre = esSemanaEntera(r, inicioSemana) ? 'Semana ' : ''
  if (a1 === a2 && m1 === m2) return `${pre}${d1}–${d2} de ${MESES[m1 - 1]} de ${a1}`
  if (a1 === a2) return `${pre}${diaLargo(r.desde, false)} – ${diaLargo(r.hasta)}`
  return `${pre}${diaLargo(r.desde)} – ${diaLargo(r.hasta)}`
}

/**
 * Lo que dice el botón: el nombre del atajo, o el rango en corto.
 * `Este mes` · `Septiembre 2026` · `15 ago – 10 sep` · `3–18 ago`
 */
export function etiquetaDeRango(r: Rango, hoy: string): string {
  const atajo = ATAJOS.find((a) => a.valor === r.atajo)
  if (atajo) return atajo.texto
  const [a1, m1, d1] = r.desde.split('-').map(Number)
  const [a2, m2, d2] = r.hasta.split('-').map(Number)
  const año = a1 === a2 && String(a1) === hoy.slice(0, 4) ? '' : ` ${a2}`
  if (esMesEntero(r)) return `${capital(MESES[m1 - 1])} ${a1}`
  if (esAñoEntero(r)) return `Año ${a1}`
  if (r.desde === r.hasta) return `${diaCorto(r.desde)}${año}`
  if (a1 === a2 && m1 === m2) return `${d1}–${d2} ${MESES_CORTOS[m1 - 1]}${año}`
  if (a1 !== a2) return `${diaCorto(r.desde)} ${a1} – ${diaCorto(r.hasta)} ${a2}`
  return `${diaCorto(r.desde)} – ${diaCorto(r.hasta)}${año}`
}

/** El «del mes» del embudo («Embudo del mes»). */
export function deQueDe(r: Rango, inicioSemana: 0 | 1): string {
  if (r.desde === r.hasta) return 'del día'
  if (esSemanaEntera(r, inicioSemana)) return 'de la semana'
  if (esMesEntero(r)) return 'del mes'
  if (esAñoEntero(r)) return 'del año'
  return 'del período'
}

// ---------------------------------------------------------------- calendario

/** `2026-09` → `Septiembre 2026` */
export function nombreDelMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return `${capital(MESES[m - 1])} ${a}`
}

/** `2026-01` + (-1) → `2025-12` */
export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/**
 * La grilla de un mes: semanas de 7 casilleros, `null` donde el día es de
 * otro mes. Arranca en el día que el negocio eligió como inicio de semana.
 */
export function grillaDelMes(mes: string, inicioSemana: 0 | 1): (string | null)[][] {
  const primero = `${mes}-01`
  const ultimo = ultimoDelMes(primero)
  const blancos = (diaDeLaSemana(primero) - inicioSemana + 7) % 7
  const celdas: (string | null)[] = Array(blancos).fill(null)
  for (let d = primero; d <= ultimo; d = sumarDias(d, 1)) celdas.push(d)
  while (celdas.length % 7 !== 0) celdas.push(null)
  const semanas: (string | null)[][] = []
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
  return semanas
}

/** Las iniciales de los días en el orden de la grilla. */
export function encabezadoSemana(inicioSemana: 0 | 1): string[] {
  const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return inicioSemana === 1 ? [...dias.slice(1), dias[0]] : dias
}
