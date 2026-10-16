'use client'

import { useState } from 'react'

import { diaVacio, type FilaDia } from '@/shared/calculo/dia-por-dia'
import { diaDeLista } from '@/shared/calculo/rango'
import { IconoAbajo, IconoInfo } from '@/shared/chasis/iconos'
import { dinero, EL_GUION, numero } from '@/shared/formato'
import type { Llamada } from '@/shared/tipos'
import { Pastillas, Quien } from '@/features/llamadas/piezas'

/** Lo que se ve de entrada. Un mes entra entero; «Todo» de un año, no. */
const TOPE = 31

type Detalle = Llamada[] | 'cargando' | 'error'

/**
 * La planilla del manager: una fila por día del período, con lo que reportó
 * el equipo (o la persona elegida) ese día. Abrir un día muestra cada llamada.
 *
 * 🔴 Las llamadas NO viajan con la página: con «Todo» serían miles. Se piden
 * al abrir el día, a la misma ruta que usa Post Llamada, y quedan guardadas
 * mientras la página vive. La barrera es la de la ruta: el vendedor recibe lo
 * suyo aunque pida otra cosa.
 */
export function DiaPorDia({
  filas, persona, nombres, simbolo,
}: {
  filas: FilaDia[]
  /** La persona del filtro, si hay: el detalle se pide solo de ella. */
  persona?: string
  nombres: Record<string, string>
  simbolo: string
}) {
  const [todos, setTodos] = useState(false)
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())
  const [detalle, setDetalle] = useState<Record<string, Detalle>>({})

  async function pedir(fecha: string) {
    setDetalle((d) => ({ ...d, [fecha]: 'cargando' }))
    try {
      const q = new URLSearchParams({ fecha, ...(persona ? { persona } : {}) })
      const r = await fetch(`/api/llamadas?${q}`)
      const d = await r.json().catch(() => null)
      setDetalle((x) => ({ ...x, [fecha]: r.ok ? (d.llamadas as Llamada[]) : 'error' }))
    } catch {
      setDetalle((x) => ({ ...x, [fecha]: 'error' }))
    }
  }

  function alternar(f: FilaDia) {
    const abrir = !abiertos.has(f.fecha)
    setAbiertos((s) => {
      const n = new Set(s)
      if (abrir) n.add(f.fecha)
      else n.delete(f.fecha)
      return n
    })
    const ya = detalle[f.fecha]
    if (abrir && f.llamadas > 0 && (ya === undefined || ya === 'error')) pedir(f.fecha)
  }

  const visibles = todos ? filas : filas.slice(0, TOPE)

  return (
    <div className="card banda">
      <div className="card-head">
        <div><h3>Día por día</h3><p>del más reciente al más viejo · toca un día para ver sus llamadas</p></div>
        <span className="chip n num">{filas.length === 1 ? '1 día' : `${numero(filas.length)} días`}</span>
      </div>
      <div className="dxd">
        <div className="dxd-h">
          <span>Día</span><span>Agendas</span><span>Llamadas</span><span>Asistieron</span><span>Cierres</span><span>Cash</span><span />
        </div>
        {visibles.map((f) => {
          const celdas = (
            <>
              <span className="dxd-f">{diaDeLista(f.fecha)}</span>
              <span className="num">{numero(f.agendas)}</span>
              <span className="num">{numero(f.llamadas)}</span>
              <span className="num">{numero(f.asistieron)}</span>
              <span className="num">{numero(f.cierres)}</span>
              <span className="dxd-cash num">{f.cashCents > 0 ? dinero(f.cashCents, simbolo) : EL_GUION}</span>
            </>
          )
          // Un día sin nada no se abre: no hay nada que mostrar adentro.
          if (diaVacio(f)) return <div key={f.fecha} className="dxd-row vacio">{celdas}<span /></div>
          const abierto = abiertos.has(f.fecha)
          return (
            <div key={f.fecha}>
              <button type="button" className="dxd-row" aria-expanded={abierto} onClick={() => alternar(f)}>
                {celdas}<IconoAbajo />
              </button>
              {abierto && <LlamadasDelDia d={f.llamadas > 0 ? detalle[f.fecha] : []} nombres={nombres} simbolo={simbolo} />}
            </div>
          )
        })}
      </div>
      {!todos && filas.length > TOPE && (
        <div className="dxd-mas">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setTodos(true)}>
            Ver los {numero(filas.length)} días
          </button>
        </div>
      )}
      <div className="note">
        <IconoInfo />
        <span>
          Las <b>agendas</b> son las que los setters reservaron ese día; las <b>llamadas</b>, las
          que se hicieron ese día. No tienen por qué coincidir.
        </span>
      </div>
    </div>
  )
}

function LlamadasDelDia({
  d, nombres, simbolo,
}: { d: Detalle | undefined; nombres: Record<string, string>; simbolo: string }) {
  let cuerpo: React.ReactNode
  if (d === undefined || d === 'cargando') cuerpo = <div className="dxd-msj">Buscando las llamadas…</div>
  else if (d === 'error') cuerpo = <div className="dxd-msj">No se pudieron leer las llamadas. Vuelve a abrir el día.</div>
  else if (d.length === 0) cuerpo = <div className="dxd-msj">Ese día no hay llamadas cargadas: solo agendas.</div>
  else {
    cuerpo = d.map((l) => (
      <div className="dxd-ll" key={l.id}>
        <Quien nombre={nombres[l.personaId]} />
        <span className="dxd-lead">{l.leadNombre || '(sin nombre)'}</span>
        <Pastillas l={l} />
        <span className="ll-cash num">{l.cashCents > 0 ? dinero(l.cashCents, simbolo) : EL_GUION}</span>
      </div>
    ))
  }
  return <div className="dxd-llamadas">{cuerpo}</div>
}
