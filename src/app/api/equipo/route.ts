import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'
import { soloAdmin } from '@/shared/datos/guardias'
import { clienteServidor } from '@/shared/datos/supabase/cliente'
import { hayCredenciales } from '@/shared/datos/sesion'

/**
 * 🔴 Fase A (sesion 2) · Alta e invitación en UN SOLO flujo.
 *
 * El correo es obligatorio: al dar de alta a alguien SIEMPRE se le manda la
 * invitación por correo (Supabase Auth) y se lo vincula a la persona nueva
 * (o existente) con rol miembro. Ya no hay «crear persona sin login» ni
 * «invitar por correo» como caminos separados: eran dos formas de hacer lo
 * mismo mal.
 *
 * 🔴 El admin único (persona=null) NO se crea desde acá — sigue viviendo
 * solo en `scripts/instalar.mjs`. Por diseño.
 */
const zAlta = z.object({
  nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
  rol: z.enum(['setter', 'closer', 'ambos']),
  correo: z.string().trim().email('El correo no parece válido').max(254),
})

const zBaja = z.object({ id: z.string().min(1).max(64), activo: z.boolean() })

export async function POST(request: NextRequest) {
  const negado = await soloAdmin()
  if (negado) return negado

  const p = zAlta.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const { nombre, rol, correo } = p.data

  if (!hayCredenciales()) {
    return NextResponse.json(
      { error: 'Agregar al equipo requiere Supabase configurado. Corré contra la base real.' },
      { status: 501 }
    )
  }

  const capa = datos()
  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1 · invitación por correo (Supabase manda el mail y crea el auth user)
  const { data: invitacion, error: errInv } = await sb.auth.admin.inviteUserByEmail(correo)
  if (errInv) {
    if (/already been registered|already exists/i.test(errInv.message)) {
      return NextResponse.json({ error: `Ya invitaste a ${correo}. Chequealo en Supabase → Auth.` }, { status: 409 })
    }
    if (/smtp|email/i.test(errInv.message)) {
      return NextResponse.json({
        error: 'Supabase no pudo mandar el correo. ¿Está SMTP configurado en Auth → SMTP Settings?',
      }, { status: 500 })
    }
    console.error('[api/equipo POST · inviteUserByEmail]', errInv)
    return NextResponse.json({ error: errInv.message }, { status: 500 })
  }
  const authUserId = invitacion?.user?.id
  if (!authUserId) return NextResponse.json({ error: 'La invitación no devolvió userId.' }, { status: 500 })

  // 2 · persona: reusar si existe con ese nombre (case-insensitive), si no crear.
  // Si existe con OTRO rol distinto de 'ambos', avisamos y no tocamos.
  let personaId: string
  try {
    const personas = await capa.leerPersonas()
    const yaHay = personas.find((x) => x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())
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
  } catch (e) {
    const msg = e instanceof Error && /duplicate|unique/i.test(e.message)
      ? 'Ya hay alguien con ese nombre en el equipo.'
      : 'No se pudo crear la persona.'
    console.error('[api/equipo POST · persona]', e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 3 · fila `usuarios` con rol miembro
  try {
    await capa.crearUsuario(authUserId, personaId, 'miembro')
  } catch (e) {
    console.error('[api/equipo POST · crearUsuario]', e)
    return NextResponse.json({
      error: 'La invitación se envió pero no pude vincular el usuario. Chequealo en Supabase.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, correo, personaId, invitado: true })
}

/** Alta y baja LÓGICA. No hay DELETE: los reportes que cargó tienen que seguir contando. */
export async function PATCH(request: NextRequest) {
  const negado = await soloAdmin()
  if (negado) return negado
  const p = zBaja.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  try {
    await datos().cambiarActivo(p.data.id, p.data.activo)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/equipo PATCH]', e)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
}
