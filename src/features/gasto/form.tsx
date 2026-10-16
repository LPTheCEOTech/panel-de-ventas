'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga } from '@/shared/formato'
import type { Gasto } from '@/shared/tipos'
import { useLista, type Pagina } from '@/features/filtros/use-lista'
import { CampoDinero, Derivado } from '@/features/reportes/piezas'
import { HistorialGastos } from './historial'

interface ExistenteGasto { montoCents: number; nota?: string | null }

/**
 * El formulario del gasto en publicidad, con el historial del mes abajo.
 *
 * 🔴 A diferencia de setter/closer, NO hay `<select>` de persona: el gasto es
 * del negocio, no de nadie. Un solo campo de plata + fecha + nota opcional.
 * El aviso «ya cargaste $X» sigue el molde de form-setter/closer.
 *
 * 🔴 Al guardar se QUEDA en la pantalla (antes saltaba al Panel): el que carga
 * quiere ver que quedó bien en la lista. El formulario vuelve a hoy, vacío, y
 * la lista se vuelve a pedir con el período que tenga elegido.
 */
export function FormGasto({
  hoy, simbolo, lista: primera, inicioSemana,
}: {
  hoy: string
  simbolo: string
  /** La primera página del historial (Este mes): llega con la pantalla. */
  lista: Pagina<Gasto>
  inicioSemana: 0 | 1
}) {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoy)
  const [montoCents, setMontoCents] = useState(0)
  const [nota, setNota] = useState('')
  const [existente, setExistente] = useState<ExistenteGasto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState<string | null>(null)
  const lista = useLista<Gasto>('/api/gasto', 'gastos', primera)
  const formulario = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fecha) return
    let vigente = true
    fetch(`/api/gasto?fecha=${fecha}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente) setExistente(d?.gasto ?? null) })
      .catch(() => { if (vigente) setExistente(null) })
    return () => { vigente = false }
  }, [fecha])

  /** Tocar un renglón sube ese día al formulario para corregirlo. */
  function elegir(g: Gasto) {
    setFecha(g.fecha); setMontoCents(g.montoCents); setNota(g.nota ?? '')
    setGuardado(null); setError(null)
    formulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function enviar() {
    setEnviando(true); setError(null); setGuardado(null)
    try {
      const cuerpo = {
        fecha,
        montoCents,
        nota: nota.trim() === '' ? null : nota.trim(),
      }
      const r = await fetch('/api/gasto', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo guardar. Prueba de nuevo.')
        return
      }
      setGuardado(`Guardado: ${fechaLarga(fecha)}, ${dinero(montoCents, simbolo)}.`)
      setFecha(hoy); setMontoCents(0); setNota('')
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
          Al cerrar el día, registra cuánto gastaste en publicidad. Con esto el panel calcula
          el <b>CAC</b> y el <b>costo por asistida</b>.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="trabajo" ref={formulario} style={{ scrollMarginTop: 80 }}>
        <div className="card formcard">
          <div className="section-title">Cuándo</div>
          <div className="form-grid">
            <div className="field c4">
              <label htmlFor="g-fecha">Fecha <span className="req">*</span></label>
              <input
                id="g-fecha" type="date" value={fecha} max={hoy}
                onChange={(e) => { setFecha(e.target.value); setGuardado(null) }}
              />
            </div>
          </div>

          <div className="section-title">Cuánto</div>
          <div className="form-grid">
            <CampoDinero
              ancho="c6" nombre="monto" etiqueta="Gasto en publicidad" valorCents={montoCents}
              onCambio={(c) => { setMontoCents(c); setGuardado(null) }} simbolo={simbolo}
              pista="Si gastaste en varias plataformas, súmalas. La nota queda de ayuda-memoria."
            />
            <div className="field c6">
              <label htmlFor="g-nota">Nota (opcional)</label>
              <input
                id="g-nota" type="text" value={nota} maxLength={500}
                onChange={(e) => { setNota(e.target.value); setGuardado(null) }}
                placeholder="p. ej. $8k Meta, $6k Google"
              />
              <span className="hint">Un renglón, para recordar de dónde salió el gasto.</span>
            </div>
          </div>

          {error && (
            <div className="note warn"><IconoAviso /><span>{error}</span></div>
          )}

          <div className="form-actions">
            {guardado
              ? <span className="helper ok" role="status">{guardado}</span>
              : <span className="helper">Se guarda al enviar y el panel se actualiza al instante.</span>}
            <button className="btn-primary" onClick={enviar} disabled={enviando} type="button">
              {enviando ? 'Guardando…' : existente ? 'Reemplazar' : 'Guardar gasto'}
            </button>
          </div>
        </div>

        <div className="lado">
          <div className="card">
            <div className="card-head"><div><h3>Lo que estás por mandar</h3><p>se actualiza mientras escribes</p></div></div>
            <div className="calc apilado">
              <Derivado principal etiqueta="Gasto en publicidad" valor={dinero(montoCents, simbolo)} />
              <Derivado etiqueta="Fecha" valor={fechaLarga(fecha)} />
            </div>
          </div>

          {existente && (
            <div className="card">
              <div className="note warn" style={{ marginTop: 0 }}>
                <IconoAviso />
                <span>
                  <b>Ya cargaste el {fechaLarga(fecha)}</b> — {dinero(existente.montoCents, simbolo)}
                  {existente.nota ? <> · «{existente.nota}»</> : null}. Si envías de nuevo, se
                  <b> reemplaza</b> lo anterior. No se suma.
                </span>
              </div>
              <div className="form-actions">
                <span className="helper">Así el día no se cuenta dos veces.</span>
                <button
                  className="btn-ghost" type="button"
                  onClick={() => { setMontoCents(existente.montoCents); setNota(existente.nota ?? '') }}
                >
                  Traer lo que había
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <HistorialGastos
        lista={lista} hoy={hoy} inicioSemana={inicioSemana}
        simbolo={simbolo} enFormulario={fecha} onElegir={elegir}
      />
    </>
  )
}
