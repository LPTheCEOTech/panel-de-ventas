import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { exigir, personaPermitida } from '@/shared/datos/guardias'
import { zConsulta, zSetter } from '../esquemas'

/** ¿Ya hay un reporte para esa persona y ese día? Alimenta el aviso de reemplazo. */
export async function GET(request: NextRequest) {
  const p = zConsulta.safeParse({
    fecha: request.nextUrl.searchParams.get('fecha'),
    persona: request.nextUrl.searchParams.get('persona'),
  })
  if (!p.success) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })

  // 🔴 Antes no tenía barrera: un vendedor podía leer el reporte de otro.
  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const persona = personaPermitida(permiso, p.data.persona)
  if (!persona) return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })

  const reporte = await datos().buscarReporteSetter(p.data.fecha, persona)
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

  // 🔴 Fase C · el vendedor carga SIEMPRE como sí mismo: se IGNORA el
  // `personaId` del body (ver `personaPermitida`). El dueño y el manager
  // pueden cargar por cualquiera.
  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const personaId = personaPermitida(permiso, p.data.personaId)
  if (!personaId) return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })
  const datosGuardar = { ...p.data, personaId }

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
