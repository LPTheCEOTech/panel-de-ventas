'use client'

import Link from 'next/link'
import { useState } from 'react'

import { IconoAbajo } from '@/shared/chasis/iconos'
import { iniciales } from '@/shared/formato'
import type { Persona, Rol, RolEquipo } from '@/shared/tipos'

export const ETIQUETA: Record<Rol, string> = { setter: 'Setter', closer: 'Closer', ambos: 'Setter y closer' }
export const CLASE: Record<Rol, string> = { setter: 'set', closer: 'clo', ambos: 'amb' }
/** «Manager» va en la misma pastilla que el rol de venta: un solo lugar para
 *  decir qué es cada uno en el equipo. */
const ETIQUETA_EQUIPO: Record<RolEquipo, string> = { ...ETIQUETA, manager: 'Manager' }
const CLASE_EQUIPO: Record<RolEquipo, string> = { ...CLASE, manager: 'man' }

/** 🔴 El lugar del botón «Contraseña» en una fila que no lo lleva. El renglón
 *  es flex: sin el hueco, la pastilla y la actividad se corren a la derecha y
 *  la columna deja de alinear con las otras filas. */
export function HuecoContrasena() {
  return <span className="btn-ghost btn-sm" aria-hidden style={{ visibility: 'hidden' }}>Contraseña</span>
}

/** Los colores de sistema del desplegable: lo dibuja el SO, no nuestro CSS. */
const OPCION: React.CSSProperties = { color: 'CanvasText', background: 'Canvas' }

/** Lo que la página sabe del admin que está mirando Equipo. */
export interface Yo {
  correo: string
  /** Su persona, si alguna vez se sumó al equipo (activa o no). */
  persona: Persona | null
  /** «Tu nombre» de Ajustes si ya no es el de fábrica; si no, vacío. */
  nombreSugerido: string
  /** Si viene, la fila va QUIETA con esta etiqueta: es el manager, cuyo rol
   *  y contraseña los cambia el dueño. */
  fija?: string
}

/**
 * 🔴 La pastilla del rol es un desplegable: donde ya se LEE el rol es donde
 * hay que poder cambiarlo. Antes no se podía, y pasar a alguien de setter a
 * closer obligaba a darlo de baja y volver a crearlo — que además choca con
 * «ya hay alguien con ese correo» y deja a la persona trabada sin salida.
 * Va con las clases de la pastilla y sin la flecha del sistema: tiene que
 * seguir leyéndose como una etiqueta, no como un formulario.
 *
 * 🔴 El chevrón es lo único que dice «esto se puede tocar». Sin él la pastilla
 * se lee como una etiqueta muerta: Maydelene terminó borrando a alguien del
 * equipo para cambiarle el rol porque no había ninguna señal de que se podía.
 * Va DENTRO de la pastilla, en `currentColor`, así toma el color de cada rol.
 *
 * `sinRol` agrega «Sin rol de venta»: solo lo tiene la fila del dueño, que
 * puede no vender. A los demás se los da de baja con la X.
 *
 * `conManager` agrega «Manager»: solo cuando mira el dueño y esa persona
 * tiene su propio acceso al panel.
 */
export function PastillaRol({
  rol, nombre, disabled, sinRol, conManager, onCambiar,
}: {
  rol: RolEquipo | null
  nombre: string
  disabled: boolean
  sinRol?: boolean
  conManager?: boolean
  onCambiar: (rol: RolEquipo | null) => void
}) {
  return (
    // 🔴 El <select> va INVISIBLE y encima de toda la pastilla. Antes ocupaba
    // solo el texto: un clic en el chevrón —justo lo que invita a tocar— no
    // abría nada. Lo que se ve es la etiqueta; lo que recibe el clic, todo.
    <span
      className={`pill rol ${rol ? CLASE_EQUIPO[rol] : 'no'}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}
    >
      {rol ? ETIQUETA_EQUIPO[rol] : 'Sin rol de venta'}
      <IconoAbajo />
      <select
        value={rol ?? ''}
        disabled={disabled}
        title={sinRol ? 'Elegir tu rol de venta' : `Cambiarle el rol a ${nombre}`}
        aria-label={sinRol ? 'Tu rol de venta' : `Rol de ${nombre}`}
        onChange={(e) => onCambiar((e.target.value || null) as RolEquipo | null)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, margin: 0, border: 0, cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none',
        }}
      >
        {/* 🔴 Los colores del sistema en las opciones: el desplegable lo pinta
            el sistema operativo, y heredar el color claro de la pastilla
            dejaba el menú ilegible en tema claro. */}
        {sinRol && <option value="" style={OPCION}>Sin rol de venta</option>}
        <option value="setter" style={OPCION}>{ETIQUETA.setter}</option>
        <option value="closer" style={OPCION}>{ETIQUETA.closer}</option>
        <option value="ambos" style={OPCION}>{ETIQUETA.ambos}</option>
        {conManager && <option value="manager" style={OPCION}>{ETIQUETA_EQUIPO.manager}</option>}
      </select>
    </span>
  )
}

/**
 * La fila de quien mira: siempre primera, aunque todavía no venda. Se arma con
 * la sesión, no con la lista de personas. Sin X (salir del equipo es «Sin rol
 * de venta») y su contraseña se cambia en Ajustes: el botón lleva ahí.
 *
 * El manager la ve QUIETA (`yo.fija`): ni rol ni contraseña. Ajustes no es
 * suyo, y un botón que lleva a una pantalla que lo rebota es peor que nada.
 */
export function FilaYo({
  yo, hizo, ocupado, onElegir,
}: {
  yo: Yo
  hizo: { valor: string; unidad: string } | undefined
  ocupado: boolean
  onElegir: (rol: Rol | null) => void
}) {
  const rol = yo.persona?.activo ? yo.persona.rol : null
  const nombre = yo.persona?.nombre ?? yo.nombreSugerido
  // Sin nombre todavía, el renglón grande ya dice «Tú»: abajo va solo el correo.
  const titulo = nombre || 'Tú'
  return (
    <div className="entry yo">
      <span className="av2">{iniciales(titulo)}</span>
      <span className="en">
        <strong>{titulo}</strong>
        <small>{nombre ? `Tú · ${yo.correo}` : yo.correo}</small>
      </span>
      {yo.fija ? (
        <span className="pill rol man">{yo.fija}</span>
      ) : (
        <PastillaRol rol={rol} nombre={titulo} disabled={ocupado} sinRol onCambiar={(r) => r !== 'manager' && onElegir(r)} />
      )}
      <span className="hizo num">
        {!rol ? <span className="flojo">no vende</span>
          : hizo ? <><b>{hizo.valor}</b> {hizo.unidad}</>
          : <span className="flojo">sin reportes</span>}
      </span>
      {yo.fija ? <HuecoContrasena /> : (
        <Link className="btn-ghost btn-sm" href="/ajustes" title="Tu contraseña se cambia en Ajustes" style={{ textDecoration: 'none' }}>
          Contraseña
        </Link>
      )}
      <span className="del-hueco" />
    </div>
  )
}

/**
 * La única pregunta, la primera vez que el dueño elige un rol: con qué nombre
 * aparece. Sin correo ni contraseña, porque ya los tiene. Si ese nombre ya es
 * de alguien del equipo sin acceso propio, se le pregunta si es él.
 */
export function NotaNombre({
  rol, sugerido, confirmar, ocupado, onSumarme, onCancelar,
}: {
  rol: Rol
  sugerido: string
  /** La pregunta «¿Eres tú?» que devolvió el servidor, si la hubo. */
  confirmar: string | null
  ocupado: boolean
  onSumarme: (nombre: string, ligarExistente: boolean) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(sugerido)
  const listo = nombre.trim().length >= 2 && !ocupado

  if (confirmar) {
    return (
      <div className="note" style={{ display: 'block', marginTop: 0 }}>
        <b>{confirmar}</b>
        <span className="hint" style={{ display: 'block', margin: '6px 0 10px' }}>
          Si eres tú, se usa esa misma persona y conserva lo que ya tenía cargado.
        </span>
        <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => onSumarme(nombre, true)}>
          Sí, soy yo
        </button>{' '}
        <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>
          Usar otro nombre
        </button>
      </div>
    )
  }

  return (
    <div className="note" style={{ display: 'block', marginTop: 0 }}>
      <b>¿Con qué nombre apareces en los formularios y en el ranking?</b>
      <div className="field" style={{ margin: '10px 0' }}>
        <input
          value={nombre} maxLength={80} placeholder="Nombre y apellido" autoFocus
          aria-label="Tu nombre en el equipo"
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && listo) onSumarme(nombre, false) }}
        />
      </div>
      <button type="button" className="btn-primary btn-sm" disabled={!listo} onClick={() => onSumarme(nombre, false)}>
        Sumarme como {ETIQUETA[rol].toLowerCase()}
      </button>{' '}
      <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>
        Cancelar
      </button>
      <span className="hint" style={{ display: 'block', marginTop: 8 }}>
        Entras con tu misma cuenta. Sigues viendo todo como admin.
      </span>
    </div>
  )
}
