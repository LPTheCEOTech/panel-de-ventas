'use client'

import { useEffect } from 'react'

import { IconoAviso } from '@/shared/chasis/iconos'

/**
 * Red de seguridad para cualquier pantalla que reviente.
 *
 * 🔴 El layout ya atrapa lo suyo y muestra el motivo real. Este boundary cubre
 * lo que falle DENTRO de una pantalla. Acá el texto del error no llega: en
 * producción Next lo reemplaza por uno genérico y deja solo el `digest`. Por
 * eso este cartel no promete explicar qué pasó — ofrece los tres arreglos que
 * cubren casi todos los casos y el código para buscar la línea exacta en los
 * Runtime Logs de Vercel.
 *
 * Lo que NO puede pasar es lo de antes: la pantalla en blanco de Next, que no
 * dice qué hacer ni deja a nadie avanzar.
 */
export default function ErrorDePantalla({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[pantalla]', error)
  }, [error])

  return (
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Esta pantalla no cargó</h1>
          <div className="sub">el resto del panel sigue funcionando</div>
        </div>
      </div>

      <div className="card">
        <div className="note warn" style={{ marginTop: 0 }}>
          <IconoAviso />
          <span>
            Algo falló al leer los datos de esta pantalla. Casi siempre es una de
            estas tres cosas, en este orden.
          </span>
        </div>

        <ol style={{ lineHeight: 1.7, paddingLeft: '1.2rem' }}>
          <li>
            <b>Probá de nuevo.</b> Si fue un corte momentáneo de la base, con esto
            alcanza.
          </li>
          <li>
            <b>Corré otra vez el SQL de instalación completo.</b> En Supabase, SQL
            Editor, pegá el archivo entero y dale Run. Está hecho para poder
            correrse dos veces sin romper nada ni borrar lo que ya cargaste.
          </li>
          <li>
            <b>Revisá las tres variables de entorno en Vercel</b> y volvé a
            desplegar.
          </li>
        </ol>

        <div className="form-actions">
          <button className="btn-primary" onClick={() => reset()}>
            Probar de nuevo
          </button>
        </div>
      </div>

      {error.digest && (
        <p className="sub" style={{ marginTop: '1rem' }}>
          Si tenés que pedir ayuda, mandá una foto de esta pantalla. Referencia:{' '}
          <code>{error.digest}</code>
        </p>
      )}
    </div>
  )
}
