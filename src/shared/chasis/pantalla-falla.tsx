import { IconoAviso } from './iconos'

/**
 * La pantalla que se ve cuando algo revienta del lado del servidor.
 *
 * 🔴 Por qué existe: sin esto, Next muestra «This page couldn't load · A server
 * error occurred» y un número de ocho dígitos. Para el dueño de un panel eso no
 * es un error, es un misterio: no puede arreglarlo ni puede contarlo. Cada uno
 * de esos misterios llegó como un ticket, con capturas, de ida y vuelta, y
 * todos terminaron siendo la misma clase de cosa: el SQL a medio correr o una
 * variable de entorno mal pegada.
 *
 * 🔴 El mensaje REAL solo se puede mostrar desde el servidor. En producción
 * Next oculta el texto de los errores de Server Components y en el boundary de
 * cliente llega «An error occurred…» a secas. Por eso las lecturas se envuelven
 * en try/catch donde ocurren y el motivo se pasa por acá: es la única forma de
 * que la persona lea qué pasó de verdad.
 */
export function PantallaDeFalla({
  motivo,
  donde,
  codigo,
}: {
  motivo?: string
  donde: string
  codigo?: string
}) {
  return (
    <main className="wrap">
      <div className="hoja">
        <div className="page-head">
          <div>
            <h1>No pude cargar {donde}</h1>
            <div className="sub">esto tiene arreglo · abajo dice cómo</div>
          </div>
        </div>

        {motivo && (
          <div className="card">
            <div className="note warn" style={{ marginTop: 0 }}>
              <IconoAviso />
              <span>
                <b>Qué pasó:</b> {motivo}
              </span>
            </div>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Qué hacer</h2>
          <ol style={{ lineHeight: 1.7, paddingLeft: '1.2rem' }}>
            <li>
              <b>Recargá la página.</b> Si fue un corte momentáneo de la base, con
              esto alcanza.
            </li>
            <li>
              <b>Revisá que el SQL de instalación se haya corrido entero.</b> En
              Supabase, SQL Editor, pegá de nuevo el archivo completo y dale Run:
              está hecho para poder correrse dos veces sin romper nada.
            </li>
            <li>
              <b>Revisá las tres variables de entorno en Vercel.</b> Que no
              tengan espacios ni comillas, y que la URL empiece con{' '}
              <code>https://</code> y termine en <code>.supabase.co</code>.
              Después de tocarlas hay que volver a desplegar.
            </li>
            <li>
              Si sigue igual, <b>mandá una foto de esta pantalla completa</b>. Con
              el texto de arriba se sabe exactamente qué falta.
            </li>
          </ol>
        </div>

        {codigo && (
          <p className="sub" style={{ marginTop: '1rem' }}>
            Referencia técnica: <code>{codigo}</code>
          </p>
        )}
      </div>
    </main>
  )
}

/** El texto de un error desconocido, sin reventar si no es un `Error`. */
export function motivoDe(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return 'La base de datos no respondió como se esperaba.'
}
