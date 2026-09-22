import type { Metadata } from 'next'

import { configInvitacion } from '@/shared/datos/invitacion-github'
import { esEstadoInvitacion, MENSAJE_INVITACION } from '@/shared/datos/invitacion-github-reglas'
import estilos from '../login/login.module.css'
import propios from './solicitar.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Solicitar acceso' }

const OTROS: Record<'correo-invalido' | 'limite', { titulo: string; detalle: string }> = {
  'correo-invalido': {
    titulo: 'Ese correo no parece válido',
    detalle: 'Revisá que tenga arroba y punto, sin espacios. Tiene que ser el mismo con el que te registraste en GitHub.',
  },
  limite: {
    titulo: 'Demasiados intentos',
    detalle: 'Ya pediste acceso varias veces. Revisá tu correo (y spam): la invitación seguramente ya está ahí. Si no, esperá una hora y probá de nuevo.',
  },
}

/**
 * Puerta de entrada de un alumno nuevo. Pide el correo con el que se
 * registró en GitHub y lo invita a la organización que es dueña del repo,
 * para que Vercel lo deje importarlo. Mismo esqueleto que el login: un
 * `<form>` POST a un route handler, sin JavaScript.
 */
export default async function SolicitarAcceso({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const uno = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined))
  const estado = uno('estado')
  const email = (uno('email') ?? '').slice(0, 254)
  const habilitado = configInvitacion() !== null

  const mensaje = esEstadoInvitacion(estado)
    ? MENSAJE_INVITACION[estado]
    : estado === 'correo-invalido' || estado === 'limite'
      ? OTROS[estado]
      : null
  const exito = estado === 'invitado' || estado === 'ya-miembro' || estado === 'ya-invitado'

  return (
    <div className={estilos.pantalla}>
      <div className={`${estilos.caja} ${propios.caja}`}>
        <div className={estilos.marca}>
          <span className={estilos.tile}>PV</span>
          <span>
            <strong>Panel de Ventas</strong>
            <span>Acceso para alumnos</span>
          </span>
        </div>

        {mensaje && (
          <div className={exito ? propios.ok : propios.err}>
            <strong>{mensaje.titulo}</strong>
            <p>{mensaje.detalle}</p>
          </div>
        )}

        {!habilitado ? (
          <p className={propios.texto}>{MENSAJE_INVITACION['no-configurado'].detalle}</p>
        ) : exito ? (
          <p className={propios.texto}>Cuando hayas aceptado la invitación, volvé a la guía y seguí con el paso siguiente. Podés cerrar esta pestaña.</p>
        ) : (
          <>
            <p className={propios.texto}>
              Escribí el <b>mismo correo con el que creaste tu cuenta de GitHub</b>. Te va a llegar
              una invitación para poder instalar tu panel.
            </p>
            <form method="post" action="/api/solicitar-acceso" className={estilos.campos}>
              <div className="field">
                <label htmlFor="email">Tu correo de GitHub</label>
                <input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={email} />
              </div>
              <button className={`btn-primary ${estilos.boton} ${propios.boton}`} type="submit">Pedir acceso</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
