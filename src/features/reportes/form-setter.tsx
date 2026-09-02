'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { tasa } from '@/shared/calculo/metricas'
import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { numero, porcentaje } from '@/shared/formato'
import type { Persona } from '@/shared/tipos'
import { Derivado, Stepper } from './piezas'

interface Existente { conversaciones: number; agendas: number }

export function FormSetter({ personas, hoy }: { personas: Persona[]; hoy: string }) {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoy)
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? '')
  const [conversaciones, setConversaciones] = useState(0)
  const [agendas, setAgendas] = useState(0)
  const [existente, setExistente] = useState<Existente | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔴 Se pregunta a la base si esa persona ya cargó ese día. Sin este aviso, el
  // segundo envío reemplazaría en silencio lo que ya había, y quien lo mandó
  // creería que se sumó.
  useEffect(() => {
    if (!personaId || !fecha) return
    let vigente = true
    fetch(`/api/reportes/setter?fecha=${fecha}&persona=${personaId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente) setExistente(d?.reporte ?? null) })
      .catch(() => { if (vigente) setExistente(null) })
    return () => { vigente = false }
  }, [fecha, personaId])

  const t = tasa(agendas, conversaciones)
  const persona = personas.find((p) => p.id === personaId)

  async function enviar() {
    setEnviando(true); setError(null)
    try {
      const r = await fetch('/api/reportes/setter', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, personaId, conversaciones, agendas }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo guardar. Probá de nuevo.')
        return
      }
      router.push('/panel')
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor. Revisá tu conexión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="what write">
        <IconoLapiz />
        <span>
          Al terminar tu día, registrá tus números. Con esto el panel calcula la{' '}
          <b>tasa de agenda</b> del equipo.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="card formcard">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="f-fecha">Fecha <span className="req">*</span></label>
            <input id="f-fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-setter">Setter <span className="req">*</span></label>
            <select id="f-setter" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <Stepper nombre="conversaciones" etiqueta="Conversaciones iniciadas" valor={conversaciones}
            onCambio={setConversaciones} pista="Con cuántas personas empezaste una conversación hoy." />
          <Stepper nombre="agendas" etiqueta="Agendas" valor={agendas}
            onCambio={setAgendas} pista="Cuántas llamadas quedaron agendadas." />
        </div>

        <div className="calc c2">
          <Derivado etiqueta="Tu tasa de agenda hoy" valor={porcentaje(t)} />
          <Derivado etiqueta="Agendas de conversaciones" valor={`${numero(agendas)} de ${numero(conversaciones)}`} />
        </div>

        {error && (
          <div className="note warn"><IconoAviso /><span>{error}</span></div>
        )}

        <div className="form-actions">
          <span className="helper">Se guarda al enviar y el panel se actualiza al instante.</span>
          <button className="btn-primary" onClick={enviar} disabled={enviando || !personaId} type="button">
            {enviando ? 'Guardando…' : existente ? 'Reemplazar' : 'Enviar reporte'}
          </button>
        </div>
      </div>

      {existente && (
        <div className="card formcard" style={{ marginTop: 12 }}>
          <div className="note warn" style={{ marginTop: 0 }}>
            <IconoAviso />
            <span>
              <b>{persona?.nombre} ya cargó el {fecha}</b> — {numero(existente.conversaciones)} conversaciones
              y {numero(existente.agendas)} agendas. Si enviás de nuevo, se <b>reemplaza</b> lo
              anterior. No se suma.
            </span>
          </div>
          <div className="form-actions">
            <span className="helper">Así el día no se cuenta dos veces.</span>
            <button
              className="btn-ghost" type="button"
              onClick={() => { setConversaciones(existente.conversaciones); setAgendas(existente.agendas) }}
            >
              Traer lo que había
            </button>
          </div>
        </div>
      )}
    </>
  )
}
