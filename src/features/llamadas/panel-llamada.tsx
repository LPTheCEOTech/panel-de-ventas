'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { leadRepetido } from '@/shared/calculo/leads'
import { tasa } from '@/shared/calculo/metricas'
import { esFecha, haceCuanto } from '@/shared/calculo/rango'
import { IconoAviso, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga, porcentajeEntero } from '@/shared/formato'
import type { Llamada, OrigenLead, Persona } from '@/shared/tipos'
import { CampoDinero } from '@/features/reportes/piezas'
import { ListaDelDia } from './lista-del-dia'
import { etiquetaOrigen } from './piezas'

/**
 * 🔴 Fase D · pantalla `/llamada`: formulario chico arriba + lista del día
 * abajo con contador vivo al costado.
 *
 * El closer, al terminar una llamada, marca los tres switches, elige el
 * origen del lead, tipea el revenue y el cash, y guarda. Aparece en la
 * lista. Puede borrar (baja lógica) y el contador y el panel se
 * recalculan al instante.
 *
 * 🔴 La lista y el contador SIGUEN al campo Fecha. Antes la pantalla traía
 * solo las de hoy: al elegir ayer quedaba todo en cero y parecía que las
 * llamadas se habían perdido. Ahora cambiar la fecha pide ese día.
 *
 * `bloqueadoA`: si es vendedor, el server ya sabe quién carga y le manda su
 * personaId. El dueño y el manager reciben el `<select>`, vacío.
 * `nombres`: solo para quien carga por otros; con eso cada fila dice de quién es.
 */
const ORIGENES: readonly OrigenLead[] = ['organico', 'anuncios', 'referidos'] as const

export function PanelLlamada({
  personas, hoy, simbolo, iniciales, bloqueadoA, nombres,
}: {
  personas: Persona[]
  hoy: string
  simbolo: string
  iniciales: Llamada[]
  bloqueadoA?: string
  nombres?: Record<string, string>
}) {
  const router = useRouter()
  const [personaId, setPersonaId] = useState(bloqueadoA ?? '')
  const [fecha, setFecha] = useState(hoy)
  const [leadNombre, setLeadNombre] = useState('')
  // 🔴 Sesión 3 · sin default. Arranca vacío para forzar elección activa;
  // el botón Guardar está disabled hasta que se apriete una píldora.
  const [origenLead, setOrigenLead] = useState<OrigenLead | ''>('')
  const [asistio, setAsistio] = useState(true)
  const [reagendada, setReagendada] = useState(false)
  const [cerro, setCerro] = useState(false)
  const [revenueCents, setRevenue] = useState(0)
  const [cashCents, setCash] = useState(0)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llamadas, setLlamadas] = useState<Llamada[]>(iniciales)
  // 🔴 Cada cambio de fecha numera su pedido: si se elige el 13 y enseguida
  // el 12, la respuesta del 13 puede llegar después y pisar la del 12.
  const pedido = useRef(0)

  const persona = personas.find((p) => p.id === personaId)
  const esHoy = fecha === hoy

  // 🔴 Sesión 3 · Plata pegada a «Cerró». Sin la excepción del cobro anterior.
  const mostrarRevenue = cerro
  const mostrarCash = cerro

  const avisos: string[] = []
  if (cerro && !asistio) avisos.push('Marcaste cerró sin marcar asistió. ¿Cerraste por mensaje después?')

  // Compara contra la lista que está en pantalla: para el dueño y el manager
  // es todo el equipo; para el vendedor, lo suyo (el caso real: el manager ya
  // se la cargó a él).
  const repetida = leadRepetido(leadNombre, llamadas, fecha)

  const contador = useMemo(() => {
    let n = 0, a = 0, c = 0, rev = 0, cash = 0
    for (const l of llamadas) {
      if (!l.activa || l.fecha !== fecha) continue
      n++
      if (l.asistio) a++
      if (l.cerro) c++
      rev += l.revenueCents
      cash += l.cashCents
    }
    return { n, a, c, rev, cash, cierre: tasa(c, a) }
  }, [llamadas, fecha])

  async function cambiarFecha(f: string) {
    setFecha(f)
    // mientras se teclea, el input de fecha pasa por valores vacíos
    if (!esFecha(f)) return
    const n = ++pedido.current
    setCargando(true); setError(null)
    try {
      const r = await fetch(`/api/llamadas?fecha=${f}`)
      const d = await r.json().catch(() => null)
      if (n !== pedido.current) return
      if (!r.ok) {
        setLlamadas([])
        setError(d?.error ?? 'No se pudieron leer las llamadas de ese día.')
        return
      }
      setLlamadas(d.llamadas as Llamada[])
    } catch {
      if (n === pedido.current) setError('No se pudo hablar con el servidor.')
    } finally {
      if (n === pedido.current) setCargando(false)
    }
  }

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const cuerpo = {
        fecha, personaId,
        leadNombre: leadNombre.trim(),
        origenLead,
        asistio, reagendada, cerro,
        // 🔴 si el campo está oculto, mandamos 0 explícitamente. Nunca mandar
        // basura si el usuario tipeó algo y después apagó el switch.
        revenueCents: mostrarRevenue ? revenueCents : 0,
        cashCents: mostrarCash ? cashCents : 0,
        nota: nota.trim() === '' ? null : nota.trim(),
      }
      const r = await fetch('/api/llamadas', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error ?? 'No se pudo guardar.'); return }
      setLlamadas((xs) => [...xs, d.llamada as Llamada])
      // limpia el formulario para la siguiente. `origenLead` vuelve a ''
      // — es una elección por-llamada, no se autoretiene. El closer SÍ se
      // queda: se cargan varias seguidas del mismo.
      setLeadNombre('')
      setOrigenLead('')
      setAsistio(true); setReagendada(false); setCerro(false)
      setRevenue(0); setCash(0); setNota('')
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="what write">
        <IconoLapiz />
        <span>
          Al terminar CADA llamada, regístrala aquí. El panel calcula
          <b> asistencia</b>, <b>cierre</b> y el <b>dinero</b> del día sumando
          las que cargues.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <div className="trabajo">
        <div className="card formcard">
          <div className="section-title">Quién y cuándo</div>
          <div className="form-grid">
            <div className="field c4">
              <label htmlFor="ll-fecha">Fecha <span className="req">*</span></label>
              <input id="ll-fecha" type="date" value={fecha} max={hoy} onChange={(e) => cambiarFecha(e.target.value)} />
            </div>
            <div className="field c8">
              <label htmlFor="ll-closer">Closer <span className="req">*</span></label>
              {bloqueadoA ? (
                <div className="confirma-persona"><b>{persona?.nombre}</b></div>
              ) : (
                <select id="ll-closer" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                  <option value="" disabled>Elige quién hizo la llamada</option>
                  {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="section-title">Con quién</div>
          <div className="form-grid">
            <div className="field c12 full">
              <label htmlFor="ll-lead">Nombre del lead <span className="req">*</span></label>
              <input
                id="ll-lead" type="text" value={leadNombre} maxLength={80}
                placeholder="Nombre y apellido del lead"
                onChange={(e) => setLeadNombre(e.target.value)}
              />
            </div>
          </div>
          {repetida && (
            <div className="note warn">
              <IconoAviso />
              <span>
                <b>{repetida.leadNombre} ya tiene una llamada cargada el {fechaLarga(fecha)}</b>
                {nombres ? ` (${nombres[repetida.personaId] ?? 'otro closer'})` : ' a tu nombre'}.
                Si es la misma, no la cargues de nuevo.
              </span>
            </div>
          )}

          {/* 🔴 Sesión 3 · origen del lead. Obligatorio SIN default; el
              botón Guardar está disabled hasta que se elija una opción. */}
          <div className="section-title">¿De dónde vino el lead? <span className="req">*</span></div>
          <div className="origen-seg" role="radiogroup" aria-label="Origen del lead">
            {ORIGENES.map((v) => (
              <label key={v} className={`opt${origenLead === v ? ' on' : ''}`}>
                <input
                  type="radio" name="origen-lead" value={v}
                  checked={origenLead === v}
                  onChange={() => setOrigenLead(v)}
                />
                {etiquetaOrigen(v)}
              </label>
            ))}
          </div>

          <div className="section-title">Cómo fue esta llamada</div>
          <div className="switches-llamada">
            <label className="sw"><input type="checkbox" checked={asistio} onChange={(e) => setAsistio(e.target.checked)} /> Asistió</label>
            <label className="sw"><input type="checkbox" checked={reagendada} onChange={(e) => setReagendada(e.target.checked)} /> Reagendada</label>
            <label className="sw"><input type="checkbox" checked={cerro} onChange={(e) => setCerro(e.target.checked)} /> Cerró</label>
          </div>

          {(mostrarRevenue || mostrarCash) && (
            <>
              <div className="section-title">Dinero</div>
              <div className="form-grid">
                {mostrarRevenue && (
                  <CampoDinero ancho="c6" nombre="revenue" etiqueta="Revenue contratado" valorCents={revenueCents}
                    onCambio={setRevenue} simbolo={simbolo}
                    pista="Lo que firmó en esta llamada." />
                )}
                <CampoDinero ancho={mostrarRevenue ? 'c6' : 'c8'} nombre="cash" etiqueta="Cash collected"
                  valorCents={cashCents} hero
                  onCambio={setCash} simbolo={simbolo}
                  pista={<>Solo lo que <b>entró en esta llamada</b>.</>} />
              </div>
            </>
          )}

          <div className="form-grid">
            <div className="field c12 full">
              <label htmlFor="ll-nota">Nota (opcional)</label>
              <input id="ll-nota" type="text" value={nota} maxLength={500} placeholder="p. ej. cierra el viernes, mandar contrato"
                onChange={(e) => setNota(e.target.value)} />
            </div>
          </div>

          {avisos.map((a) => (<div className="note warn" key={a}><IconoAviso /><span>{a}</span></div>))}
          {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

          <div className="form-actions">
            <span className="helper">Se guarda al enviar y aparece abajo al instante.</span>
            <button className="btn-primary" onClick={guardar}
              disabled={guardando || !personaId || leadNombre.trim().length < 2 || origenLead === ''}
              type="button">
              {guardando ? 'Guardando…' : 'Guardar llamada'}
            </button>
          </div>
        </div>

        <div className="lado">
          <div className="card">
            <div className="card-head">
              <div>
                <h3>{esHoy ? 'Hoy' : fechaLarga(fecha)}</h3>
                <p>{esHoy ? fechaLarga(fecha) : haceCuanto(fecha, hoy)}</p>
              </div>
            </div>
            <div className="calc apilado">
              <div className="dv principal"><span>Cash del día</span><b className="num">{dinero(contador.cash, simbolo)}</b></div>
              <div className="dv"><span>Llamadas</span><b className="num">{contador.n}</b></div>
              <div className="dv"><span>Asistieron</span><b className="num">{contador.a}</b></div>
              <div className="dv"><span>Cierres</span><b className="num">{contador.c}</b></div>
              <div className="dv"><span>Tasa de cierre</span><b className={`num${contador.cierre === null ? ' sin' : ''}`}>{porcentajeEntero(contador.cierre)}</b></div>
              <div className="dv"><span>Contratado</span><b className="num">{dinero(contador.rev, simbolo)}</b></div>
            </div>
          </div>
        </div>
      </div>

      <ListaDelDia
        llamadas={llamadas} fecha={fecha} esHoy={esHoy} cargando={cargando}
        simbolo={simbolo} nombres={nombres}
        onBorrada={(id) => {
          setLlamadas((xs) => xs.map((l) => (l.id === id ? { ...l, activa: false } : l)))
          router.refresh()
        }}
      />
    </>
  )
}
