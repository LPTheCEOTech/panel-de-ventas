import type { CookieOptions } from '@supabase/ssr'

/**
 * Las reglas de la sesión, sin depender de Next ni de Supabase, para que se
 * puedan probar solas.
 */

/** Las ÚNICAS dos rutas que se ven sin sesión. Si el POST del login exigiera
 *  sesión, no habría forma de conseguir una. */
const RUTAS_PUBLICAS = ['/login', '/api/auth/login']

export function esRutaPublica(ruta: string): boolean {
  return RUTAS_PUBLICAS.includes(ruta)
}

export type CodigoError = 'credenciales' | 'servidor' | 'faltan'

export const MENSAJE_ERROR: Record<CodigoError, string> = {
  // 🔴 Un solo mensaje para "no existe el correo" y "contraseña incorrecta": si
  // fueran distintos, el login sería un detector de qué correos existen.
  credenciales: 'Correo o contraseña incorrectos.',
  servidor: 'No pudimos comprobar tus datos. Es un problema del servidor, no de tu contraseña. Probá de nuevo en un momento.',
  faltan: 'Faltan el correo o la contraseña.',
}

/**
 * A dónde se manda a alguien después de entrar.
 *
 * 🔴 Solo rutas internas. Sin este filtro, `?next=https://otro-sitio` convertiría
 * al login en un redirector abierto: un enlace que parece de la app y termina en
 * una copia que pide la contraseña otra vez.
 */
export function destinoSeguro(next: string | undefined): string {
  if (!next) return '/panel'
  if (!next.startsWith('/') || next.startsWith('//')) return '/panel'
  if (next.startsWith('/login')) return '/panel'
  return next
}

export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * La cookie de sesión.
 *
 * A diferencia de la app de anuncios, ésta NO vive dentro de un iframe: la
 * cookie es `SameSite=Lax`, que es el default seguro y no depende de que el
 * navegador acepte cookies de terceros. (En la otra hubo que forzar
 * `SameSite=None` y quedó un riesgo abierto con Safari; acá no existe.)
 */
export function cookieSegura(opciones: CookieOptions, produccion: boolean): CookieOptions {
  return { ...opciones, sameSite: 'lax', secure: produccion, httpOnly: true, path: '/' }
}
