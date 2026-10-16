import 'server-only'

import { z } from 'zod'

import { hoyEn } from '@/shared/calculo/periodo'
import { leerPedido, resolverRango, type Atajo, type Rango } from '@/shared/calculo/rango'
import { datos } from '@/shared/datos/indice'

/**
 * El filtro de las listas de las pantallas de carga (Post Llamada, Reporte
 * Setter, Gasto en publicidad).
 *
 * 🔴 Es la MISMA query que el Panel (`r` | `desde&hasta`, más `persona`): los
 * selectores son los mismos y mandan lo mismo. El rango lo resuelve el
 * servidor, con el hoy del negocio y, para «Todo», la primera fecha cargada.
 */
const zFiltro = z.object({
  r: z.string().max(20).optional(),
  desde: z.string().max(10).optional(),
  hasta: z.string().max(10).optional(),
  persona: z.string().regex(/^[\w-]{1,64}$/).optional(),
})

export type Filtro = z.infer<typeof zFiltro>

/** Con «Todo» una lista serían miles de filas: se mandan las más recientes. */
export const TOPE_LISTA = 500

/** El filtro de la query, o `null` si viene malformado (→ 400). */
export function leerFiltro(sp: URLSearchParams): Filtro | null {
  const crudo = Object.fromEntries(
    (['r', 'desde', 'hasta', 'persona'] as const).flatMap((k) => (sp.get(k) ? [[k, sp.get(k)]] : []))
  )
  const p = zFiltro.safeParse(crudo)
  return p.success ? p.data : null
}

/**
 * El rango que pide el filtro. `persona` es la que YA decidió la barrera (el
 * vendedor siempre es él): de ella sale dónde empieza «Todo».
 */
export async function rangoDelFiltro(f: Filtro, porDefecto: Atajo, persona?: string): Promise<Rango> {
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const pedido = leerPedido(f, config.inicioSemana, porDefecto)
  const primera = 'atajo' in pedido && pedido.atajo === 'todo' ? await capa.primeraFecha(persona) : null
  return resolverRango(pedido, hoyEn(config.zonaHoraria), config.inicioSemana, primera)
}

/** Del más nuevo al más viejo. `sort` es estable: dentro de un día queda el orden de carga. */
export function masNuevasPrimero<T extends { fecha: string }>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => b.fecha.localeCompare(a.fecha))
}
