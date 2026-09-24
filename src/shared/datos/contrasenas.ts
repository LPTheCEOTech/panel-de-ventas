/**
 * Las reglas de las contraseñas, sin Supabase ni `server-only`, para que se
 * puedan probar solas (mismo patrón que `sesion-reglas.ts`).
 *
 * 🔴 Por qué el panel maneja contraseñas en vez de mandar correos: el correo
 * que trae Supabase de fábrica permite 2 mensajes por hora en TODO el
 * proyecto. Con un equipo de 4 vendedores, dos se quedan sin invitación y
 * nadie se entera: no hay error, simplemente no llega. Por eso el admin
 * define la contraseña y se la pasa por donde ya habla con su equipo.
 */

export const LARGO_MINIMO = 8

export type ProblemaContrasena = 'corta' | 'comilla' | 'espacios'

export const MENSAJE_CONTRASENA: Record<ProblemaContrasena, string> = {
  corta: `La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`,
  comilla: 'La contraseña no puede llevar comillas simples (\').',
  espacios: 'La contraseña no puede empezar ni terminar con espacios.',
}

/** `null` si sirve; si no, qué le pasa. */
export function revisarContrasena(v: string): ProblemaContrasena | null {
  if (v !== v.trim()) return 'espacios'
  if (v.length < LARGO_MINIMO) return 'corta'
  if (v.includes("'")) return 'comilla'
  return null
}

/**
 * Una contraseña fácil de dictar por teléfono: sin caracteres que se
 * confundan (l/1/I, O/0) y sin símbolos raros. La idea es que el admin se la
 * pase al vendedor por mensaje y que éste la pueda tipear sin errores.
 */
// 🔴 Ninguna sílaba lleva `l`, `o`, `i` mayúscula ni cero: son los caracteres
// que se confunden al dictar por teléfono o al leer de una captura.
const SILABAS = ['ka', 'mi', 'tu', 'sa', 'pi', 'nu', 'ba', 'te', 'fu', 'ra', 'vi', 'me', 'da', 'ke', 'ti', 'na', 'bu', 'se']

export function sugerirContrasena(azar: () => number = Math.random): string {
  const s = () => SILABAS[Math.floor(azar() * SILABAS.length)]
  const n = () => String(2 + Math.floor(azar() * 8)) // 2..9, sin 0 ni 1
  const palabra = s() + s() + s()
  return palabra.charAt(0).toUpperCase() + palabra.slice(1) + n() + n()
}

/** El texto que el admin le manda al vendedor. */
export function mensajeParaElEquipo(nombre: string, url: string, correo: string, clave: string): string {
  return [
    `Hola ${nombre}, ya tenés acceso al panel de ventas.`,
    '',
    `Entrá acá: ${url}`,
    `Correo: ${correo}`,
    `Contraseña: ${clave}`,
    '',
    'Cuando entres podés cambiar la contraseña desde Ajustes.',
  ].join('\n')
}
