import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'
import { soloAdmin } from '@/shared/datos/guardias'
import { clienteServidor } from '@/shared/datos/supabase/cliente'
import { hayCredenciales } from '@/shared/datos/sesion'

/**
 * 🔴 Fase C · Invitar por correo desde Equipo.
 *
 * Solo admin. Flow:
 *   1. Zod valida.
 *   2. `sb.auth.admin.inviteUserByEmail(correo)` → Supabase manda el correo
 *      con el link para elegir contraseña y devuelve el authUserId.
 *   3. Se crea (o se reusa) la fila `personas` con ese nombre y rol.
 *   4. Se crea la fila `usuarios` con `rol='miembro'` y el vínculo.
 *
 * 🔴 Requiere SMTP configurado en Supabase. Si no está, Supabase devuelve un
 * error específico que se traduce a un mensaje accionable en vez del bruto.
 */
const zInvitar = z.object({
  correo: z.string().trim().email('El correo no parece válido').max(254),
  nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
  rol: z.enum(['setter', 'closer', 'ambos']),
})

export async function POST(request: NextRequest) {
  const negado = await soloAdmin()
  if (negado) return negado

  if (!hayCredenciales()) {
    return NextResponse.json(
      { error: 'Invitar por correo requiere Supabase configurado. Corré contra la base real.' },
      { status: 501 }
    )
  }

  const p = zInvitar.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const { correo, nombre, rol } = p.data

  const capa = datos()
  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1 · invitación por correo (Supabase manda el mail y crea el auth user)
  const { data: invitacion, error: errInv } = await sb.auth.admin.inviteUserByEmail(correo)
  if (errInv) {
    // el mensaje de Supabase cuando ya existe: "A user with this email address has already been registered"
    if (/already been registered|already exists/i.test(errInv.message)) {
      return NextResponse.json({ error: `Ya invitaste a ${correo}. Chequealo en Supabase → Auth.` }, { status: 409 })
    }
    if (/smtp|email/i.test(errInv.message)) {
      return NextResponse.json({
        error: 'Supabase no pudo mandar el correo. ¿Está SMTP configurado en Auth → SMTP Settings?',
      }, { status: 500 })
    }
    console.error('[api/equipo/invitar] inviteUserByEmail:', errInv)
    return NextResponse.json({ error: errInv.message }, { status: 500 })
  }
  const authUserId = invitacion?.user?.id
  if (!authUserId) return NextResponse.json({ error: 'La invitación no devolvió userId.' }, { status: 500 })

  // 2 · persona: se reusa si existe con ese nombre (case-insensitive por el
  //     indice unico), si no se crea. Si existe con OTRO rol, avisamos y no
  //     tocamos: preferimos que el admin lo resuelva a mano.
  const personas = await capa.leerPersonas()
  const yaHay = personas.find((p) => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())
  let personaId: string
  if (yaHay) {
    if (yaHay.rol !== rol && yaHay.rol !== 'ambos') {
      return NextResponse.json({
        error: `Ya hay una persona "${yaHay.nombre}" con rol "${yaHay.rol}". Cambialo a "ambos" en Equipo primero, o usá otro nombre.`,
      }, { status: 409 })
    }
    personaId = yaHay.id
  } else {
    const nueva = await capa.crearPersona(nombre, rol)
    personaId = nueva.id
  }

  // 3 · fila `usuarios` con rol miembro
  try {
    await capa.crearUsuario(authUserId, personaId, 'miembro')
  } catch (e) {
    console.error('[api/equipo/invitar] crearUsuario:', e)
    return NextResponse.json({
      error: 'La invitación se envió pero no pude vincular el usuario. Chequealo en Supabase.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, correo, personaId })
}
