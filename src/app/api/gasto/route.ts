import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { soloAdmin } from '@/shared/datos/guardias'
import { zConsultaGasto, zGasto } from '../reportes/esquemas'

/** ¿Ya hay un gasto para esa fecha? Alimenta el aviso de reemplazo. */
export async function GET(request: NextRequest) {
  const p = zConsultaGasto.safeParse({
    fecha: request.nextUrl.searchParams.get('fecha'),
  })
  if (!p.success) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })

  const gasto = await datos().buscarGasto(p.data.fecha)
  return NextResponse.json({ gasto })
}

export async function POST(request: NextRequest) {
  // Fase C · gasto es del negocio: solo admin.
  const negado = await soloAdmin()
  if (negado) return negado

  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'El cuerpo no es JSON válido' }, { status: 400 })
  }

  const p = zGasto.safeParse(cuerpo)
  if (!p.success) {
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? 'Faltan datos o alguno no es válido' },
      { status: 400 }
    )
  }

  try {
    // upsert por fecha (PK): reemplaza si el día ya existe. La PK de la base
    // es la que hace imposible que se duplique el día.
    await datos().guardarGasto(p.data)
  } catch (e) {
    console.error('[api/gasto]', e)
    return NextResponse.json({ error: 'No se pudo guardar en la base' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
