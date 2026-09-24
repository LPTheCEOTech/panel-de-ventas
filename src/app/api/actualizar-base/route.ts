import { NextResponse } from 'next/server'

import { soloAdmin } from '@/shared/datos/guardias'
import { aplicarPendientes } from '@/shared/datos/migrador'

/**
 * Aplica las actualizaciones de base de datos pendientes. Lo dispara el aviso
 * que ve el admin arriba del panel; el alumno no copia ni pega nada.
 *
 * 🔴 Solo admin: es la única acción de la app que ejecuta SQL.
 */
export async function POST(): Promise<NextResponse> {
  const negado = await soloAdmin()
  if (negado) return negado

  const r = await aplicarPendientes()
  if (!r.ok) return NextResponse.json({ error: r.error, enMigracion: r.enMigracion }, { status: 500 })
  return NextResponse.json({ ok: true, aplicadas: r.aplicadas })
}
