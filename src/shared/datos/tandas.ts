/**
 * Leer TODAS las filas de una consulta, de a tandas.
 *
 * 🔴 PostgREST devuelve como máximo `max-rows` filas por pedido (1000 por
 * defecto en Supabase) y lo hace EN SILENCIO: sin error, sin aviso, con los
 * números cortados. Con el filtro de fechas un rango puede ser «Este año» o
 * «Todo», y un negocio con volumen pasa las 1000 llamadas en pocos meses.
 *
 * Se piden tramos `[desde, hasta]` hasta que uno vuelve con menos filas que el
 * tamaño de la tanda. Eso supone que `max-rows` es 1000 (el valor por
 * defecto): si alguien lo bajara en su proyecto, la primera tanda volvería
 * corta y se cortaría ahí. Los alumnos no tocan esa opción.
 *
 * La consulta que arma cada tanda tiene que tener un ORDEN TOTAL (p. ej.
 * `fecha, id`): sin eso, Postgres puede devolver las filas en otro orden en
 * cada pedido y una tanda repetiría o saltearía filas de la anterior.
 */
export const TANDA = 1000

/** Tope de seguridad: 200 tandas son 200.000 filas. Más que eso es un bucle. */
const MAXIMO_DE_TANDAS = 200

type Respuesta<T> = { data: T[] | null; error: { message: string } | null }

export async function todasLasFilas<T>(
  donde: string,
  pedir: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>,
  tamaño = TANDA
): Promise<T[]> {
  const filas: T[] = []
  for (let i = 0; i < MAXIMO_DE_TANDAS; i++) {
    const { data, error } = await pedir(i * tamaño, (i + 1) * tamaño - 1)
    if (error) throw new Error(`[datos] ${donde}: ${error.message}`)
    const tanda = data ?? []
    filas.push(...tanda)
    if (tanda.length < tamaño) return filas
  }
  throw new Error(`[datos] ${donde}: más de ${MAXIMO_DE_TANDAS * tamaño} filas en un solo período`)
}
