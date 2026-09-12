import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'

/**
 * 🔴 Fase D · endpoint de llamadas granulares.
 *
 * POST   → crea una llamada (personaId sale de la sesión si es miembro).
 * PATCH  → edita una llamada existente.
 * DELETE → baja LÓGICA (activa=false). No hay hard delete.
 *
 * Auth: cualquier usuario logueado con `persona` puede crear/editar/borrar
 * SUS llamadas. Admin puede pasar `personaId` explícito para cargar por otro
 * closer (backfill del primer mes, decisión de C-D).
 */
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha tiene que ser AAAA-MM-DD')
const dineroCents = z.number().int().min(0).max(1_000_000_000)

const zNueva = z.object({
  fecha,
  personaId: z.string().min(1).max(64).optional(),
  leadNombre: z.string().trim().min(2, 'Escribí el nombre del lead').max(80),
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
  asistio: z.boolean().optional(),
  reagendada: z.boolean().optional(),
  cerro: z.boolean().optional(),
  revenueCents: dineroCents.optional(),
  cashCents: dineroCents.optional(),
  nota: z.string().trim().max(500).nullable().optional(),
})

const zBaja = z.object({ id: z.string().min(1).max(64) })

/**
 * Fase C+D · resuelve el `personaId` efectivo: si sos miembro se usa el de la
 * sesión (nunca el del body); si sos admin (o dev sin sesión) se acepta el
 * del body para poder cargar «como» otro closer. Devuelve string o error.
 */
async function resolverPersonaId(pedido: string | undefined): Promise<string | { error: string; status: number }> {
  const sesion = await sesionActual()
  if (sesion?.usuario.rol === 'miembro') {
    if (!sesion.usuario.personaId) return { error: 'Tu usuario no está vinculado a nadie del equipo.', status: 403 }
    return sesion.usuario.personaId
  }
  // admin o dev sin sesión: se necesita `personaId` explícito
  if (!pedido) return { error: 'Falta personaId. El admin tiene que decir por qué closer carga.', status: 400 }
  return pedido
}

export async function POST(request: NextRequest) {
  const p = zNueva.safeParse(await request.json().catch(() => null))
  if (!p.success) {
    return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const personaId = await resolverPersonaId(p.data.personaId)
  if (typeof personaId !== 'string') return NextResponse.json({ error: personaId.error }, { status: personaId.status })

  try {
    const l = await datos().crearLlamada({
      fecha: p.data.fecha, personaId,
      leadNombre: p.data.leadNombre,
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

  // 🔴 Verificamos que la llamada le pertenece a quien edita (o si es admin
  // pasa igual). Sin este chequeo un miembro podría PATCH una llamada ajena.
  const sesion = await sesionActual()
  if (sesion?.usuario.rol === 'miembro') {
    // Fase D · leemos la llamada y comparamos personaId. La capa no tiene un
    // `buscarLlamada(id)` porque el uso normal es por ventana; lo hacemos con
    // una ventana de 3 años atrás — el costo es una consulta por id (indexed).
    const propia = sesion.usuario.personaId
    if (!propia) return NextResponse.json({ error: 'Sin persona vinculada.' }, { status: 403 })
    const halladas = await datos().leerLlamadas({ desde: '2020-01-01', hasta: '2099-12-31' }, propia)
    if (!halladas.some((l) => l.id === p.data.id)) {
      return NextResponse.json({ error: 'Esa llamada no es tuya.' }, { status: 403 })
    }
  }

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

  const sesion = await sesionActual()
  if (sesion?.usuario.rol === 'miembro') {
    const propia = sesion.usuario.personaId
    if (!propia) return NextResponse.json({ error: 'Sin persona vinculada.' }, { status: 403 })
    const halladas = await datos().leerLlamadas({ desde: '2020-01-01', hasta: '2099-12-31' }, propia)
    if (!halladas.some((l) => l.id === p.data.id)) {
      return NextResponse.json({ error: 'Esa llamada no es tuya.' }, { status: 403 })
    }
  }

  try {
    await datos().bajaLogicaLlamada(p.data.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/llamadas DELETE]', e)
    return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
  }
}
