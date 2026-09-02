import 'server-only'

import { capaDemo } from './demo'
import type { CapaDeDatos } from './interfaz'
import { capaSupabase } from './supabase/capa'

/**
 * Qué capa de datos usa la app.
 *
 * 🔴 En producción SIN las variables de entorno, esto TIRA. No cae a la capa
 * demo. Una app en producción mostrando los datos de ejemplo de otro negocio se
 * ve perfecta y es indistinguible de una que funciona: es exactamente la clase
 * de fallo silencioso que ya nos costó días. Que reviente y se lea el motivo.
 */
let capa: CapaDeDatos | null = null

export function datos(): CapaDeDatos {
  if (capa) return capa

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && clave) {
    capa = capaSupabase(url, clave)
    return capa
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
        'Cargalas en las variables de entorno de Vercel y volvé a desplegar SIN caché. ' +
        'Ojo: copialas con el botón Reveal/Copy — si se pegan los caracteres del ' +
        'valor enmascarado, la clave queda rota y el login falla con "error de servidor".'
    )
  }

  // `DEMO_VACIA=1` simula una instalación recién hecha: sin equipo y sin
  // reportes. Es la única forma de validar por foto la primera pantalla que ve
  // un alumno, que es justo la que ningún dato de ejemplo deja ver.
  const vacia = process.env.DEMO_VACIA === '1'
  console.warn(
    `\n⚠️  Sin credenciales de Supabase: corriendo con ${vacia ? 'una BASE VACÍA' : 'la SEMILLA DEL MOCKUP'} en memoria.\n` +
      '   Sirve para construir y validar pantallas. NO prueba que los números salgan de una base.\n'
  )
  capa = capaDemo(vacia)
  return capa
}
