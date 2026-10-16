'use client'

import { useState } from 'react'

import { IconoAviso, IconoEquis, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga } from '@/shared/formato'
import type { Llamada } from '@/shared/tipos'
import { Pastillas, Quien } from './piezas'

/**
 * Las llamadas del día elegido en Post Llamada, con el botón de borrar (baja
 * lógica). El `#n` es el orden de carga, no la hora de la llamada.
 *
 * `nombres` llega solo para el dueño y el manager: con eso cada fila suma la
 * columna del closer. Al vendedor le sobra, siempre es él.
 */
export function ListaDelDia({
  llamadas, fecha, esHoy, cargando, simbolo, nombres, onBorrada,
}: {
  llamadas: Llamada[]
  fecha: string
  esHoy: boolean
  cargando: boolean
  simbolo: string
  nombres?: Record<string, string>
  onBorrada: (id: string) => void
}) {
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const delDia = llamadas.filter((l) => l.activa && l.fecha === fecha)

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

  const titulo = esHoy ? 'Llamadas del día' : `Llamadas del ${fechaLarga(fecha)}`
  const sub = cargando ? 'cargando…' : `${delDia.length} cargadas`

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head"><div><h3>{titulo}</h3><p>{sub}</p></div></div>
      {delDia.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoLapiz size={22} /></div>
          <h3>{cargando ? 'Buscando las llamadas de ese día…' : esHoy ? 'Todavía no cargaste ninguna' : 'Ese día no hay llamadas cargadas'}</h3>
          <p>Después de cada llamada, marca los switches y guarda. Van apareciendo aquí.</p>
        </div>
      ) : (
        <div className="llamadas-lista">
          {delDia.map((l, i) => (
            <div className={`llamada-row${nombres ? ' con-quien' : ''}`} key={l.id}>
              <span className="ll-n">#{i + 1}</span>
              <span className="ll-lead">{l.leadNombre || '(sin nombre)'}</span>
              {nombres && <Quien nombre={nombres[l.personaId]} />}
              <Pastillas l={l} />
              <span className="ll-cash num">{l.cashCents > 0 ? dinero(l.cashCents, simbolo) : '—'}</span>
              <button
                className="del" disabled={borrando}
                title="Borrar (baja lógica)" aria-label="Borrar"
                onClick={() => setConfirmar(l.id)}
              >
                <IconoEquis />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}
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
