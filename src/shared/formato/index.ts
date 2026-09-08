/**
 * Cómo se escribe cada número en pantalla. Un solo lugar, para que el panel y
 * los formularios no lo hagan distinto.
 *
 * 🔴 `EL_GUION` es la respuesta a todo divisor 0. Se exporta como constante
 * para que sea imposible que una pantalla escriba `0%` y otra `—` para el
 * mismo caso.
 */
import type { Tasa } from '@/shared/calculo/metricas'

export const EL_GUION = '—'

/** `30.4%` — un decimal. Es como está en las tarjetas grandes del mockup. */
export function porcentaje(t: Tasa, decimales = 1): string {
  if (t === null) return EL_GUION
  return `${(t * 100).toFixed(decimales)}%`
}

/** `92%` — entero. Es como está en el embudo y en el ranking. */
export function porcentajeEntero(t: Tasa): string {
  return porcentaje(t, 0)
}

/** `+2.1 pts` / `−1.5 pts`. El menos es U+2212, no un guion. */
export function puntos(d: number | null): string {
  if (d === null) return EL_GUION
  const signo = d > 0 ? '+' : d < 0 ? '−' : ''
  return `${signo}${Math.abs(d).toFixed(1)} pts`
}

/** `$41,400` — sin decimales, con separador de miles. */
export function dinero(cents: number, simbolo = '$'): string {
  return `${simbolo}${Math.round(cents / 100).toLocaleString('en-US')}`
}

/** `$41.4k` — para que entre adentro de una barra. */
export function dineroCorto(cents: number, simbolo = '$'): string {
  const d = Math.round(cents / 100)
  if (Math.abs(d) < 1000) return `${simbolo}${d}`
  return `${simbolo}${(d / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

export function numero(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * `1 cierre` · `5 cierres`.
 *
 * 🔴 El ranking del modo "Día" decía «1 cierres». Un panel que le muestra a
 * alguien su propio día mal escrito se lee como un panel descuidado.
 */
export function plural(n: number, singular: string, plural = `${singular}s`): string {
  return `${numero(n)} ${n === 1 ? singular : plural}`
}

/** Las iniciales de un nombre: `AT` de `Ana Torres`, `MP` de `Marco Pérez`. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function inicialDelDia(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return INICIAL_DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
}

/**
 * `24 de julio` — para hablarle a una persona.
 *
 * 🔴 El aviso de "ya cargaste este día" decía `2026-07-24`: el formato de la
 * base, no el de alguien que termina su día de llamadas.
 */
export function fechaLarga(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]}`
}

/** `Semana 20–26 de julio de 2026` · `Jueves 23 de julio` · `Julio de 2026` */
export function tituloDeVentana(periodo: 'dia' | 'semana' | 'mes', desde: string, hasta: string): string {
  const [a1, m1, d1] = desde.split('-').map(Number)
  const [a2, m2, d2] = hasta.split('-').map(Number)
  if (periodo === 'dia') return `${d1} de ${MESES[m1 - 1]} de ${a1}`
  if (periodo === 'mes') return `${MESES[m1 - 1][0].toUpperCase()}${MESES[m1 - 1].slice(1)} de ${a1}`
  if (m1 === m2 && a1 === a2) return `Semana ${d1}–${d2} de ${MESES[m1 - 1]} de ${a1}`
  return `Semana ${d1} de ${MESES[m1 - 1]} – ${d2} de ${MESES[m2 - 1]} de ${a2}`
}
