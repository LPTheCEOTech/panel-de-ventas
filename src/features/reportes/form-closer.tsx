'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { tasa } from '@/shared/calculo/metricas'
import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga, numero, porcentajeEntero } from '@/shared/formato'
import type { Persona } from '@/shared/tipos'
import { CampoDinero, Derivado, Stepper } from './piezas'

interface Existente {
  llamadas: number; asistieron: number; reagendadas: number; cierres: number
  revenueCents: number; cashCents: number
}

export function FormCloser({
  personas, hoy, simbolo, bloqueadoA,
}: { personas: Persona[]; hoy: string; simbolo: string; bloqueadoA?: string }) {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoy)
  // 🔴 Fase C · si el server nos manda `bloqueadoA`, el que carga es un
  // miembro cargando lo suyo. No hay <select>: hay una confirmación del nombre.
  const [personaId, setPersonaId] = useState(bloqueadoA ?? personas[0]?.id ?? '')
  const [llamadas, setLlamadas] = useState(0)
  const [asistieron, setAsistieron] = useState(0)
  const [reagendadas, setReagendadas] = useState(0)
  const [cierres, setCierres] = useState(0)
  const [revenueCents, setRevenue] = useState(0)
  const [cashCents, setCash] = useState(0)
  const [existente, setExistente] = useState<Existente | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!personaId || !fecha) return
    let vigente = true
    fetch(`/api/reportes/closer?fecha=${fecha}&persona=${personaId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente) setExistente(d?.reporte ?? null) })
      .catch(() => { if (vigente) setExistente(null) })
    return () => { vigente = false }
  }, [fecha, personaId])

  const persona = personas.find((p) => p.id === personaId)

  /**
   * 🔴 Estas tres NO bloquean el envío, avisan.
   *
   * Las tres son situaciones REALES: se cierra hoy a alguien de una llamada de
   * la semana pasada, y sobre todo se cobra hoy la cuota de una venta firmada
   * hace un mes — que es literalmente el negocio. Un formulario que rechaza un
   * día real deja al panel sin ese día, que hace más daño que el número raro.
   */
  const avisos: string[] = []
  if (asistieron > llamadas) avisos.push('Anotaste más asistencias que llamadas en agenda. ¿Entró alguien que no estaba agendado?')
  if (cierres > asistieron) avisos.push('Anotaste más cierres que asistencias. ¿Alguno cerró de una llamada anterior?')
  if (cashCents > revenueCents) avisos.push('Cobraste más de lo que firmaste hoy. ¿Es cash de una venta anterior?')

  async function enviar() {
    setEnviando(true); setError(null)
    try {
      const r = await fetch('/api/reportes/closer', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, personaId, llamadas, asistieron, reagendadas, cierres, revenueCents, cashCents }),
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
          Registrá el resultado de tu día de llamadas. Con esto el panel calcula{' '}
          <b>asistencia</b>, <b>cierre</b> y el <b>dinero</b> de la semana.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="trabajo">
      <div className="card formcard">
        {/* 🔴 Tres grupos con título, no diez campos en fila. Son tres
            preguntas distintas —quién sos, cómo te fue en las llamadas y
            cuánta plata entró— y el que llena esto lo hace cansado, de noche. */}
        <div className="section-title">Quién y cuándo</div>
        <div className="form-grid">
          <div className="field c4">
            <label htmlFor="c-fecha">Fecha <span className="req">*</span></label>
            <input id="c-fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field c8">
            <label htmlFor="c-closer">Closer <span className="req">*</span></label>
            {bloqueadoA ? (
              <div className="confirma-persona"><b>{persona?.nombre}</b></div>
            ) : (
              <select id="c-closer" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="section-title">Las llamadas del día</div>
        <div className="form-grid">
          <Stepper ancho="c3" nombre="llamadas" etiqueta="En agenda" valor={llamadas} onCambio={setLlamadas} />
          <Stepper ancho="c3" nombre="asistieron" etiqueta="Asistieron" valor={asistieron} onCambio={setAsistieron} />
          <Stepper ancho="c3" nombre="reagendadas" etiqueta="Reagendadas" valor={reagendadas} onCambio={setReagendadas} />
          <Stepper ancho="c3" nombre="cierres" etiqueta="Cierres" valor={cierres} onCambio={setCierres} />
        </div>

        <div className="section-title">El dinero del día</div>
        <div className="form-grid">
          <CampoDinero ancho="c6" nombre="revenue" etiqueta="Revenue contratado" valorCents={revenueCents}
            onCambio={setRevenue} simbolo={simbolo}
            pista="El total que firmaron hoy, aunque lo paguen en cuotas." />
          <CampoDinero ancho="c6" nombre="cash" etiqueta="Cash collected" valorCents={cashCents} hero
            onCambio={setCash} simbolo={simbolo}
            pista={<>Solo lo que <b>entró hoy</b>. Si pagó el 50%, va el 50%.</>} />
        </div>

        {avisos.map((a) => (
          <div className="note warn" key={a}><IconoAviso /><span>{a}</span></div>
        ))}
        {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

        <div className="form-actions">
          <span className="helper">Se guarda al enviar y el panel se actualiza al instante.</span>
          <button className="btn-primary" onClick={enviar} disabled={enviando || !personaId} type="button">
            {enviando ? 'Guardando…' : existente ? 'Reemplazar' : 'Enviar reporte'}
          </button>
        </div>
      </div>

      <div className="lado">
        <div className="card">
          <div className="card-head"><div><h3>Lo que estás por mandar</h3><p>se actualiza mientras escribís</p></div></div>
          <div className="calc apilado">
            <Derivado principal etiqueta="Cobrado" valor={dinero(cashCents, simbolo)} />
            <Derivado etiqueta="Asistencia" valor={porcentajeEntero(tasa(asistieron, llamadas))} />
            <Derivado etiqueta="Cierre" valor={porcentajeEntero(tasa(cierres, asistieron))} />
            <Derivado etiqueta="% de cobro" valor={porcentajeEntero(tasa(cashCents, revenueCents))} />
          </div>
        </div>

      {existente && (
        <div className="card">
          <div className="note warn" style={{ marginTop: 0 }}>
            <IconoAviso />
            <span>
              <b>{persona?.nombre} ya cargó el {fechaLarga(fecha)}</b> — {numero(existente.llamadas)} llamadas,{' '}
              {numero(existente.cierres)} cierres y {dinero(existente.cashCents, simbolo)} cobrados.
              Si enviás de nuevo, se <b>reemplaza</b> lo anterior. No se suma.
            </span>
          </div>
          <div className="form-actions">
            <span className="helper">Así el día no se cuenta dos veces.</span>
            <button
              className="btn-ghost" type="button"
              onClick={() => {
                setLlamadas(existente.llamadas); setAsistieron(existente.asistieron)
                setReagendadas(existente.reagendadas); setCierres(existente.cierres)
                setRevenue(existente.revenueCents); setCash(existente.cashCents)
              }}
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
