import 'server-only'
import {
  createClient,
  type RealtimeClientOptions,
  type SupabaseClient,
} from '@supabase/supabase-js'

type TransportRealtime = NonNullable<RealtimeClientOptions['transport']>

/**
 * 🔴 Esta app NO usa Realtime. Ni un canal, ni una suscripción: son lecturas por
 * PostgREST desde el servidor y nada más.
 *
 * Pero `createClient()` construye un `RealtimeClient` en su CONSTRUCTOR, y ese
 * constructor hace `options.transport ?? getWebSocketConstructor()`. Node 20 no
 * trae `WebSocket` global, así que sin un `transport` **tira al crear el
 * cliente** — antes de leer una sola fila. Rompe `npm run dev` y cualquier
 * script, aunque Realtime no se toque nunca.
 *
 * 🔴 Y en Vercel NO se ve, porque ahí el default es Node 24, que sí lo trae.
 * Falla en la máquina de quien desarrolla y no en producción: es exactamente
 * la forma de fallo que hace perder una tarde.
 *
 * Se declara la intención en vez de tapar el síntoma: un transport que existe
 * para no ser usado, y que si alguien lo usa lo dice con todas las letras.
 */
const SIN_REALTIME = class {
  constructor() {
    throw new Error(
      'El Panel de Ventas no usa Realtime. Si hiciera falta, hay que elegir un ' +
        'transport de verdad en shared/datos/supabase/cliente.ts.'
    )
  }
} as unknown as TransportRealtime

/**
 * El cliente de servidor, con `service_role`.
 *
 * 🔴 `server-only`: si alguien lo importa desde un componente de cliente, el
 * build FALLA. Es la barrera que impide que la clave llegue al navegador.
 *
 * `persistSession:false` porque acá no hay usuario: es el servidor hablando con
 * la base. Sin esto intentaría persistir una sesión que no existe.
 */
export function clienteServidor(url: string, servicio: string): SupabaseClient {
  return createClient(url, servicio, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: SIN_REALTIME },
  })
}
