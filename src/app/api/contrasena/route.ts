import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { MENSAJE_CONTRASENA, revisarContrasena } from '@/shared/datos/contrasenas'
import { datos } from '@/shared/datos/indice'
import { exigir } from '@/shared/datos/guardias'
import { puede, puedeTocar } from '@/shared/datos/permisos'
import { hayCredenciales } from '@/shared/datos/sesion'
import { clienteServidor } from '@/shared/datos/supabase/cliente'

/**
 * Cambiar contraseñas sin pasar por el correo.
 *
 * Dos usos:
 *   · Sin `personaId` → cambio la mía. Cualquiera logueado.
 *   · Con `personaId` → le pongo una nueva a alguien de mi equipo. El dueño
 *     a cualquiera; el manager solo a los vendedores. Es lo que resuelve «mi
 *     vendedor la olvidó» sin depender de un correo que Supabase
 *     probablemente no pueda mandar.
 *
 * 🔴 A quién se le cambia se resuelve ACÁ, con la base, nunca con lo que diga
 * el navegador: un manager que le cambia la contraseña al dueño se queda con
 * el panel.
 *
 * 🔴 El admin NO puede cambiarse la contraseña a sí mismo por esta vía
 * indirecta: `personaId` apunta a gente del equipo, y el admin no tiene
 * fila en `personas`. Para la suya usa el primer caso.
 */
const zCambio = z.object({
  clave: z.string().min(1, 'Ponle una contraseña').max(72),
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

  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const { sesion, nivel } = permiso
  if (!sesion) return NextResponse.json({ error: 'Tienes que estar dentro del panel.' }, { status: 401 })

  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // ¿de quién es la contraseña que se está cambiando?
  let authUserId = sesion.usuario.authUserId
  if (personaId) {
    if (!puede(nivel, 'gestionar-equipo')) {
      return NextResponse.json({ error: 'Solo el dueño o un manager pueden cambiarle la contraseña a otro.' }, { status: 403 })
    }
    const acceso = await datos().buscarAcceso(personaId)
    if (!acceso) {
      return NextResponse.json({ error: 'Esa persona todavía no tiene acceso al panel.' }, { status: 404 })
    }
    if (!puedeTocar(nivel, { ...acceso, esYo: acceso.authUserId === sesion.authUserId })) {
      return NextResponse.json({ error: 'A esta persona solo le puede cambiar la contraseña el dueño del panel.' }, { status: 403 })
    }
    authUserId = acceso.authUserId
  }

  const { error } = await sb.auth.admin.updateUserById(authUserId, { password: clave })
  if (error) {
    console.error('[api/contrasena]', error)
    return NextResponse.json({ error: 'No se pudo cambiar la contraseña.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
