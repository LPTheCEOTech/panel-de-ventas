import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { MENSAJE_CONTRASENA, revisarContrasena } from '@/shared/datos/contrasenas'
import { datos } from '@/shared/datos/indice'
import { exigir } from '@/shared/datos/guardias'
import { marcaManager, puede, puedeSerManager, puedeTocar, type Objetivo } from '@/shared/datos/permisos'
import { clienteServidor } from '@/shared/datos/supabase/cliente'
import { hayCredenciales } from '@/shared/datos/sesion'
import { mismoNombre } from '@/shared/datos/yo-en-el-equipo'
import type { Acceso, Rol } from '@/shared/tipos'

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
 *
 * 🔴 «Manager» es un rol más del select, pero SOLO lo puede elegir el dueño.
 * En la base es un `miembro` cuya persona es «Setter y closer» (así carga lo
 * suyo en cualquiera de los dos formularios, si también vende) y cuya cuenta
 * de Auth lleva la marca. `manager` nunca se escribe en `personas.rol`: el
 * enum de la base no lo tiene, y agregarlo es el SQL que evitamos.
 */
const ROLES = ['setter', 'closer', 'ambos', 'manager'] as const
const ventaDe = (rol: (typeof ROLES)[number]): Rol => (rol === 'manager' ? 'ambos' : rol)

const zAlta = z.object({
  nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
  rol: z.enum(ROLES),
  correo: z.string().trim().email('El correo no parece válido').max(254),
  clave: z.string().min(1, 'Ponle una contraseña').max(72),
})

/**
 * 🔴 Un solo PATCH para los dos cambios que se le hacen a alguien del equipo:
 * darlo de baja/alta, y cambiarle el rol. Van juntos porque son la misma
 * operación —editar la ficha— y separarlos en dos rutas obligaría al front a
 * elegir endpoint por campo.
 *
 * Cambiar el rol hacía falta y no estaba: a un setter que pasaba a closer
 * había que darlo de baja y volver a crearlo, y al recrearlo chocaba con «ya
 * hay alguien con ese correo». Quedaba trabado sin salida.
 */
const zBaja = z.object({
  id: z.string().min(1).max(64),
  activo: z.boolean().optional(),
  rol: z.enum(ROLES).optional(),
}).refine((d) => d.activo !== undefined || d.rol !== undefined, {
  message: 'No hay nada que cambiar',
})

export async function POST(request: NextRequest) {
  const permiso = await exigir('gestionar-equipo')
  if (permiso instanceof NextResponse) return permiso

  const p = zAlta.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const { nombre, rol, correo, clave } = p.data
  const esManager = rol === 'manager'
  if (esManager && !puede(permiso.nivel, 'marcar-manager')) {
    return NextResponse.json({ error: 'Solo el dueño del panel puede agregar managers.' }, { status: 403 })
  }

  const problema = revisarContrasena(clave)
  if (problema) return NextResponse.json({ error: MENSAJE_CONTRASENA[problema] }, { status: 400 })

  if (!hayCredenciales()) {
    return NextResponse.json(
      { error: 'Agregar al equipo requiere Supabase configurado. Corre contra la base real.' },
      { status: 501 }
    )
  }

  const capa = datos()

  // 🔴 Antes de crear el acceso: si ese nombre ya es de alguien con su propio
  // acceso (un miembro, o el dueño que se sumó a su equipo), el alta chocaría
  // al final con el índice único y el error no explicaría nada.
  const conEseNombre = (await capa.leerPersonas()).find((x) => mismoNombre(x.nombre, nombre))
  if (conEseNombre && (await capa.buscarUsuarioPorPersona(conEseNombre.id))) {
    return NextResponse.json({
      error: `«${conEseNombre.nombre}» ya tiene acceso al panel. Si es otra persona, agrégala con otro nombre.`,
    }, { status: 409 })
  }
  // 🔴 Antes esto se chequeaba DESPUÉS de crear la cuenta: el 409 dejaba el
  // correo tomado en Auth y el segundo intento decía «ya hay alguien con ese
  // correo». Un manager reusa la persona y la pasa a «Setter y closer».
  if (conEseNombre && !esManager && conEseNombre.rol !== rol && conEseNombre.rol !== 'ambos') {
    return NextResponse.json({
      error: `Ya hay una persona "${conEseNombre.nombre}" con rol "${conEseNombre.rol}". Cámbialo a "ambos" en Equipo primero, o usa otro nombre.`,
    }, { status: 409 })
  }

  const sb = clienteServidor(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1 · el usuario, ya confirmado. `email_confirm: true` es lo que evita que
  // quede esperando un correo de verificación que nunca va a poder llegar.
  // Un manager nace con la marca: sin una segunda escritura que pueda fallar.
  const { data: creado, error: errAuth } = await sb.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    ...(esManager ? { app_metadata: marcaManager(true) } : {}),
  })
  if (errAuth) {
    if (/already been registered|already exists|duplicate/i.test(errAuth.message)) {
      return NextResponse.json({
        // 🔴 Los dos motivos reales por los que alguien intenta crear de nuevo a
        // una persona que ya existe: se le olvidó la contraseña, o le quedó mal
        // el rol. El segundo mandaba a dar de baja y volver a crear, que
        // terminaba justo acá, en este error, sin salida.
        error:
          `Ya hay alguien con el correo ${correo}. Si es la misma persona: ` +
          `para cambiarle el rol, toca su etiqueta (Setter / Closer) en la lista del equipo; ` +
          `si olvidó su contraseña, usa el botón «Contraseña» de esa misma fila.`,
      }, { status: 409 })
    }
    if (/password/i.test(errAuth.message)) {
      return NextResponse.json({ error: 'Supabase rechazó la contraseña. Prueba con una más larga.' }, { status: 400 })
    }
    console.error('[api/equipo POST · createUser]', errAuth)
    return NextResponse.json({ error: errAuth.message }, { status: 500 })
  }
  const authUserId = creado?.user?.id
  if (!authUserId) return NextResponse.json({ error: 'No se pudo crear el acceso.' }, { status: 500 })

  // 2 · persona: reusar si existe con ese nombre (case-insensitive), si no
  // crear. El rol ya se validó antes de crear la cuenta.
  let personaId: string
  try {
    if (conEseNombre) {
      personaId = conEseNombre.id
      if (esManager && conEseNombre.rol !== 'ambos') await capa.cambiarRol(personaId, 'ambos')
    } else {
      const nueva = await capa.crearPersona(nombre, ventaDe(rol))
      personaId = nueva.id
    }
  } catch (e) {
    // Mismo motivo que abajo: sin deshacer, el correo queda tomado en Auth.
    await sb.auth.admin.deleteUser(authUserId).catch(() => {})
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
      error: 'No pude terminar de darle acceso. Prueba de nuevo.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nombre, correo, clave, personaId })
}

/** Pasa a alguien a Manager, o devuelve el 409 que explica por qué no. */
async function hacerManager(id: string, acceso: Acceso | null, objetivo: Objetivo): Promise<NextResponse | null> {
  const capa = datos()
  if (!acceso) {
    return NextResponse.json({
      error: 'Para ser manager necesita su propio acceso al panel. Créaselo en «Agregar al equipo».',
    }, { status: 409 })
  }
  if (!puedeSerManager(objetivo)) {
    return NextResponse.json({ error: 'El dueño ya puede hacer todo lo de un manager.' }, { status: 409 })
  }
  if (!(await capa.leerPersonas()).find((x) => x.id === id)?.activo) {
    return NextResponse.json({ error: 'Reactívalo primero.' }, { status: 409 })
  }
  // Primero el rol de venta, después la marca: si la marca fallara, queda
  // como «Setter y closer», que es el lado seguro.
  await capa.cambiarRol(id, 'ambos')
  await capa.marcarManager(acceso.authUserId, true)
  return null
}

/**
 * Alta y baja LÓGICA, rol de venta y Manager. No hay DELETE: los reportes que
 * cargó tienen que seguir contando.
 *
 * 🔴 A quién se toca se resuelve ACÁ, con la base, nunca con lo que mande el
 * navegador. El manager cambia el rol de venta y la contraseña de los
 * vendedores; dar de baja y hacer o deshacer managers es del dueño.
 */
export async function PATCH(request: NextRequest) {
  const permiso = await exigir('gestionar-equipo')
  if (permiso instanceof NextResponse) return permiso
  const p = zBaja.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { id, activo, rol } = p.data
  const { nivel, sesion } = permiso

  try {
    const capa = datos()
    const acceso = await capa.buscarAcceso(id)
    const objetivo = acceso ? { ...acceso, esYo: acceso.authUserId === sesion?.authUserId } : null
    const negado = (error: string) => NextResponse.json({ error }, { status: 403 })

    if (!puedeTocar(nivel, objetivo)) return negado('A esta persona solo la puede cambiar el dueño del panel.')
    if (activo !== undefined && !puede(nivel, 'dar-de-baja')) {
      return negado('Dar de baja o reactivar solo lo puede hacer el dueño del panel.')
    }
    if ((rol === 'manager' || (rol !== undefined && acceso?.manager)) && !puede(nivel, 'marcar-manager')) {
      return negado('Solo el dueño del panel puede hacer o deshacer managers.')
    }

    if (rol === 'manager') {
      const choca = await hacerManager(id, acceso, objetivo)
      if (choca) return choca
    } else if (rol !== undefined) {
      // Deshacer un manager: primero se le quita el privilegio, después el resto.
      if (acceso?.manager) await capa.marcarManager(acceso.authUserId, false)
      await capa.cambiarRol(id, rol)
    }

    if (activo !== undefined) {
      // 🔴 La baja de un manager le quita la marca: si se lo reactiva, vuelve
      // como vendedor y el dueño elige Manager de nuevo si quiere.
      if (!activo && acceso?.manager) await capa.marcarManager(acceso.authUserId, false)
      await capa.cambiarActivo(id, activo)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/equipo PATCH]', e)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
}
