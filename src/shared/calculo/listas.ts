/**
 * Las listas de las pantallas de carga (llamadas, reportes de setter, gastos):
 * cómo se ordenan y hasta cuántas filas viajan. Lo usan la API, que contesta
 * cada filtro, y las páginas, que mandan la primera página con la pantalla.
 * Un solo lugar para que las dos no ordenen distinto.
 */
import type { Rango } from './rango'

/** Con «Todo» una lista serían miles de filas: se mandan las más recientes. */
export const TOPE_LISTA = 500

/** Del más nuevo al más viejo. `sort` es estable: dentro de un día queda el orden de carga. */
export function masNuevasPrimero<T extends { fecha: string }>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Lo que viaja de una lista: el rango resuelto, las filas (con tope) y cuántas había. */
export function pagina<T extends { fecha: string }>(rango: Rango, filas: readonly T[]) {
  const ordenadas = masNuevasPrimero(filas)
  return { rango, filas: ordenadas.slice(0, TOPE_LISTA), total: ordenadas.length }
}
