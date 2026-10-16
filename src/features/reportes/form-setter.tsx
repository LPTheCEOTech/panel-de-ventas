'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { tasa } from '@/shared/calculo/metricas'
import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { fechaLarga, numero, porcentaje } from '@/shared/formato'
import type { Persona, ReporteSetter } from '@/shared/tipos'
import type { OpcionPersona } from '@/features/filtros/barra-filtros'
import { useLista, type Pagina } from '@/features/filtros/use-lista'
import { Derivado, Stepper } from './piezas'
import { ReportesCargados } from './reportes-cargados'

interface Existente { conversaciones: number; agendas: number }

/**
 * El reporte de fin de día del setter, con lo ya cargado abajo.
 *
 * 🔴 Al enviar se QUEDA en la pantalla (antes saltaba al Panel): el que carga
 * por el equipo manda varios seguidos y quiere ver que quedaron en la lista.
 * Para el dueño y el manager el select vuelve a vacío: el próximo reporte es
 * de otra persona.
 */
export function FormSetter({
  personas, hoy, bloqueadoA, lista: primera, setters, nombres, inicioSemana,
}: {
  personas: Persona[]
  hoy: string
  bloqueadoA?: string
  /** La primera página de «Reportes cargados» (Esta semana). */
  lista: Pagina<ReporteSetter>
  /** Las opciones del filtro de persona; sin esto (vendedor) no hay filtro. */
  setters?: OpcionPersona[]
  nombres: Record<string, string>
  inicioSemana: 0 | 1
}) {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoy)
  // 🔴 Fase C · si el server nos manda `bloqueadoA` es porque el que carga es
  // un miembro y solo puede reportar como sí mismo. El estado arranca con esa
  // persona y no puede cambiar; el <select> se reemplaza por una confirmación.
  // El dueño y el manager arrancan sin nadie: «Enviar» no se habilita hasta elegir.
  const [personaId, setPersonaId] = useState(bloqueadoA ?? '')
  const [conversaciones, setConversaciones] = useState(0)
  const [agendas, setAgendas] = useState(0)
  const [cargado, setExistente] = useState<Existente | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<string | null>(null)
  const lista = useLista<ReporteSetter>('/api/reportes/setter', 'reportes', primera)
  const formulario = useRef<HTMLDivElement>(null)

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

  // 🔴 Derivado, no guardado: al enviar, el select vuelve a vacío y el aviso
  // del reporte anterior quedaba colgado, sin nombre.
  const existente = personaId ? cargado : null
  const t = tasa(agendas, conversaciones)
  const persona = personas.find((p) => p.id === personaId)

  /** Tocar un reporte de la lista lo sube al formulario para corregirlo. */
  function elegir(r: ReporteSetter) {
    setFecha(r.fecha)
    if (!bloqueadoA) setPersonaId(r.personaId)
    setConversaciones(r.conversaciones); setAgendas(r.agendas)
    setGuardado(null); setError(null)
    formulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function enviar() {
    setEnviando(true); setError(null); setGuardado(null)
    try {
      const r = await fetch('/api/reportes/setter', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, personaId, conversaciones, agendas }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo guardar. Prueba de nuevo.')
        return
      }
      setGuardado(`Guardado: ${persona?.nombre ?? 'el reporte'}, ${fechaLarga(fecha)}.`)
      setConversaciones(0); setAgendas(0)
      setPersonaId(bloqueadoA ?? '')
      lista.recargar()
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor. Revisa tu conexión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="what write">
        <IconoLapiz />
        <span>
          Al terminar tu día, registra tus números. Con esto el panel calcula la{' '}
          <b>tasa de agenda</b> del equipo.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="trabajo" ref={formulario} style={{ scrollMarginTop: 80 }}>
      <div className="card formcard">
        {/* 🔴 Dos grupos con título, no ocho campos en fila. El formulario
            pregunta dos cosas distintas —quién eres y qué hiciste— y verlas
            separadas es lo que hace que se llene sin releer. */}
        <div className="section-title">Quién y cuándo</div>
        <div className="form-grid">
          <div className="field c4">
            <label htmlFor="f-fecha">Fecha <span className="req">*</span></label>
            <input id="f-fecha" type="date" value={fecha} max={hoy} onChange={(e) => { setFecha(e.target.value); setGuardado(null) }} />
          </div>
          <div className="field c8">
            <label htmlFor="f-setter">Setter <span className="req">*</span></label>
            {bloqueadoA ? (
              <div className="confirma-persona"><b>{persona?.nombre}</b></div>
            ) : (
              <select id="f-setter" value={personaId} onChange={(e) => { setPersonaId(e.target.value); setGuardado(null) }}>
                <option value="" disabled>Elige quién reporta</option>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="section-title">Tu día</div>
        <div className="form-grid">
          <Stepper ancho="c6" nombre="conversaciones" etiqueta="Conversaciones iniciadas" valor={conversaciones}
            onCambio={(n) => { setConversaciones(n); setGuardado(null) }} pista="Con cuántas personas empezaste una conversación hoy." />
          <Stepper ancho="c6" nombre="agendas" etiqueta="Agendas" valor={agendas}
            onCambio={(n) => { setAgendas(n); setGuardado(null) }} pista="Cuántas llamadas quedaron agendadas." />
        </div>

        {error && (
          <div className="note warn"><IconoAviso /><span>{error}</span></div>
        )}

        <div className="form-actions">
          {guardado
            ? <span className="helper ok" role="status">{guardado}</span>
            : <span className="helper">Se guarda al enviar y el panel se actualiza al instante.</span>}
          <button className="btn-primary" onClick={enviar} disabled={enviando || !personaId} type="button">
            {enviando ? 'Guardando…' : existente ? 'Reemplazar' : 'Enviar reporte'}
          </button>
        </div>
      </div>

      <div className="lado">
        <div className="card">
          <div className="card-head"><div><h3>Lo que estás por mandar</h3><p>se actualiza mientras escribes</p></div></div>
          <div className="calc apilado">
            <Derivado principal etiqueta="Tasa de agenda" valor={porcentaje(t)} />
            <Derivado etiqueta="Agendas" valor={numero(agendas)} />
            <Derivado etiqueta="Conversaciones" valor={numero(conversaciones)} />
          </div>
        </div>

      {existente && (
        <div className="card">
          <div className="note warn" style={{ marginTop: 0 }}>
            <IconoAviso />
            <span>
              <b>{persona?.nombre} ya cargó el {fechaLarga(fecha)}</b> — {numero(existente.conversaciones)} conversaciones
              y {numero(existente.agendas)} agendas. Si envías de nuevo, se <b>reemplaza</b> lo
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
      </div>
      </div>

      <ReportesCargados
        lista={lista} hoy={hoy} inicioSemana={inicioSemana} nombres={nombres} setters={setters}
        enFormulario={{ fecha, personaId }} onElegir={elegir}
      />
    </>
  )
}
