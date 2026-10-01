'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso, IconoDeshacer, IconoEquipo, IconoEquis, IconoInfo } from '@/shared/chasis/iconos'
import { mensajeParaElEquipo, revisarContrasena, sugerirContrasena } from '@/shared/datos/contrasenas'
import { iniciales } from '@/shared/formato'
import type { Persona, Rol } from '@/shared/tipos'
import { CLASE, ETIQUETA, FilaYo, NotaNombre, PastillaRol, type Yo } from './fila-yo'

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ListaEquipo({
  personas, resumen, yo,
}: {
  personas: Persona[]
  resumen: Record<string, { valor: string; unidad: string }>
  /** El admin que mira. null en modo demo: sin sesión no hay a quién ligar. */
  yo: Yo | null
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('setter')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState(() => sugerirContrasena())
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // Lo que hay que pasarle al vendedor una vez creado. Se muestra hasta que
  // el admin lo cierra: es el único momento en que la contraseña está a la
  // vista, y si se pierde hay que cambiarla de nuevo.
  const [entregar, setEntregar] = useState<{ nombre: string; correo: string; clave: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  // A quién le estoy cambiando la contraseña desde la lista.
  const [cambiando, setCambiando] = useState<Persona | null>(null)
  const [claveNueva, setClaveNueva] = useState('')
  // El rol que eligió el dueño la primera vez, mientras se le pregunta el nombre.
  const [sumando, setSumando] = useState<Rol | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  // La persona del dueño va en su propia fila, arriba: no se repite en la lista.
  const otras = personas.filter((p) => p.id !== yo?.persona?.id)
  const activos = personas.filter((p) => p.activo).length
  const bajas = personas.length - activos

  async function pedir(url: string, metodo: string, cuerpo: unknown, siConfirmar?: (pregunta: string) => void) {
    setOcupado(true); setError(null)
    try {
      const r = await fetch(url, {
        method: metodo, headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        if (d?.confirmar && siConfirmar) siConfirmar(d.error)
        else setError(d?.error ?? 'No se pudo guardar.')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('No se pudo hablar con el servidor.')
      return false
    } finally {
      setOcupado(false)
    }
  }

  // 🔴 Sin correo. El admin define la contraseña y el panel le devuelve el
  // mensaje listo para mandarle al vendedor. El correo de Supabase permite 2
  // mensajes por hora en todo el proyecto: con un equipo de cuatro, dos no
  // recibían nada y no había forma de enterarse.
  async function agregar() {
    const problema = revisarContrasena(clave)
    if (problema) { setError(problema === 'corta' ? 'La contraseña necesita al menos 8 caracteres.' : 'Esa contraseña no sirve.'); return }
    if (await pedir('/api/equipo', 'POST', { nombre, rol, correo, clave })) {
      setEntregar({ nombre: nombre.trim(), correo: correo.trim(), clave })
      setCopiado(false)
      setNombre(''); setCorreo(''); setClave(sugerirContrasena())
    }
  }

  async function guardarClaveNueva() {
    if (!cambiando) return
    const problema = revisarContrasena(claveNueva)
    if (problema) { setError(problema === 'corta' ? 'La contraseña necesita al menos 8 caracteres.' : 'Esa contraseña no sirve.'); return }
    if (await pedir('/api/contrasena', 'POST', { personaId: cambiando.id, clave: claveNueva })) {
      setEntregar({ nombre: cambiando.nombre, correo: '', clave: claveNueva })
      setCopiado(false)
      setCambiando(null); setClaveNueva('')
    }
  }

  // 🔴 La primera vez que el dueño elige un rol se le pregunta el nombre; las
  // siguientes, el cambio es directo, como en la pastilla de cualquiera.
  function elegirMiRol(r: Rol | null) {
    setError(null)
    if (!yo?.persona && r) { setSumando(r); setConfirmar(null); return }
    pedir('/api/equipo/yo', 'POST', { rol: r })
  }

  async function sumarme(nombre: string, ligarExistente: boolean) {
    if (await pedir('/api/equipo/yo', 'POST', { rol: sumando, nombre, ligarExistente }, setConfirmar)) {
      setSumando(null); setConfirmar(null)
    }
  }

  function copiarEntrega() {
    if (!entregar) return
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    const texto = entregar.correo
      ? mensajeParaElEquipo(entregar.nombre, url, entregar.correo, entregar.clave)
      : `${entregar.nombre}, tu nueva contraseña del panel es: ${entregar.clave}\nEntra en ${url}`
    navigator.clipboard?.writeText(texto).then(() => setCopiado(true)).catch(() => setCopiado(false))
  }

  return (
    <div className="trabajo">
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Tu equipo</h3>
          <p>{activos} {activos === 1 ? 'activo' : 'activos'}{bajas > 0 && ` · ${bajas} de baja`}</p>
        </div>
        <span className="chip n">esta semana</span>
      </div>

      {yo && <FilaYo yo={yo} hizo={yo.persona ? resumen[yo.persona.id] : undefined} ocupado={ocupado} onElegir={elegirMiRol} />}

      {otras.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoEquipo size={22} /></div>
          <h3>Todavía no hay nadie</h3>
          <p>Agrega a tus setters y closers aquí abajo. Son los nombres que van a aparecer en los dos formularios y en el ranking.</p>
        </div>
      ) : (
        otras.map((p) => {
          const hizo = resumen[p.id]
          return (
          /* 🔴 El renglón es FLEX, no grid.
             Con columnas fijas, la pastilla de "De baja" —que aparece y
             desaparece— corría de lugar todo lo que venía después: la
             actividad y el botón caían en la pista equivocada y sobraba una
             columna vacía al final del renglón. */
          <div className={`entry${p.activo ? '' : ' off'}`} key={p.id}>
            <span className="av2">{iniciales(p.nombre)}</span>
            <span className="en">
              <strong>{p.nombre}</strong>
              {/* 🔴 El rol se dice UNA vez por vista. En escritorio lo dice la
                  pastilla; en el celular la pastilla no entra y lo dice este
                  renglón, que ahí se enciende. La baja, en cambio, se dice
                  siempre: es lo que explica por qué el renglón está apagado. */}
              <small className={p.activo ? 'solo-chico' : undefined}>
                {p.activo ? ETIQUETA[p.rol] : 'ya no está en el equipo'}
              </small>
            </span>
            {/* Los de baja mantienen la pastilla quieta. */}
            {p.activo ? (
              <PastillaRol
                rol={p.rol} nombre={p.nombre} disabled={ocupado}
                onCambiar={(r) => r && pedir('/api/equipo', 'PATCH', { id: p.id, rol: r })}
              />
            ) : (
              <span className={`pill rol ${CLASE[p.rol]}`}>{ETIQUETA[p.rol]}</span>
            )}
            {!p.activo && <span className="pill no">De baja</span>}
            {/* 🔴 Lo que hizo es una COLUMNA, no un renglón chico debajo del nombre:
                es el dato por el que se entra a esta pantalla. */}
            <span className="hizo num">
              {!p.activo ? '—'
                : hizo ? <><b>{hizo.valor}</b> {hizo.unidad}</>
                : <span className="flojo">sin reportes</span>}
            </span>
            {p.activo && (
              <button
                className="btn-ghost btn-sm" disabled={ocupado} type="button"
                title={`Cambiarle la contraseña a ${p.nombre}`}
                onClick={() => { setCambiando(p); setClaveNueva(sugerirContrasena()); setError(null) }}
              >
                Contraseña
              </button>
            )}
            <button
              className="del" disabled={ocupado}
              title={p.activo ? `Dar de baja a ${p.nombre}` : `Reactivar a ${p.nombre}`}
              aria-label={p.activo ? `Dar de baja a ${p.nombre}` : `Reactivar a ${p.nombre}`}
              onClick={() => pedir('/api/equipo', 'PATCH', { id: p.id, activo: !p.activo })}
            >
              {p.activo ? <IconoEquis /> : <IconoDeshacer />}
            </button>
          </div>
          )
        })
      )}

    </div>

    <div className="lado">
      {sumando && yo && (
        <div className="card">
          <NotaNombre
            rol={sumando} sugerido={yo.nombreSugerido} confirmar={confirmar} ocupado={ocupado}
            onSumarme={sumarme}
            onCancelar={() => (confirmar ? setConfirmar(null) : setSumando(null))}
          />
          {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <div><h3>Agregar al equipo</h3><p>le creas el acceso y se lo pasas tú</p></div>
        </div>

        <div className="addrow">
          <div className="field">
            <label htmlFor="e-nombre">Nombre</label>
            <input
              id="e-nombre" value={nombre} placeholder="Nombre y apellido" maxLength={80}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="e-rol">Rol</label>
            <select id="e-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              <option value="setter">Setter</option>
              <option value="closer">Closer</option>
              <option value="ambos">Setter y closer</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-correo">Correo</label>
            <input
              id="e-correo" type="email" value={correo} placeholder="persona@ejemplo.com" maxLength={254}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="e-clave">Contraseña para esa persona</label>
            <input
              id="e-clave" type="text" value={clave} maxLength={72}
              onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nombre.trim().length >= 2 && CORREO_RE.test(correo.trim())) agregar()
              }}
            />
            <span className="hint">
              Ya te sugerimos una fácil de dictar. Puedes cambiarla.{' '}
              <button type="button" className="btn-ghost btn-sm" onClick={() => setClave(sugerirContrasena())}>
                Sugerir otra
              </button>
            </span>
          </div>
          <button
            className="btn-primary" onClick={agregar} type="button"
            disabled={ocupado || nombre.trim().length < 2 || !CORREO_RE.test(correo.trim()) || !!revisarContrasena(clave)}
          >
            Crear acceso
          </button>
        </div>

        {entregar && (
          <div className="note" style={{ display: 'block' }}>
            <b>Listo. Pásale estos datos a {entregar.nombre}:</b>
            <div className="calc apilado" style={{ margin: '10px 0' }}>
              {entregar.correo && (
                <div className="dv"><span>Correo</span><b className="num">{entregar.correo}</b></div>
              )}
              <div className="dv"><span>Contraseña</span><b className="num">{entregar.clave}</b></div>
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={copiarEntrega}>
              {copiado ? '¡Copiado!' : 'Copiar mensaje para mandarle'}
            </button>{' '}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEntregar(null)}>
              Ya se lo pasé
            </button>
            <span className="hint" style={{ display: 'block', marginTop: 8 }}>
              Esta contraseña no se vuelve a mostrar. Si la pierdes, le pones una nueva
              con el botón «Contraseña» de la lista.
            </span>
          </div>
        )}

        {cambiando && (
          <div className="note" style={{ display: 'block' }}>
            <b>Nueva contraseña para {cambiando.nombre}</b>
            <div className="field" style={{ margin: '10px 0' }}>
              <input
                type="text" value={claveNueva} maxLength={72}
                onChange={(e) => setClaveNueva(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') guardarClaveNueva() }}
              />
            </div>
            <button type="button" className="btn-primary btn-sm" disabled={ocupado || !!revisarContrasena(claveNueva)} onClick={guardarClaveNueva}>
              Guardar
            </button>{' '}
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setCambiando(null); setError(null) }}>
              Cancelar
            </button>
          </div>
        )}

        {error && !sumando && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

        <div className="note">
          <IconoInfo />
          <span>
            No se manda ningún correo: le creas el acceso y le pasas los datos tú por
            donde ya le hablas. Si ya existe una persona con ese nombre, la reutiliza;
            si no, la crea. Dar de baja a alguien <b>no borra su historial</b>: deja de
            aparecer en los formularios, pero sus números siguen contando en las
            semanas que ya trabajó.
          </span>
        </div>
      </div>
    </div>
    </div>
  )
}
