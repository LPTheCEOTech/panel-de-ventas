import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { MENSAJE_CONTRASENA, revisarContrasena } from '@/shared/datos/contrasenas'
import { datos } from '@/shared/datos/indice'
import { hayCredenciales } from '@/shared/datos/sesion'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { clienteServidor } from '@/shared/datos/supabase/cliente'

/**
 * Cambiar contraseñas sin pasar por el correo.
 *
 * Dos usos:
 *   · Sin `personaId` → cambio la mía. Cualquiera logueado.
 *   · Con `personaId` → le pongo una nueva a alguien de mi equipo. Solo
 *     admin. Es lo que resuelve «mi vendedor la olvidó» sin depender de un
 *     correo que Supabase probablemente no pueda mandar.
 *
 * 🔴 El admin NO puede cambiarse la contraseña a sí mismo por esta vía
 * indirecta: `personaId` apunta a gente del equipo, y el admin no tiene
 * fila en `personas`. Para la suya usa el primer caso.
 */
const zCambio = z.object({
  clave: z.string().min(1, 'Ponele una contraseña').max(72),
  personaId: z.string().min(1).max(64).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const p = zCambio.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const { clave, personaId } = p.data

  const problema = revisarContrasena(clave)
  if (problema) return NextResponse.json({ error: MENSAJE_CONTRASENA[problema] }, { status: 400 })

  if (!hayCredenciales()) {
    return NextResponse.json({ error: 'Esto necesita Supabase configurado.' }, { status: 501 })
  }

  const sesion = await sesionActual()
  if (!sesion) return NextResponse.json({ error: 'Tenés que estar dentro del panel.' }, { status: 401 })

  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // ¿de quién es la contraseña que se está cambiando?
  let authUserId = sesion.usuario.authUserId
  if (personaId) {
    if (sesion.usuario.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo el admin puede cambiarle la contraseña a otro.' }, { status: 403 })
    }
    const usuario = await datos().buscarUsuarioPorPersona(personaId)
    if (!usuario) {
      return NextResponse.json({ error: 'Esa persona todavía no tiene acceso al panel.' }, { status: 404 })
    }
    authUserId = usuario.authUserId
  }

  const { error } = await sb.auth.admin.updateUserById(authUserId, { password: clave })
  if (error) {
    console.error('[api/contrasena]', error)
    return NextResponse.json({ error: 'No se pudo cambiar la contraseña.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
