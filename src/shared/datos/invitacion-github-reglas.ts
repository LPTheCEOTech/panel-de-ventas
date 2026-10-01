/**
 * Las reglas de la invitación a GitHub, sin `server-only` ni fetch, para que
 * se puedan probar solas (mismo patrón que `sesion-reglas.ts`).
 */

export type ResultadoInvitacion =
  | { estado: 'invitado' }
  | { estado: 'ya-miembro' }
  | { estado: 'ya-invitado' }
  | { estado: 'no-configurado' }
  | { estado: 'error'; detalle: string }

export type EstadoInvitacion = ResultadoInvitacion['estado']

export const ESTADOS: EstadoInvitacion[] = ['invitado', 'ya-miembro', 'ya-invitado', 'no-configurado', 'error']

/** Lo que ve el alumno en la página según cómo salió. */
export const MENSAJE_INVITACION: Record<EstadoInvitacion, { titulo: string; detalle: string }> = {
  invitado: {
    titulo: 'Listo, revisa tu correo',
    detalle: 'GitHub te mandó una invitación. Abre el mail, haz clic en «Join» y vuelve a la guía para seguir con el paso siguiente. Si no lo ves, mira en spam.',
  },
  'ya-miembro': {
    titulo: 'Ya tienes acceso',
    detalle: 'Este correo ya es miembro. Vuelve a la guía y sigue con el paso siguiente.',
  },
  'ya-invitado': {
    titulo: 'Ya te habíamos invitado',
    detalle: 'La invitación ya está en tu correo. Busca el mail de GitHub (también en spam) y haz clic en «Join».',
  },
  'no-configurado': {
    titulo: 'Este panel no da acceso',
    detalle: 'Esta función solo está activa en el panel de quien te dio la guía. Vuelve a la guía y usa el botón de ahí.',
  },
  error: {
    titulo: 'No pudimos invitarte',
    detalle: 'Es un problema del servidor, no tuyo. Prueba de nuevo en un minuto; si sigue, envíale una captura a quien te dio la guía.',
  },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function correoValido(correo: string): boolean {
  return correo.length <= 254 && EMAIL_RE.test(correo)
}

/**
 * Traduce la respuesta de GitHub a un estado. GitHub devuelve 422 tanto para
 * «ya es miembro» como para «ya está invitado»; se distinguen por el texto.
 */
export function interpretarRespuestaGitHub(status: number, cuerpo: string): ResultadoInvitacion {
  if (status === 201) return { estado: 'invitado' }
  const texto = cuerpo.toLowerCase()
  if (status === 422) {
    if (texto.includes('already a member') || texto.includes('already a part')) return { estado: 'ya-miembro' }
    if (texto.includes('already invited') || texto.includes('pending')) return { estado: 'ya-invitado' }
  }
  return { estado: 'error', detalle: `HTTP ${status}: ${cuerpo.slice(0, 200)}` }
}

export function esEstadoInvitacion(v: string | undefined): v is EstadoInvitacion {
  return ESTADOS.includes(v as EstadoInvitacion)
}
