import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'

const zAjustes = z.object({
  nombreNegocio: z.string().trim().min(1).max(60).optional(),
  iniciales: z.string().trim().min(1).max(2).optional(),
  usuarioNombre: z.string().trim().min(1).max(60).optional(),
  // se valida la forma del hex: un valor cualquiera acá pinta TODA la app
  marca: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'El color va como #RRGGBB').optional(),
  moneda: z.string().trim().min(2).max(5).optional(),
  simbolo: z.string().trim().min(1).max(3).optional(),
  // 🔴 se comprueba contra el propio Intl: una zona mal escrita mandaría los
  // reportes de la noche al día equivocado, y en silencio.
  zonaHoraria: z.string().refine((z0) => {
    try { new Intl.DateTimeFormat('en-CA', { timeZone: z0 }); return true } catch { return false }
  }, 'Esa zona horaria no existe').optional(),
  inicioSemana: z.union([z.literal(0), z.literal(1)]).optional(),
  rankingVisible: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  const p = zAjustes.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  try {
    await datos().guardarConfiguracion(p.data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/ajustes]', e)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
}
