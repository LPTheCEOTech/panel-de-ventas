/**
 * El «Día por día» del Panel: una fila por día del período, con lo que reportó
 * el equipo ese día. Es la planilla que el manager armaba a mano para ver
 * cuántas se agendaron y cuántas se hicieron cada día.
 *
 * 🔴 Derivado, nunca guardado. Sale de los mismos reportes que los totales de
 * arriba, así que la suma de las filas TIENE que dar esos totales (hay test).
 */
import type { ReporteCloser, ReporteSetter, Ventana } from '@/shared/tipos'
import { dentro, sumarDias } from './periodo'

export interface FilaDia {
  fecha: string
  /** Las que los setters reservaron ese día (no las llamadas de ese día). */
  agendas: number
  llamadas: number
  asistieron: number
  cierres: number
  cashCents: number
}

/**
 * Las filas, de la más reciente a la más vieja, **hasta hoy**: «Este mes»
 * incluye días que todavía no pasaron y una fila en cero para el 28 cuando es
 * 15 diría «nadie reportó» de algo que no ocurrió. Los días pasados en cero sí
 * salen: que nadie cargó nada también es dato.
 */
export function diaPorDia(
  v: Ventana,
  hoy: string,
  setters: readonly ReporteSetter[],
  closers: readonly ReporteCloser[]
): FilaDia[] {
  const hasta = v.hasta < hoy ? v.hasta : hoy
  if (hasta < v.desde) return []

  const porFecha = new Map<string, FilaDia>()
  for (let d = hasta; d >= v.desde; d = sumarDias(d, -1)) {
    porFecha.set(d, { fecha: d, agendas: 0, llamadas: 0, asistieron: 0, cierres: 0, cashCents: 0 })
  }
  for (const r of setters) {
    const f = dentro(r.fecha, v) ? porFecha.get(r.fecha) : undefined
    if (f) f.agendas += r.agendas
  }
  for (const r of closers) {
    const f = dentro(r.fecha, v) ? porFecha.get(r.fecha) : undefined
    if (!f) continue
    f.llamadas += r.llamadas
    f.asistieron += r.asistieron
    f.cierres += r.cierres
    f.cashCents += r.cashCents
  }
  return [...porFecha.values()]
}

/** Un día sin nada cargado: se dibuja apagado y no se abre. */
export function diaVacio(f: FilaDia): boolean {
  return f.agendas === 0 && f.llamadas === 0 && f.cashCents === 0
}
