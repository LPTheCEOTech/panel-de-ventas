import type { Acceso, Nivel, RolUsuario } from '@/shared/tipos'

/**
 * 🔴 El ÚNICO lugar que decide quién puede qué.
 *
 * Antes había 23 chequeos sueltos, en dos idiomas: unos preguntaban «¿es
 * miembro?» y otros «¿no es admin?». Con dos niveles daba igual; con el
 * manager, cada pantalla habría decidido algo distinto. Ahora las pantallas y
 * las rutas solo PREGUNTAN, y un test frena el gate si aparece un chequeo de
 * rol fuera de este archivo.
 *
 * Puro: sin Next, sin Supabase, sin `server-only`. Lo usan el servidor, el
 * menú (componente de cliente) y los tests.
 */

export type Accion =
  /** El panel completo: gasto, CAC, ranking, todo el equipo. Sin esto, solo lo propio. */
  | 'ver-negocio'
  /** Cargar o editar reportes y llamadas de cualquiera, no solo los propios. */
  | 'cargar-por-otros'
  /** Cargar y leer el gasto del negocio. */
  | 'cargar-gasto'
  /** Entrar a Equipo, dar de alta, cambiar rol de venta y contraseña de los vendedores. */
  | 'gestionar-equipo'
  /** Dar de baja o reactivar a alguien. */
  | 'dar-de-baja'
  /** Hacer o deshacer managers, también desde el alta. */
  | 'marcar-manager'
  /** La fila «Tú» editable: el dueño que también vende. */
  | 'sumarse-al-equipo'
  /** Ajustes y logo. */
  | 'ajustes'
  /** El aviso y el botón de actualizar la base. */
  | 'actualizar-base'

const TODOS: readonly Nivel[] = ['dueno', 'manager', 'vendedor']
const OPERAN: readonly Nivel[] = ['dueno', 'manager']
const DUENO: readonly Nivel[] = ['dueno']

/** La matriz. `sin-acceso` no figura en ninguna fila: no puede nada. */
const PERMISOS: Record<Accion, readonly Nivel[]> = {
  'ver-negocio': OPERAN,
  'cargar-por-otros': OPERAN,
  'cargar-gasto': OPERAN,
  'gestionar-equipo': OPERAN,
  'dar-de-baja': DUENO,
  'marcar-manager': DUENO,
  'sumarse-al-equipo': DUENO,
  'ajustes': DUENO,
  'actualizar-base': DUENO,
}

export function puede(nivel: Nivel, accion: Accion): boolean {
  return PERMISOS[accion].includes(nivel)
}

/** Si una acción es solo del dueño: para que el 403 diga a quién pedírsela. */
export function soloDelDueno(accion: Accion): boolean {
  return !PERMISOS[accion].includes('manager')
}

/** Cualquier nivel que pueda entrar al panel (todos menos `sin-acceso`). */
export function tieneAcceso(nivel: Nivel): boolean {
  return TODOS.includes(nivel)
}

// ---------- la marca de manager ----------

const CLAVE_MARCA = 'panel_rol'
const VALOR_MANAGER = 'manager'

/** 🔴 Exactamente ese string. Si la marca falta, viene mal escrita o con otro
 *  tipo, NO es manager: falla para el lado seguro. */
export function esManager(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== 'object') return false
  return (appMetadata as Record<string, unknown>)[CLAVE_MARCA] === VALOR_MANAGER
}

/** Lo que se le manda a Auth en `app_metadata`. Auth fusiona por clave: no
 *  pisa `provider`/`providers`. */
export function marcaManager(si: boolean): Record<string, string | null> {
  return { [CLAVE_MARCA]: si ? VALOR_MANAGER : null }
}

// ---------- el nivel de quien mira ----------

export interface EntradaNivel {
  /** Su fila de `usuarios`, o null si su cuenta no está vinculada. */
  usuario: { rol: RolUsuario; personaId: string | null } | null
  /** El `app_metadata` de su cuenta de Auth, tal cual. */
  appMetadata: unknown
}

/**
 * En orden; la primera regla que aplica gana.
 *
 * 🔴 La 3 va antes que todo lo que mira la persona: el dueño nunca se queda
 * afuera de su panel por cómo esté su persona.
 */
export function nivelDe(entrada: EntradaNivel | null, hayCredenciales: boolean): Nivel {
  // 1 · modo demo: la app corre como dueño, como siempre
  if (!hayCredenciales) return 'dueno'
  // 2 · sin cuenta o sin fila en `usuarios`
  if (!entrada?.usuario) return 'sin-acceso'
  // 3 · el admin de la base es el dueño
  if (entrada.usuario.rol === 'admin') return 'dueno'
  // 4 · un miembro sin persona no es nadie del equipo (antes veía TODO el negocio)
  if (!entrada.usuario.personaId) return 'sin-acceso'
  // 5 · miembro con la marca
  if (esManager(entrada.appMetadata)) return 'manager'
  // 6 · todo lo demás
  return 'vendedor'
}

// ---------- a quién se toca en Equipo ----------

/** La persona sobre la que se actúa, resuelta EN EL SERVIDOR (nunca lo que
 *  diga el navegador). null = alguien del equipo sin acceso propio. */
export type Objetivo = (Pick<Acceso, 'rol' | 'manager'> & { esYo: boolean }) | null

/** Qué es esa persona: dueño, manager, vendedor, o null si no tiene acceso. */
export function nivelDelObjetivo(o: Objetivo): Exclude<Nivel, 'sin-acceso'> | null {
  if (!o) return null
  if (o.rol === 'admin') return 'dueno'
  return o.manager ? 'manager' : 'vendedor'
}

/**
 * 🔴 Lo que cierra el caso grave: un manager que le cambia la contraseña al
 * dueño se queda con el panel. El dueño toca a todos; el manager solo a los
 * vendedores y a la gente sin acceso, nunca al dueño, a otro manager ni a sí
 * mismo.
 */
export function puedeTocar(nivel: Nivel, o: Objetivo): boolean {
  if (nivel === 'dueno') return true
  if (nivel !== 'manager') return false
  const quien = nivelDelObjetivo(o)
  return quien === null || (quien === 'vendedor' && !o?.esYo)
}

/** Solo un miembro con su propio acceso puede ser manager. El dueño ya lo
 *  puede todo, y alguien sin acceso no tendría con qué entrar. */
export function puedeSerManager(o: Objetivo): boolean {
  const quien = nivelDelObjetivo(o)
  return quien === 'vendedor' || quien === 'manager'
}
