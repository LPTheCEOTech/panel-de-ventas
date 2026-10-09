import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'
import { exigir } from '@/shared/datos/guardias'
import { decidirAccionYo, mismoNombre } from '@/shared/datos/yo-en-el-equipo'

/**
 * 🔴 El dueño entra (o sale) de su propio equipo con SU MISMA cuenta.
 *
 * El id de la persona NO viaja en el cuerpo: sale de la sesión. Así nadie puede
 * ligarse a la persona de otro mandando un id ajeno. Qué hacer lo decide
 * `decidirAccionYo` (testeada); acá solo se lee el estado y se ejecuta.
 *
 * No hay DELETE en ningún camino: «Sin rol de venta» es una baja lógica y la
 * liga se conserva, para que volver a vender no parta su historial en dos.
 */
const zYo = z.object({
  rol: z.enum(['setter', 'closer', 'ambos']).nullable(),
  nombre: z.string().trim().max(80, 'El nombre puede tener hasta 80 letras').optional(),
  ligarExistente: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const permiso = await exigir('sumarse-al-equipo')
  if (permiso instanceof NextResponse) return permiso

  const p = zYo.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const { sesion } = permiso
  if (!sesion) {
    return NextResponse.json(
      { error: 'Para sumarte a tu equipo necesitas entrar con tu cuenta (Supabase configurado).' },
      { status: 501 }
    )
  }

  const capa = datos()
  const personas = await capa.leerPersonas()
  const nombre = p.data.nombre ?? ''
  const otra = nombre ? personas.find((x) => mismoNombre(x.nombre, nombre)) ?? null : null
  const accion = decidirAccionYo(
    {
      propia: sesion.persona,
      mismoNombre: otra,
      mismoNombreTieneAcceso: otra ? !!(await capa.buscarUsuarioPorPersona(otra.id)) : false,
    },
    p.data
  )

  try {
    switch (accion.tipo) {
      case 'error':
        return NextResponse.json({ error: accion.error, confirmar: accion.confirmar }, { status: accion.status })
      case 'nada':
        break
      case 'cambiar':
        if (accion.rol) await capa.cambiarRol(accion.personaId, accion.rol)
        await capa.cambiarActivo(accion.personaId, accion.rol !== null)
        break
      case 'crear': {
        const nueva = await capa.crearPersona(accion.nombre, accion.rol)
        // Si esto fallara, la persona queda sin liga y el reintento entra por
        // «ya hay alguien con ese nombre, ¿eres tú?»: se arregla solo.
        await capa.vincularPersona(sesion.authUserId, nueva.id)
        break
      }
      case 'ligar':
        await capa.vincularPersona(sesion.authUserId, accion.personaId)
        await capa.cambiarRol(accion.personaId, accion.rol)
        await capa.cambiarActivo(accion.personaId, true)
        break
    }
  } catch (e) {
    console.error('[api/equipo/yo]', e)
    const msg = e instanceof Error && /duplicate|unique/i.test(e.message)
      ? 'Ese nombre ya está en uso en el equipo. Usa otro.'
      : 'No se pudo guardar. Prueba de nuevo.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
