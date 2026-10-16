import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { exigir, personaPermitida } from '@/shared/datos/guardias'
import { puede } from '@/shared/datos/permisos'
import { zConsulta, zSetter } from '../esquemas'
import { leerFiltro, masNuevasPrimero, rangoDelFiltro, TOPE_LISTA } from '../filtro'

/**
 * Dos preguntas en la misma ruta:
 *  - `?fecha=&persona=` → ¿ya hay un reporte de esa persona ese día? Alimenta
 *    el aviso de reemplazo.
 *  - el filtro de la lista (`r` | `desde&hasta`, más `persona`) → los reportes
 *    de un período, del más nuevo al más viejo, con el rango resuelto.
 * 🔴 Antes no tenía barrera: un vendedor podía leer el reporte de otro. El
 * vendedor recibe SIEMPRE lo suyo.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const uno = sp.has('fecha') ? zConsulta.safeParse({ fecha: sp.get('fecha'), persona: sp.get('persona') }) : null
  const filtro = uno ? null : leerFiltro(sp)
  if ((uno && !uno.success) || (!uno && !filtro)) {
    return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })
  }

  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso

  if (uno?.success) {
    const persona = personaPermitida(permiso, uno.data.persona)
    if (!persona) return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })
    const reporte = await datos().buscarReporteSetter(uno.data.fecha, persona)
    return NextResponse.json({ reporte })
  }

  const veTodo = puede(permiso.nivel, 'ver-negocio')
  const persona = veTodo ? filtro!.persona : permiso.sesion?.usuario.personaId ?? undefined
  if (!veTodo && !persona) {
    return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })
  }
  try {
    const rango = await rangoDelFiltro(filtro!, 'semana', persona)
    const todos = masNuevasPrimero(await datos().leerReportesSetter(rango, persona))
    return NextResponse.json({ rango, reportes: todos.slice(0, TOPE_LISTA), total: todos.length })
  } catch (e) {
    console.error('[api/reportes/setter GET]', e)
    return NextResponse.json({ error: 'No se pudieron leer los reportes' }, { status: 500 })
  }
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
