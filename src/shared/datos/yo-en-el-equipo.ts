import type { Persona, Rol } from '@/shared/tipos'

/**
 * El dueño en su propio equipo: qué hacer cuando un admin elige su rol de venta
 * en la fila «Tú» de Equipo.
 *
 * 🔴 El admin no es un vendedor por defecto (`usuarios.persona_id` NULL, lo
 * crea el SQL de instalación). Si también vende, se le crea una persona y se
 * liga a SU MISMA cuenta: sin otro correo ni otra contraseña. La migración 005
 * ya lo dejó previsto; esto es lo que faltaba.
 *
 * Esta función solo DECIDE; la ruta `/api/equipo/yo` ejecuta. Está separada
 * para poder testear los cinco caminos sin base.
 */
export interface PedidoYo {
  /** null = «Sin rol de venta» */
  rol: Rol | null
  /** Solo la primera vez: el nombre con el que aparece. Ya viene recortado. */
  nombre?: string
  /** Confirmó «sí, esa persona sin acceso soy yo». */
  ligarExistente?: boolean
}

export interface EstadoYo {
  /** La persona ya ligada a su cuenta, si tiene. */
  propia: Persona | null
  /** Una persona del equipo con el mismo nombre que pidió (comparado como la base). */
  mismoNombre: Persona | null
  /** Si esa persona del mismo nombre ya tiene su propio acceso al panel. */
  mismoNombreTieneAcceso: boolean
}

export type AccionYo =
  | { tipo: 'nada' }
  | { tipo: 'cambiar'; personaId: string; rol: Rol | null }
  | { tipo: 'crear'; nombre: string; rol: Rol }
  | { tipo: 'ligar'; personaId: string; rol: Rol }
  | { tipo: 'error'; status: 400 | 409; error: string; confirmar?: true }

export function decidirAccionYo(estado: EstadoYo, pedido: PedidoYo): AccionYo {
  // Ya es parte del equipo: cambiar el rol o darse de baja. La liga NO se
  // borra al quitar el rol: es la que permite volver sin duplicar la persona.
  if (estado.propia) return { tipo: 'cambiar', personaId: estado.propia.id, rol: pedido.rol }

  // Todavía no vende y pide «Sin rol de venta»: no hay nada que hacer.
  if (!pedido.rol) return { tipo: 'nada' }

  const nombre = pedido.nombre?.trim() ?? ''
  if (nombre.length < 2) {
    return { tipo: 'error', status: 400, error: 'Escribe tu nombre (al menos 2 letras).' }
  }

  const otra = estado.mismoNombre
  if (!otra) return { tipo: 'crear', nombre, rol: pedido.rol }

  // 🔴 Nunca se le quita la persona a otra cuenta: partiría su acceso.
  if (estado.mismoNombreTieneAcceso) {
    return { tipo: 'error', status: 409, error: `«${otra.nombre}» ya tiene su propio acceso al panel. Usa otro nombre.` }
  }
  if (!pedido.ligarExistente) {
    return {
      tipo: 'error', status: 409, confirmar: true,
      error: `Ya hay una persona llamada «${otra.nombre}» en el equipo, sin acceso propio. ¿Eres tú?`,
    }
  }
  return { tipo: 'ligar', personaId: otra.id, rol: pedido.rol }
}

/** Igual que el índice único de `personas`: `lower(trim(nombre))`. */
export function mismoNombre(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
