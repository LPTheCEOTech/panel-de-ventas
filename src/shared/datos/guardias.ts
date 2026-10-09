import 'server-only'

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import type { Nivel, Sesion } from '@/shared/tipos'
import { puede, soloDelDueno, tieneAcceso, type Accion } from './permisos'
import { sesionActual } from './sesion-usuario'
import { hayCredenciales } from './sesion'

/**
 * 🔴 Las dos puertas del servidor. Las páginas y las rutas no miran el rol:
 * le piden permiso a esto, y esto le pregunta a `permisos.ts`.
 *
 * En modo dev/demo (sin credenciales de Supabase) la app corre como dueño,
 * igual que siempre.
 */
export interface Permiso {
  /** null solo en modo demo. */
  sesion: Sesion | null
  nivel: Nivel
}

export async function nivelActual(): Promise<Permiso> {
  if (!hayCredenciales()) return { sesion: null, nivel: 'dueno' }
  const sesion = await sesionActual()
  return { sesion, nivel: sesion?.nivel ?? 'sin-acceso' }
}

/** Para rutas de API: el permiso, o un 403 listo para devolver. Sin acción,
 *  alcanza con tener acceso al panel. */
export async function exigir(accion?: Accion): Promise<Permiso | NextResponse> {
  const p = await nivelActual()
  if (!tieneAcceso(p.nivel)) {
    return NextResponse.json({ error: 'Tu usuario no tiene acceso a este panel.' }, { status: 403 })
  }
  if (accion && !puede(p.nivel, accion)) {
    return NextResponse.json({
      error: soloDelDueno(accion) ? 'Esto solo lo puede hacer el dueño del panel.' : 'Tu usuario no tiene permiso para esto.',
    }, { status: 403 })
  }
  return p
}

/**
 * Para páginas. 🔴 El layout no alcanza: en el App Router el layout y la página
 * se renderizan en paralelo, así que un `redirect` del layout no impide que la
 * página lea los datos. Cada página pregunta igual.
 */
export async function exigirPagina(accion?: Accion): Promise<Permiso> {
  const p = await nivelActual()
  if (!tieneAcceso(p.nivel)) redirect('/pendiente')
  if (accion && !puede(p.nivel, accion)) redirect('/panel')
  return p
}

/**
 * 🔴 De quién es lo que se carga o se lee. Quien no puede cargar por otros
 * (el vendedor) va SIEMPRE como sí mismo: se ignora lo que mande el
 * navegador, porque un curl a mano con el id de otro tiene que caer del lado
 * seguro. null = no hay a quién (falta el id, o no tiene persona).
 */
export function personaPermitida(p: Permiso, pedida: string | undefined): string | null {
  if (puede(p.nivel, 'cargar-por-otros')) return pedida ?? null
  return p.sesion?.usuario.personaId ?? null
}
