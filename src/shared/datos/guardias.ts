import 'server-only'

import { NextResponse } from 'next/server'

import { sesionActual } from './sesion-usuario'
import { hayCredenciales } from './sesion'

/**
 * 🔴 Fase C · guardia server-side para endpoints solo-admin.
 *
 * Devuelve `null` si podés seguir (el pedido es de admin, o del modo dev/demo
 * sin credenciales de Supabase). Devuelve una `NextResponse` 403 si el
 * usuario está logueado como miembro.
 *
 * En modo dev/demo (`hayCredenciales() === false`) se deja pasar: la app
 * corre como admin en ese modo — es lo mismo que hacen el layout y las
 * páginas.
 */
export async function soloAdmin(): Promise<NextResponse | null> {
  if (!hayCredenciales()) return null
  const s = await sesionActual()
  if (s && s.usuario.rol === 'admin') return null
  return NextResponse.json({ error: 'Solo el admin puede hacer esto.' }, { status: 403 })
}
