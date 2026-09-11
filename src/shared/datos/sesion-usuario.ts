import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { datos } from '@/shared/datos/indice'
import { hayCredenciales } from '@/shared/datos/sesion'
import type { Sesion } from '@/shared/tipos'

/**
 * 🔴 Fase C · resuelve el `Sesion` completo desde Server Components y route
 * handlers.
 *
 * Devuelve `null` cuando:
 *  - no hay credenciales de Supabase (modo demo/dev): la app corre en modo
 *    admin implícito, backwards compat con el estado anterior
 *  - no hay usuario logueado (el proxy debería haber redirigido ya)
 *  - el auth user existe pero no tiene fila en `usuarios` (nuevo invitado
 *    aceptó, pero el admin todavía no lo vinculó — el proxy manda a
 *    `/pendiente`)
 *
 * `getUser()` (no `getSession()`): el segundo confía en la cookie sin verificar
 * la firma contra Auth. Este archivo NO monta un cliente anónimo si no tiene
 * cookies; el que las tiene es Next vía `cookies()`.
 */
export async function sesionActual(): Promise<Sesion | null> {
  if (!hayCredenciales()) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const store = await cookies()

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      // 🔴 Server Components no pueden ESCRIBIR cookies. Si el token expira
      // mientras leemos la sesión, el proxy ya lo habrá rotado antes; acá
      // silenciamos el setAll — Next tira si intentamos cookies.set desde
      // un RSC. El proxy es el único que rota.
      setAll: () => {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const capa = datos()
  const usuario = await capa.buscarUsuario(user.id)
  if (!usuario) return null

  const persona = usuario.personaId
    ? (await capa.leerPersonas()).find((p) => p.id === usuario.personaId) ?? null
    : null

  return {
    authUserId: user.id,
    correo: user.email ?? '',
    usuario,
    persona,
  }
}

/**
 * 🔴 Fase C · Igual que `sesionActual()` pero SIN consultar `usuarios`. Lo usa
 * el proxy para decidir si mandar a /pendiente: si intentara leer `usuarios`
 * con service_role desde el edge/middleware, tendríamos que exponer la
 * service key al runtime del proxy, que corre pegado al request.
 *
 * El proxy solo sabe si hay un auth user o no. La verificación de vinculación
 * la hace el layout `(app)` — que ya corre en Node.js con la capa completa.
 */
