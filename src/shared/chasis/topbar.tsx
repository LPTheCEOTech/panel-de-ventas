import { iniciales as calcularIniciales } from '@/shared/formato'
import type { Configuracion } from '@/shared/tipos'
import { IconoSalir } from './iconos'
import { Nav } from './nav'
import { ToggleTema } from './toggle-tema'

/**
 * El menú va ARRIBA, nunca en una barra lateral. Es lo que dice el mockup y lo
 * que hace que en el celular baje a una segunda fila con scroll en vez de
 * dejar pantallas inalcanzables.
 *
 * 🔴 La barra pinta de borde a borde, pero su CONTENIDO va en `.topbar-in`,
 * que tiene el mismo ancho máximo y el mismo padding que `.wrap`. Sin ese
 * contenedor, en una pantalla ancha la marca arranca en el borde y el título
 * de la página 60 px más adentro: dos verticales distintas a la vista.
 */
export function Topbar({ config }: { config: Configuracion }) {
  return (
    <header className="topbar">
      <div className="topbar-in">
      <div className="brand">
        {/* 🔴 Fase B · si hay logoUrl se muestra el <img>; el <span.brand-tile>
            queda en el DOM con `hidden` para que el onError del img (bucket
            caído, URL rota) lo pueda revelar sin re-render y sin console.error.
            Sin logo, el `hidden` no aplica y sigue todo como estaba. */}
        {config.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logoUrl}
            alt={config.nombreNegocio}
            className="brand-logo"
            onError={(e) => {
              const img = e.currentTarget
              img.hidden = true
              const tile = img.nextElementSibling
              if (tile instanceof HTMLElement) tile.hidden = false
            }}
          />
        ) : null}
        <span className="brand-tile" hidden={!!config.logoUrl}>{config.iniciales}</span>
        <span className="brand-txt">
          <strong>{config.nombreNegocio}</strong>
          <span>Panel de métricas</span>
        </span>
      </div>

      <Nav />

      <div className="topbar-right">
        <ToggleTema />
        <div className="quien">
          <span className="av">{calcularIniciales(config.usuarioNombre)}</span>
          <span className="qn">
            {config.usuarioNombre}
            <small>{config.usuarioRol}</small>
          </span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="icon-btn" type="submit" title="Salir" aria-label="Salir">
            <IconoSalir />
          </button>
        </form>
      </div>
      </div>
    </header>
  )
}
