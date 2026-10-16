'use client'

import { useState } from 'react'

import { diaDeLista } from '@/shared/calculo/rango'
import { IconoAviso, IconoEquis, IconoInfo, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, numero, plural } from '@/shared/formato'
import type { Llamada } from '@/shared/tipos'
import { BarraFiltros, type OpcionPersona } from '@/features/filtros/barra-filtros'
import type { Lista } from '@/features/filtros/use-lista'
import { Pastillas, Quien } from './piezas'

/**
 * Las llamadas cargadas, con SUS filtros (persona + período), los mismos del
 * Panel. Lo pidió el manager: ver de quién es cada llamada y el recuento del
 * día a día, sin que al otro día «desaparezcan».
 *
 * Con un período de varios días se parte por día: el encabezado dice el día,
 * cuántas y cuánto entró. El `#n` es el orden de carga dentro del día.
 *
 * `nombres` llega solo para el dueño y el manager: con eso cada fila suma la
 * columna del closer. Al vendedor le sobra, siempre es él.
 */
export function LlamadasCargadas({
  lista, hoy, inicioSemana, simbolo, nombres, closers, onBorrada,
}: {
  lista: Lista<Llamada>
  hoy: string
  inicioSemana: 0 | 1
  simbolo: string
  nombres?: Record<string, string>
  closers?: OpcionPersona[]
  onBorrada: (id: string) => void
}) {
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filas = lista.filas
  const cash = filas.reduce((s, l) => s + l.cashCents, 0)
  const variosDias = lista.rango.desde !== lista.rango.hasta

  async function borrar(id: string) {
    setBorrando(true); setError(null)
    try {
      const r = await fetch('/api/llamadas', {
        method: 'DELETE', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo borrar.')
        return
      }
      setConfirmar(null)
      onBorrada(id)
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setBorrando(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div>
          <h3>Llamadas cargadas</h3>
          <p>
            {lista.cargando ? 'cargando…'
              : `${plural(lista.total, 'llamada')} · ${dinero(cash, simbolo)} cobrados`}
          </p>
        </div>
        <BarraFiltros lista={lista} hoy={hoy} inicioSemana={inicioSemana} personas={closers} />
      </div>

      {filas.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoLapiz size={22} /></div>
          <h3>{lista.cargando ? 'Buscando las llamadas…' : 'No hay llamadas en este período'}</h3>
          <p>Después de cada llamada, marca los switches y guarda. Van apareciendo aquí. Para ver otros días, cambia el período arriba.</p>
        </div>
      ) : (
        <div className="llamadas-lista">
          {porDia(filas).map(([fecha, delDia]) => (
            <Dia
              key={fecha} fecha={fecha} llamadas={delDia} encabezado={variosDias}
              simbolo={simbolo} nombres={nombres} borrando={borrando} onBorrar={setConfirmar}
            />
          ))}
        </div>
      )}

      {lista.total > filas.length && (
        <div className="note">
          <IconoInfo />
          <span>
            Se muestran las <b>{numero(filas.length)}</b> más recientes de {numero(lista.total)}.
            Elige un período más corto para ver el resto.
          </span>
        </div>
      )}
      {(error || lista.error) && <div className="note warn"><IconoAviso /><span>{error ?? lista.error}</span></div>}
      {confirmar && (
        <div className="note warn" style={{ marginTop: 12 }}>
          <IconoAviso />
          <span>
            ¿Borrar esta llamada? Se marca inactiva pero queda en el histórico.
            <button type="button" className="btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => borrar(confirmar)} disabled={borrando}>
              Sí, borrar
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmar(null)} disabled={borrando}>
              Cancelar
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

/** Las filas ya vienen de la más nueva a la más vieja: se agrupan sin reordenar. */
function porDia(filas: Llamada[]): [string, Llamada[]][] {
  const grupos = new Map<string, Llamada[]>()
  for (const l of filas) {
    if (!l.activa) continue
    const g = grupos.get(l.fecha)
    if (g) g.push(l)
    else grupos.set(l.fecha, [l])
  }
  return [...grupos]
}

function Dia({
  fecha, llamadas, encabezado, simbolo, nombres, borrando, onBorrar,
}: {
  fecha: string
  llamadas: Llamada[]
  encabezado: boolean
  simbolo: string
  nombres?: Record<string, string>
  borrando: boolean
  onBorrar: (id: string) => void
}) {
  const cash = llamadas.reduce((s, l) => s + l.cashCents, 0)
  return (
    <>
      {encabezado && (
        <div className="ll-dia">
          <b>{diaDeLista(fecha)}</b>
          <span><b>{numero(llamadas.length)}</b> {llamadas.length === 1 ? 'llamada' : 'llamadas'} · <b>{dinero(cash, simbolo)}</b></span>
        </div>
      )}
      {llamadas.map((l, i) => (
        <div className={`llamada-row${nombres ? ' con-quien' : ''}`} key={l.id}>
          <span className="ll-n">#{i + 1}</span>
          <span className="ll-lead">{l.leadNombre || '(sin nombre)'}</span>
          {nombres && <Quien nombre={nombres[l.personaId]} />}
          <Pastillas l={l} />
          <span className="ll-cash num">{l.cashCents > 0 ? dinero(l.cashCents, simbolo) : '—'}</span>
          <button
            className="del" disabled={borrando} type="button"
            title="Borrar (baja lógica)" aria-label="Borrar"
            onClick={() => onBorrar(l.id)}
          >
            <IconoEquis />
          </button>
        </div>
      ))}
    </>
  )
}
