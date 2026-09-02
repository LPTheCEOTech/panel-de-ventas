import { NextResponse, type NextRequest } from 'next/server'

import { clienteSobreRespuesta, hayCredenciales } from '@/shared/datos/sesion'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const salida = NextResponse.redirect(new URL('/login', request.nextUrl.origin), 303)
  if (!hayCredenciales()) return salida
  try {
    await clienteSobreRespuesta(request, salida).auth.signOut()
  } catch (e) {
    // Si el servidor de Auth no contesta igual hay que dejar salir: las cookies
    // se limpian con la respuesta y quedarse "adentro" sería peor.
    console.error('[logout]', e)
  }
  return salida
}
