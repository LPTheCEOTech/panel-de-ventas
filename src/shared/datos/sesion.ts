import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { cookieSegura, esProduccion, esRutaPublica } from './sesion-reglas'

/**
 * La sesión. Portada de un patrón que ya está en producción en otra app,
 * sin la parte del iframe (ver `sesion-reglas.ts`).
 *
 * 🔴 Ésta es la ÚNICA parte de la app que usa la `anon key`, y solo para la
 * sesión. Los datos del negocio los lee la capa de datos con `service_role`,
 * desde el servidor y nunca desde el navegador.
 */

interface CookieAEscribir { name: string; value: string; options: CookieOptions }

export function hayCredenciales(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function credenciales(): { url: string; anon: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Están en .env.local y en las variables de entorno de Vercel.'
    )
  }
  return { url, anon }
}

/**
 * Un cliente que escribe sus cookies sobre una respuesta que YA existe. Lo usa
 * el POST del login, donde la respuesta es un redirect y las cookies tienen que
 * viajar en ese mismo redirect: si se escribieran en otra respuesta, el
 * navegador nunca las vería y el login diría "listo" sin dejar sesión.
 */
export function clienteSobreRespuesta(request: NextRequest, respuesta: NextResponse) {
  const { url, anon } = credenciales()
  const prod = esProduccion()
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: CookieAEscribir[]) {
        for (const { name, value, options } of cookies) {
          respuesta.cookies.set(name, value, cookieSegura(options, prod))
        }
      },
    },
  })
}

/**
 * El cuerpo del proxy: refresca la sesión en cada petición y decide si la ruta
 * se puede ver.
 *
 * 🔴 El doble `cookies.set` — en el request y en la response — no es redundante.
 * `@supabase/ssr` rota el token cuando está por vencer; sin escribirlo también
 * en `request.cookies`, el Server Component que se renderiza a continuación
 * leería el token viejo EN LA MISMA petición en la que se acaba de rotar. Se ve
 * como una sesión que se cae cada tanto y sin patrón.
 */
export async function actualizarSesion(request: NextRequest): Promise<NextResponse> {
  const ruta = request.nextUrl.pathname

  // 🔴 Sin credenciales: en producción NO se deja pasar a nadie. Una app sin
  // login por una variable que falta es peor que una app caída, porque parece
  // que anda. En desarrollo se deja pasar con un aviso, que es lo que permite
  // construir pantallas antes de que exista el proyecto de Supabase.
  if (!hayCredenciales()) {
    if (esProduccion()) {
      return new NextResponse(
        'Falta configurar Supabase. La app no puede verificar quién sos, así que no deja entrar a nadie.',
        { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
      )
    }
    return NextResponse.next({ request })
  }

  const { url, anon } = credenciales()
  const prod = esProduccion()
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: CookieAEscribir[]) {
        for (const { name, value } of cookies) request.cookies.set(name, value)
        respuesta = NextResponse.next({ request })
        for (const { name, value, options } of cookies) {
          respuesta.cookies.set(name, value, cookieSegura(options, prod))
        }
      },
    },
  })

  // 🔴 `getUser()`, no `getSession()`: el segundo se cree lo que diga la cookie
  // sin verificar la firma contra el servidor de Auth.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !esRutaPublica(ruta)) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search = ''
    destino.searchParams.set('next', ruta + request.nextUrl.search)
    return NextResponse.redirect(destino)
  }

  if (user && ruta === '/login') {
    const destino = request.nextUrl.clone()
    destino.pathname = '/panel'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return respuesta
}
