import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { clienteSobreRespuesta, hayCredenciales } from '@/shared/datos/sesion'
import { destinoSeguro, type CodigoError } from '@/shared/datos/sesion-reglas'

const zEntrada = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(512),
  next: z.string().optional(),
})

/**
 * 🔴 303, no el 307 que `NextResponse.redirect` pone por defecto.
 *
 * Un 307 PRESERVA el método: el navegador volvería a hacer POST, ahora contra
 * `/login`, que no tiene POST → 405 y una pantalla de error del framework en
 * vez del formulario. El 303 es exactamente para esto.
 */
const VER_OTRO = 303

function volverAlLogin(request: NextRequest, codigo: CodigoError, next: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('error', codigo)
  if (next !== '/panel') url.searchParams.set('next', next)
  return NextResponse.redirect(url, VER_OTRO)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let campos: z.infer<typeof zEntrada>
  try {
    const form = await request.formData()
    const p = zEntrada.safeParse({
      // `formData()` devuelve `File | string | null`: no se confía en que el
      // navegador mandó texto.
      email: form.get('email'),
      password: form.get('password'),
      next: form.get('next') ?? undefined,
    })
    if (!p.success) return volverAlLogin(request, 'faltan', '/panel')
    campos = p.data
  } catch {
    return volverAlLogin(request, 'faltan', '/panel')
  }

  const next = destinoSeguro(campos.next)

  if (!hayCredenciales()) return volverAlLogin(request, 'servidor', next)

  // 🔴 La respuesta se crea ANTES de autenticar, y no después.
  //
  // `signInWithPassword` no devuelve la cookie: se la pasa al `setAll` del
  // cliente, que la escribe sobre la respuesta que este archivo le presta. Si
  // la respuesta se creara después, la cookie se habría escrito sobre un objeto
  // ya descartado: el login diría "listo", redirigiría, y la persona llegaría
  // al panel sin sesión — que el proxy rebotaría de vuelta al login. Un bucle
  // perfecto, sin un solo error en consola.
  const exito = NextResponse.redirect(new URL(next, request.nextUrl.origin), VER_OTRO)
  const supabase = clienteSobreRespuesta(request, exito)

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: campos.email,
      password: campos.password,
    })
    if (error) {
      // 🔴 Un fallo de RED o de CONFIGURACIÓN no es un error de credenciales, y
      // decirle "contraseña incorrecta" a alguien cuya contraseña está bien
      // manda a buscar el problema al lado equivocado. Pasó de verdad en la app
      // de anuncios: la anon key de Vercel quedó guardada con los caracteres
      // del valor enmascarado, `fetch` no pudo ni armar la cabecera, y la app
      // dijo "credenciales". Una hora de depuración perdida.
      const esConfig =
        error.name === 'AuthRetryableFetchError' || !error.status || error.status === 401
      if (esConfig) {
        console.error('[login] fallo de configuración o de red:', error.name, error.status, error.message)
        return volverAlLogin(request, 'servidor', next)
      }
      return volverAlLogin(request, 'credenciales', next)
    }
  } catch (e) {
    console.error('[login] excepción:', e)
    return volverAlLogin(request, 'servidor', next)
  }

  return exito
}
