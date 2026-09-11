import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { zConsulta, zSetter } from '../esquemas'

/** ¿Ya hay un reporte para esa persona y ese día? Alimenta el aviso de reemplazo. */
export async function GET(request: NextRequest) {
  const p = zConsulta.safeParse({
    fecha: request.nextUrl.searchParams.get('fecha'),
    persona: request.nextUrl.searchParams.get('persona'),
  })
  if (!p.success) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })

  const reporte = await datos().buscarReporteSetter(p.data.fecha, p.data.persona)
  return NextResponse.json({ reporte })
}

export async function POST(request: NextRequest) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'El cuerpo no es JSON válido' }, { status: 400 })
  }

  const p = zSetter.safeParse(cuerpo)
  if (!p.success) {
    return NextResponse.json(
      { error: p.error.issues[0]?.message ?? 'Faltan datos o alguno no es válido' },
      { status: 400 }
    )
  }

  // 🔴 Fase C · si es miembro se IGNORA el `personaId` del body y se usa el
  // de la sesión. Nunca hay que confiar en lo que dice el navegador cuando la
  // barrera es de autorización — un curl a mano con `personaId` ajeno tiene
  // que caer del lado seguro.
  const sesion = await sesionActual()
  const datosGuardar =
    sesion?.usuario.rol === 'miembro'
      ? (sesion.usuario.personaId
          ? { ...p.data, personaId: sesion.usuario.personaId }
          : null)
      : p.data
  if (!datosGuardar) return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })

  try {
    // upsert: si el día ya existe se reemplaza. La restricción única de la base
    // es la que hace imposible que se duplique.
    await datos().guardarReporteSetter(datosGuardar)
  } catch (e) {
    console.error('[api/reportes/setter]', e)
    return NextResponse.json({ error: 'No se pudo guardar en la base' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
