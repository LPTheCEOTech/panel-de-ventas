import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { MENSAJE_CONTRASENA, revisarContrasena } from '@/shared/datos/contrasenas'
import { datos } from '@/shared/datos/indice'
import { soloAdmin } from '@/shared/datos/guardias'
import { clienteServidor } from '@/shared/datos/supabase/cliente'
import { hayCredenciales } from '@/shared/datos/sesion'

/**
 * 🔴 Alta del equipo SIN correo.
 *
 * Antes esto mandaba una invitación con `inviteUserByEmail`. El correo que
 * trae Supabase de fábrica permite 2 mensajes por hora en TODO el proyecto:
 * con un equipo de cuatro vendedores, dos no reciben nada y no hay ningún
 * error — simplemente no llega. Eso fue horas de soporte preguntando «¿por
 * qué no le llegó el mail?».
 *
 * Ahora el admin define la contraseña, la app crea el usuario ya confirmado,
 * y el panel le devuelve un mensaje listo para mandarle al vendedor por
 * donde ya le habla. Cero correos, cero esperas, cero spam.
 *
 * 🔴 El admin único (persona=null) NO se crea desde acá — lo crea el SQL de
 * instalación. Por diseño.
 */
const zAlta = z.object({
  nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
  rol: z.enum(['setter', 'closer', 'ambos']),
  correo: z.string().trim().email('El correo no parece válido').max(254),
  clave: z.string().min(1, 'Ponele una contraseña').max(72),
})

const zBaja = z.object({ id: z.string().min(1).max(64), activo: z.boolean() })

export async function POST(request: NextRequest) {
  const negado = await soloAdmin()
  if (negado) return negado

  const p = zAlta.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const { nombre, rol, correo, clave } = p.data

  const problema = revisarContrasena(clave)
  if (problema) return NextResponse.json({ error: MENSAJE_CONTRASENA[problema] }, { status: 400 })

  if (!hayCredenciales()) {
    return NextResponse.json(
      { error: 'Agregar al equipo requiere Supabase configurado. Corré contra la base real.' },
      { status: 501 }
    )
  }

  const capa = datos()
  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1 · el usuario, ya confirmado. `email_confirm: true` es lo que evita que
  // quede esperando un correo de verificación que nunca va a poder llegar.
  const { data: creado, error: errAuth } = await sb.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
  })
  if (errAuth) {
    if (/already been registered|already exists|duplicate/i.test(errAuth.message)) {
      return NextResponse.json({
        error: `Ya hay alguien con el correo ${correo}. Si es la misma persona y olvidó su contraseña, usá el botón de cambiar contraseña en la lista del equipo.`,
      }, { status: 409 })
    }
    if (/password/i.test(errAuth.message)) {
      return NextResponse.json({ error: 'Supabase rechazó la contraseña. Probá con una más larga.' }, { status: 400 })
    }
    console.error('[api/equipo POST · createUser]', errAuth)
    return NextResponse.json({ error: errAuth.message }, { status: 500 })
  }
  const authUserId = creado?.user?.id
  if (!authUserId) return NextResponse.json({ error: 'No se pudo crear el acceso.' }, { status: 500 })

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
    // 🔴 Deshacer el acceso recién creado. Si quedara suelto, el correo ya
    // estaría «tomado» en Auth y el admin no podría volver a agregar a esa
    // persona: el segundo intento diría «ya hay alguien con ese correo» y
    // no habría forma de salir sin entrar a Supabase a mano.
    await sb.auth.admin.deleteUser(authUserId).catch(() => {})
    console.error('[api/equipo POST · crearUsuario]', e)
    return NextResponse.json({
      error: 'No pude terminar de darle acceso. Probá de nuevo.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nombre, correo, clave, personaId })
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
