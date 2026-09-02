import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * El cliente de servidor, con `service_role`.
 *
 * 🔴 Nunca llega al navegador: todo lo que lo usa está detrás de `server-only`.
 * La `anon key` se usa SOLO para la sesión (ver `shared/datos/sesion.ts`).
 *
 * `persistSession:false` porque acá no hay usuario: es el servidor hablando con
 * la base. Sin esto, el cliente intentaría escribir en un `localStorage` que no
 * existe.
 */
export function clienteServidor(url: string, servicio: string): SupabaseClient {
  return createClient(url, servicio, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
