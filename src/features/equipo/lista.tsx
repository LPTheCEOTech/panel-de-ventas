'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso, IconoDeshacer, IconoEquipo, IconoEquis, IconoInfo } from '@/shared/chasis/iconos'
import { iniciales } from '@/shared/formato'
import type { Persona, Rol } from '@/shared/tipos'

const ETIQUETA: Record<Rol, string> = { setter: 'Setter', closer: 'Closer', ambos: 'Setter y closer' }
const CLASE: Record<Rol, string> = { setter: 'set', closer: 'clo', ambos: 'amb' }

export function ListaEquipo({
  personas, resumen,
}: { personas: Persona[]; resumen: Record<string, { valor: string; unidad: string }> }) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('setter')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const activos = personas.filter((p) => p.activo).length
  const bajas = personas.length - activos

  async function pedir(url: string, metodo: string, cuerpo: unknown) {
    setOcupado(true); setError(null)
    try {
      const r = await fetch(url, {
        method: metodo, headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo guardar.')
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

  async function agregar() {
    if (await pedir('/api/equipo', 'POST', { nombre, rol })) setNombre('')
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

      {personas.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoEquipo size={22} /></div>
          <h3>Todavía no hay nadie</h3>
          <p>Agregá a tus setters y closers acá abajo. Son los nombres que van a aparecer en los dos formularios y en el ranking.</p>
        </div>
      ) : (
        personas.map((p) => {
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
              {!p.activo && <small>ya no está en el equipo</small>}
            </span>
            <span className={`pill rol ${CLASE[p.rol]}`}>{ETIQUETA[p.rol]}</span>
            {!p.activo && <span className="pill no">De baja</span>}
            {/* 🔴 Lo que hizo es una COLUMNA, no un renglón chico debajo del nombre:
                es el dato por el que se entra a esta pantalla. */}
            <span className="hizo num">
              {!p.activo ? '—'
                : hizo ? <><b>{hizo.valor}</b> {hizo.unidad}</>
                : <span className="flojo">sin reportes</span>}
            </span>
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
      <div className="card">
        <div className="card-head">
          <div><h3>Agregar a alguien</h3><p>aparece en los formularios al instante</p></div>
        </div>

        <div className="addrow">
          <div className="field">
            <label htmlFor="e-nombre">Nombre</label>
            <input
              id="e-nombre" value={nombre} placeholder="Nombre y apellido" maxLength={80}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nombre.trim().length >= 2) agregar() }}
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
          <button className="btn-primary" onClick={agregar} disabled={ocupado || nombre.trim().length < 2} type="button">
            Agregar
          </button>
        </div>

        {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

        <div className="note">
          <IconoInfo />
          <span>
            Dar de baja a alguien <b>no borra su historial</b>: deja de aparecer en los
            formularios, pero sus números siguen contando en las semanas que ya trabajó.
          </span>
        </div>
      </div>
    </div>
    </div>
  )
}
