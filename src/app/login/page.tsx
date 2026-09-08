import type { Metadata } from 'next'

import { estiloDeMarca } from '@/shared/chasis/marca'
import { datos } from '@/shared/datos/indice'
import { MENSAJE_ERROR, destinoSeguro, type CodigoError } from '@/shared/datos/sesion-reglas'
import estilos from './login.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Entrar' }

const CODIGOS: CodigoError[] = ['credenciales', 'servidor', 'faltan']

/**
 * El login es un `<form>` que hace POST a un route handler, NO una Server
 * Action. Dos razones: funciona sin JavaScript, y con `useActionState` el
 * submit no se dispara desde un navegador controlado, que es justo lo que hace
 * falta para poder probarlo automáticamente.
 */
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const crudo = Array.isArray(sp.error) ? sp.error[0] : sp.error
  const error = CODIGOS.includes(crudo as CodigoError) ? (crudo as CodigoError) : null
  const next = destinoSeguro(Array.isArray(sp.next) ? sp.next[0] : sp.next)

  // 🔴 Con try/catch y no sin él: ésta es una página PÚBLICA. Si la base está
  // caída o dormida y esto reventara, nadie podría ni ver el formulario — y el
  // error diría «error del servidor» sin ninguna pista de dónde mirar. Con la
  // base caída conviene que el login se vea igual, se intente, y ahí sí falle
  // diciendo que el problema es del servidor y no de la contraseña.
  let marca = { iniciales: '·', nombre: 'Panel de Ventas' }
  let paleta: string | null = null
  try {
    const c = await datos().leerConfiguracion()
    marca = { iniciales: c.iniciales, nombre: c.nombreNegocio }
    // el login es lo primero que se ve del panel: entrar con el verde del
    // mockup y que adentro sea violeta es un cambio de app a mitad de camino
    paleta = estiloDeMarca(c.marca)
  } catch {
    // se queda el genérico
  }

  return (
    <div className={estilos.pantalla}>
      {paleta && <style dangerouslySetInnerHTML={{ __html: paleta }} />}
      <div className={estilos.caja}>
        <div className={estilos.marca}>
          <span className={estilos.tile}>{marca.iniciales}</span>
          <span>
            <strong>{marca.nombre}</strong>
            <span>Entrá con tu correo y contraseña</span>
          </span>
        </div>

        {error && <div className={estilos.error}>{MENSAJE_ERROR[error]}</div>}

        <form method="post" action="/api/auth/login" className={estilos.campos}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className={`btn-primary ${estilos.boton}`} type="submit">Entrar</button>
        </form>
      </div>
    </div>
  )
}
