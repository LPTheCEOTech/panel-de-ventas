'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga } from '@/shared/formato'
import { CampoDinero, Derivado } from '@/features/reportes/piezas'

interface ExistenteGasto { montoCents: number; nota?: string | null }

/**
 * El formulario del gasto diario del negocio.
 *
 * 🔴 A diferencia de setter/closer, NO hay `<select>` de persona: el gasto es
 * del negocio, no de nadie. Un solo campo de plata + fecha + nota opcional.
 * El aviso «ya cargaste $X» sigue el molde de form-setter/closer.
 */
export function FormGasto({ hoy, simbolo }: { hoy: string; simbolo: string }) {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoy)
  const [montoCents, setMontoCents] = useState(0)
  const [nota, setNota] = useState('')
  const [existente, setExistente] = useState<ExistenteGasto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fecha) return
    let vigente = true
    fetch(`/api/gasto?fecha=${fecha}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente) setExistente(d?.gasto ?? null) })
      .catch(() => { if (vigente) setExistente(null) })
    return () => { vigente = false }
  }, [fecha])

  async function enviar() {
    setEnviando(true); setError(null)
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
          Al cerrar el día, registrá cuánto gastaste en captación. Con esto el panel calcula
          el <b>CAC</b>, el <b>costo por asistida</b> y el <b>AOV</b>.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="trabajo">
        <div className="card formcard">
          <div className="section-title">Cuándo</div>
          <div className="form-grid">
            <div className="field c4">
              <label htmlFor="g-fecha">Fecha <span className="req">*</span></label>
              <input id="g-fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="section-title">Cuánto</div>
          <div className="form-grid">
            <CampoDinero
              ancho="c6" nombre="monto" etiqueta="Gasto del día" valorCents={montoCents}
              onCambio={setMontoCents} simbolo={simbolo}
              pista="Si gastaste en varias plataformas, sumalas. La nota queda de ayuda-memoria."
            />
            <div className="field c6">
              <label htmlFor="g-nota">Nota (opcional)</label>
              <input
                id="g-nota" type="text" value={nota} maxLength={500}
                onChange={(e) => setNota(e.target.value)}
                placeholder="p. ej. $8k Meta, $6k Google"
              />
              <span className="hint">Un renglón, para recordar de dónde salió el gasto.</span>
            </div>
          </div>

          {error && (
            <div className="note warn"><IconoAviso /><span>{error}</span></div>
          )}

          <div className="form-actions">
            <span className="helper">Se guarda al enviar y el panel se actualiza al instante.</span>
            <button className="btn-primary" onClick={enviar} disabled={enviando} type="button">
              {enviando ? 'Guardando…' : existente ? 'Reemplazar' : 'Guardar gasto'}
            </button>
          </div>
        </div>

        <div className="lado">
          <div className="card">
            <div className="card-head"><div><h3>Lo que estás por mandar</h3><p>se actualiza mientras escribís</p></div></div>
            <div className="calc apilado">
              <Derivado principal etiqueta="Gasto del día" valor={dinero(montoCents, simbolo)} />
              <Derivado etiqueta="Fecha" valor={fechaLarga(fecha)} />
            </div>
          </div>

          {existente && (
            <div className="card">
              <div className="note warn" style={{ marginTop: 0 }}>
                <IconoAviso />
                <span>
                  <b>Ya cargaste el {fechaLarga(fecha)}</b> — {dinero(existente.montoCents, simbolo)}
                  {existente.nota ? <> · «{existente.nota}»</> : null}. Si enviás de nuevo, se
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
    </>
  )
}
