import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'

const zAlta = z.object({
  nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
  rol: z.enum(['setter', 'closer', 'ambos']),
})

const zBaja = z.object({ id: z.string().min(1).max(64), activo: z.boolean() })

export async function POST(request: NextRequest) {
  const p = zAlta.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  try {
    const persona = await datos().crearPersona(p.data.nombre, p.data.rol)
    return NextResponse.json({ persona })
  } catch (e) {
    // el índice único por nombre es lo que impide dos "Sofía Lara" en el
    // selector; el mensaje tiene que decir eso y no "error 23505".
    const msg = e instanceof Error && /duplicate|unique/i.test(e.message)
      ? 'Ya hay alguien con ese nombre en el equipo.'
      : 'No se pudo agregar. Probá de nuevo.'
    console.error('[api/equipo POST]', e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/** Alta y baja LÓGICA. No hay DELETE: los reportes que cargó tienen que seguir contando. */
export async function PATCH(request: NextRequest) {
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
