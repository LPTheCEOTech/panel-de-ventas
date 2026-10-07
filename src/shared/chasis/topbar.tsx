import { iniciales as calcularIniciales } from '@/shared/formato'
import type { Configuracion, Sesion } from '@/shared/tipos'
import { IconoSalir } from './iconos'
import { LogoMarca } from './logo-marca'
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
export function Topbar({ config, sesion }: { config: Configuracion; sesion?: Sesion | null }) {
  // 🔴 Fase C · con sesión activa el nombre y el rol vienen del usuario
  // logueado (correo + rol de app, y si está ligado a una persona ese nombre
  // y rol de vendedor). Sin sesión (modo dev/demo sin auth), la app cae al
  // `usuario_nombre`/`usuario_rol` de `configuracion` — backwards compat.
  const nombreQuien = sesion?.persona?.nombre ?? sesion?.correo ?? config.usuarioNombre
  const rolQuien = sesion
    ? (sesion.usuario.rol === 'admin' ? 'Admin' : sesion.persona ? etiquetaRol(sesion.persona.rol) : 'Miembro')
    : config.usuarioRol
  return (
    <header className="topbar">
      <div className="topbar-in">
      <div className="brand">
        <LogoMarca logoUrl={config.logoUrl} nombre={config.nombreNegocio} iniciales={config.iniciales} />
        <span className="brand-txt">
          <strong>{config.nombreNegocio}</strong>
          <span>Panel de métricas</span>
        </span>
      </div>

      <Nav rol={sesion?.usuario.rol} />

      <div className="topbar-right">
        <ToggleTema />
        <div className="quien">
          <span className="av">{calcularIniciales(nombreQuien)}</span>
          <span className="qn">
            {nombreQuien}
            <small>{rolQuien}</small>
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

function etiquetaRol(rol: 'setter' | 'closer' | 'ambos'): string {
  if (rol === 'setter') return 'Setter'
  if (rol === 'closer') return 'Closer'
  return 'Setter y closer'
}
