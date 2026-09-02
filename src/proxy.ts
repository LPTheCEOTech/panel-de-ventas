import type { NextRequest } from 'next/server'

import { actualizarSesion } from '@/shared/datos/sesion'

/**
 * 🔴 ESTE ARCHIVO NO ES `middleware.ts`.
 *
 * Next 16 renombró la convención: el archivo es **`proxy.ts`** y la función
 * exportada se llama **`proxy`**. Un `src/middleware.ts` no da error: SIMPLEMENTE
 * NO CORRE. Sería el peor final posible — la app quedaría sin login y con un
 * archivo que parece hacerlo.
 *
 * 🔴 Tampoco se configura `runtime`. En `proxy` el runtime es Node.js y el
 * `runtime: 'edge'` de siempre ya no existe: ponerlo tira.
 */
export async function proxy(request: NextRequest) {
  return actualizarSesion(request)
}

/**
 * Sin `matcher` el proxy corre en TODO, incluidos `_next/static`, las fuentes y
 * las imágenes: cada archivo estático pagaría una verificación de sesión contra
 * el servidor de Auth, y un redirect a `/login` sobre un `.woff2` deja la app
 * sin tipografía en vez de pedir login.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:woff2?|svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
