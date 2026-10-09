import { NextResponse } from 'next/server'

import { exigir } from '@/shared/datos/guardias'
import { aplicarPendientes } from '@/shared/datos/migrador'

/**
 * Aplica las actualizaciones de base de datos pendientes. Lo dispara el aviso
 * que ve el admin arriba del panel; el alumno no copia ni pega nada.
 *
 * 🔴 Solo el dueño: es la única acción de la app que ejecuta SQL.
 */
export async function POST(): Promise<NextResponse> {
  const permiso = await exigir('actualizar-base')
  if (permiso instanceof NextResponse) return permiso

  const r = await aplicarPendientes()
  if (!r.ok) return NextResponse.json({ error: r.error, enMigracion: r.enMigracion }, { status: 500 })
  return NextResponse.json({ ok: true, aplicadas: r.aplicadas })
}
