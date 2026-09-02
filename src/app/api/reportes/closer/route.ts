import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { zCloser, zConsulta } from '../esquemas'

export async function GET(request: NextRequest) {
  const p = zConsulta.safeParse({
    fecha: request.nextUrl.searchParams.get('fecha'),
    persona: request.nextUrl.searchParams.get('persona'),
  })
  if (!p.success) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })

  const reporte = await datos().buscarReporteCloser(p.data.fecha, p.data.persona)
  return NextResponse.json({ reporte })
}

export async function POST(request: NextRequest) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'El cuerpo no es JSON válido' }, { status: 400 })
  }

  const p = zCloser.safeParse(cuerpo)
  if (!p.success) {
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? 'Faltan datos o alguno no es válido' },
      { status: 400 }
    )
  }

  try {
    await datos().guardarReporteCloser(p.data)
  } catch (e) {
    console.error('[api/reportes/closer]', e)
    return NextResponse.json({ error: 'No se pudo guardar en la base' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
