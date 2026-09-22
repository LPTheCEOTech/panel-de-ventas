import { NextResponse, type NextRequest } from 'next/server'

import { invitarAlumno } from '@/shared/datos/invitacion-github'
import { correoValido, type EstadoInvitacion } from '@/shared/datos/invitacion-github-reglas'

/**
 * Un alumno nuevo pide acceso a la organización de GitHub para poder
 * importar el repo en su Vercel. Es un `<form>` POST que redirige de vuelta
 * a `/solicitar-acceso?estado=…`, igual que el login: funciona sin JS.
 *
 * Es público y sin código a propósito: la guía solo la tienen los alumnos
 * del curso. El único freno es un límite por IP para que un script no
 * llene la org de invitaciones.
 */
const VER_OTRO = 303

// Best-effort: en serverless cada instancia tiene su propia memoria, pero
// alcanza para frenar un bucle accidental desde un mismo navegador.
const VENTANA_MS = 60 * 60 * 1000
const MAX_POR_VENTANA = 5
const intentos = new Map<string, number[]>()

function excedeLimite(ip: string): boolean {
  const ahora = Date.now()
  const previos = (intentos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS)
  previos.push(ahora)
  intentos.set(ip, previos)
  return previos.length > MAX_POR_VENTANA
}

function volver(request: NextRequest, estado: EstadoInvitacion | 'correo-invalido' | 'limite', correo = ''): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/solicitar-acceso'
  url.search = ''
  url.searchParams.set('estado', estado)
  if (correo) url.searchParams.set('email', correo)
  return NextResponse.redirect(url, VER_OTRO)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let correo = ''
  try {
    const form = await request.formData()
    const v = form.get('email')
    correo = typeof v === 'string' ? v.trim().toLowerCase() : ''
  } catch {
    return volver(request, 'correo-invalido')
  }
  if (!correoValido(correo)) return volver(request, 'correo-invalido', correo)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida'
  if (excedeLimite(ip)) return volver(request, 'limite', correo)

  const r = await invitarAlumno(correo)
  if (r.estado === 'error') console.error('[solicitar-acceso]', correo, r.detalle)
  return volver(request, r.estado, correo)
}
