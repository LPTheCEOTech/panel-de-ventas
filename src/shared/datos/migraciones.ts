/**
 * Las actualizaciones de base de datos que el panel sabe aplicarse solo.
 *
 * 🔴 Cómo se agrega una:
 *   1. Poné acá abajo un objeto nuevo con un `id` que nunca se repita
 *      (prefijo numérico creciente) y el SQL.
 *   2. El SQL tiene que ser IDEMPOTENTE (`if not exists`, `on conflict`):
 *      si algo falla a mitad y el alumno vuelve a apretar, no puede romper.
 *   3. El SQL NO puede tener datos del alumno (correo, contraseña, dominio).
 *      Se aplica igual en todos los paneles.
 *   4. Agregá el mismo archivo a `supabase/migraciones/` para que una
 *      instalación nueva desde cero también lo tenga.
 *
 * Las ocho primeras (001 a 008) ya vienen en `docs/todo-en-uno.sql` y el
 * propio SQL las marca como aplicadas, así que no van en esta lista: el
 * panel solo ofrece lo que salió DESPUÉS de la instalación.
 */
export interface Migracion {
  /** Único y estable. Es la llave en `migraciones_aplicadas`. */
  id: string
  /** Lo que se le muestra al alumno en el aviso. Sin jerga. */
  titulo: string
  sql: string
}

export const MIGRACIONES: Migracion[] = [
  // Todavía no hay ninguna posterior a la instalación. La primera va a ser
  // la de alertas a Discord.
]

export function idsDeMigraciones(): string[] {
  return MIGRACIONES.map((m) => m.id)
}

/** Las que están en el código y todavía no figuran en la base. */
export function calcularPendientes(aplicadas: readonly string[]): Migracion[] {
  const ya = new Set(aplicadas)
  return MIGRACIONES.filter((m) => !ya.has(m.id))
}

/** 🔴 Dos migraciones con el mismo id harían que la segunda nunca se aplique. */
export function idsDuplicados(): string[] {
  const vistos = new Set<string>()
  const repetidos: string[] = []
  for (const m of MIGRACIONES) {
    if (vistos.has(m.id)) repetidos.push(m.id)
    vistos.add(m.id)
  }
  return repetidos
}
