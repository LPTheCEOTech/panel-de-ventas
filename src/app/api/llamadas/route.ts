import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'
import { exigir, personaPermitida, type Permiso } from '@/shared/datos/guardias'
import { puede } from '@/shared/datos/permisos'
import { zConsultaLlamadas } from '../reportes/esquemas'
import { pagina } from '@/shared/calculo/listas'
import { leerFiltro, rangoDelFiltro } from '../reportes/filtro'

/**
 * 🔴 Fase D · endpoint de llamadas granulares.
 *
 * GET    → las de un día o las de un período (ver abajo quién recibe qué).
 * POST   → crea una llamada (personaId sale de la sesión si es miembro).
 * PATCH  → edita una llamada existente.
 * DELETE → baja LÓGICA (activa=false). No hay hard delete.
 *
 * Auth: cualquier usuario logueado con `persona` puede crear/editar/borrar
 * SUS llamadas. El dueño y el manager pasan `personaId` explícito para cargar
 * por otro closer (backfill del primer mes, decisión de C-D).
 */
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha tiene que ser AAAA-MM-DD')
const dineroCents = z.number().int().min(0).max(1_000_000_000)
// 🔴 Sesión 3 · origen del lead. Enum estricto sin default; el form obliga a
// elegir uno antes de habilitar Guardar, así que llegar acá sin el campo es
// error del cliente y devolvemos el mensaje que ve el closer.
const zOrigen = z.enum(['organico', 'anuncios', 'referidos'], {
  error: 'Elige de dónde vino el lead',
})

const zNueva = z.object({
  fecha,
  personaId: z.string().min(1).max(64).optional(),
  leadNombre: z.string().trim().min(2, 'Escribe el nombre del lead').max(80),
  origenLead: zOrigen,
  asistio: z.boolean(),
  reagendada: z.boolean(),
  cerro: z.boolean(),
  revenueCents: dineroCents,
  cashCents: dineroCents,
  nota: z.string().trim().max(500).nullable().optional(),
})

const zCambios = z.object({
  id: z.string().min(1).max(64),
  leadNombre: z.string().trim().min(2).max(80).optional(),
  origenLead: zOrigen.optional(),
  asistio: z.boolean().optional(),
  reagendada: z.boolean().optional(),
  cerro: z.boolean().optional(),
  revenueCents: dineroCents.optional(),
  cashCents: dineroCents.optional(),
  nota: z.string().trim().max(500).nullable().optional(),
})

const zBaja = z.object({ id: z.string().min(1).max(64) })

/**
 * 🔴 Quien no puede cargar por otros (el vendedor) solo toca SUS llamadas.
 * La capa no tiene un `buscarLlamada(id)` porque el uso normal es por
 * ventana; se busca con una ventana amplia filtrada por su persona — una
 * consulta indexada. null = puede seguir; si no, el 403.
 */
async function soloLasSuyas(permiso: Permiso, id: string): Promise<NextResponse | null> {
  if (puede(permiso.nivel, 'cargar-por-otros')) return null
  const propia = permiso.sesion?.usuario.personaId
  if (!propia) return NextResponse.json({ error: 'Sin persona vinculada.' }, { status: 403 })
  const halladas = await datos().leerLlamadas({ desde: '2020-01-01', hasta: '2099-12-31' }, propia)
  if (!halladas.some((l) => l.id === id)) {
    return NextResponse.json({ error: 'Esa llamada no es tuya.' }, { status: 403 })
  }
  return null
}

/**
 * Leer llamadas, en dos formas:
 *  - `?fecha=` → las de UN día. La usan el formulario de Post Llamada (card
 *    lateral y aviso de lead) y el Día por día del Panel (al abrir un día).
 *  - el filtro de la lista (`r` | `desde&hasta`, más `persona`) → las de un
 *    período, de la más nueva a la más vieja, con tope. Responde el rango
 *    resuelto para que el botón de fechas diga lo que se está viendo.
 *
 * 🔴 La barrera es la misma de siempre: el dueño y el manager piden a quien
 * quieran (o a todo el equipo, sin `persona`); el vendedor recibe SIEMPRE lo
 * suyo, diga lo que diga la URL. Un curl con el id de otro cae del lado seguro.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const dia = sp.has('fecha')
    ? zConsultaLlamadas.safeParse({ fecha: sp.get('fecha'), persona: sp.get('persona') || undefined })
    : null
  const filtro = dia ? null : leerFiltro(sp)
  if ((dia && !dia.success) || (!dia && !filtro)) {
    return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })
  }

  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const veTodo = puede(permiso.nivel, 'ver-negocio')
  const pedida = dia?.success ? dia.data.persona : filtro?.persona
  const persona = veTodo ? pedida : permiso.sesion?.usuario.personaId ?? undefined
  if (!veTodo && !persona) {
    return NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })
  }

  try {
    if (dia?.success) {
      const llamadas = await datos().leerLlamadas({ desde: dia.data.fecha, hasta: dia.data.fecha }, persona)
      return NextResponse.json({ llamadas })
    }
    const rango = await rangoDelFiltro(filtro!, 'semana', persona)
    const p = pagina(rango, await datos().leerLlamadas(rango, persona))
    return NextResponse.json({ rango, llamadas: p.filas, total: p.total })
  } catch (e) {
    console.error('[api/llamadas GET]', e)
    return NextResponse.json({ error: 'No se pudieron leer las llamadas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const p = zNueva.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  // Fase C+D · el vendedor carga como sí mismo (nunca el id del body); el
  // dueño y el manager tienen que decir por qué closer cargan.
  const personaId = personaPermitida(permiso, p.data.personaId)
  if (!personaId) {
    return puede(permiso.nivel, 'cargar-por-otros')
      ? NextResponse.json({ error: 'Falta personaId. Hay que decir por qué closer se carga.' }, { status: 400 })
      : NextResponse.json({ error: 'Tu usuario no está vinculado a nadie del equipo.' }, { status: 403 })
  }

  try {
    const l = await datos().crearLlamada({
      fecha: p.data.fecha, personaId,
      leadNombre: p.data.leadNombre,
      origenLead: p.data.origenLead,
      asistio: p.data.asistio, reagendada: p.data.reagendada, cerro: p.data.cerro,
      revenueCents: p.data.revenueCents, cashCents: p.data.cashCents,
      nota: p.data.nota ?? null,
    })
    return NextResponse.json({ llamada: l })
  } catch (e) {
    console.error('[api/llamadas POST]', e)
    return NextResponse.json({ error: 'No se pudo guardar la llamada' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const p = zCambios.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // 🔴 Sin este chequeo un vendedor podría editar una llamada ajena.
  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const ajena = await soloLasSuyas(permiso, p.data.id)
  if (ajena) return ajena

  const { id, ...cambios } = p.data
  try {
    await datos().actualizarLlamada(id, cambios)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/llamadas PATCH]', e)
    return NextResponse.json({ error: 'No se pudo editar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const p = zBaja.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const permiso = await exigir()
  if (permiso instanceof NextResponse) return permiso
  const ajena = await soloLasSuyas(permiso, p.data.id)
  if (ajena) return ajena

  try {
    await datos().bajaLogicaLlamada(p.data.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/llamadas DELETE]', e)
    return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
  }
}
