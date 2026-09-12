'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { tasa } from '@/shared/calculo/metricas'
import { IconoAviso, IconoEquis, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, fechaLarga, porcentajeEntero } from '@/shared/formato'
import type { Llamada, Persona } from '@/shared/tipos'
import { CampoDinero } from '@/features/reportes/piezas'

/**
 * 🔴 Fase D · pantalla `/llamada`: formulario chico arriba + lista del día
 * abajo con contador vivo al pie.
 *
 * El closer, al terminar una llamada, marca los tres switches, tipea el
 * revenue y el cash, y guarda. Aparece en la lista. Puede borrar (baja
 * lógica) y el contador y el panel se recalculan al instante.
 *
 * `bloqueadoA`: si es miembro, el server ya sabe quién carga y le manda su
 * personaId. Admin puede recibir un `<select>` (o cargar sin bloquear).
 */
export function PanelLlamada({
  personas, hoy, simbolo, iniciales, bloqueadoA,
}: {
  personas: Persona[]
  hoy: string
  simbolo: string
  iniciales: Llamada[]
  bloqueadoA?: string
}) {
  const router = useRouter()
  const [personaId, setPersonaId] = useState(bloqueadoA ?? personas[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoy)
  const [leadNombre, setLeadNombre] = useState('')
  const [asistio, setAsistio] = useState(true)
  const [reagendada, setReagendada] = useState(false)
  const [cerro, setCerro] = useState(false)
  // 🔴 Fase D (sesion 2) · el caso «cobré una cuota de una venta anterior» es
  // legítimo pero no es «cerró». Antes lo permitíamos con un aviso ambiguo;
  // ahora es un checkbox explícito que revela SOLO el Cash cuando no hubo
  // cierre en esta llamada.
  const [cobroAnterior, setCobroAnterior] = useState(false)
  const [revenueCents, setRevenue] = useState(0)
  const [cashCents, setCash] = useState(0)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llamadas, setLlamadas] = useState<Llamada[]>(iniciales)
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null)

  const persona = personas.find((p) => p.id === personaId)

  // 🔴 Fase D (sesion 2) · condicionales de UI. Revenue solo si cerró.
  // Cash si cerró O si el usuario marcó explícitamente «cobro anterior».
  // Prender «cerró» apaga automáticamente «cobro anterior» (son excluyentes:
  // si cerró en esta llamada, no es cobro de una anterior).
  const mostrarRevenue = cerro
  const mostrarCash = cerro || (!cerro && cobroAnterior)

  const avisos: string[] = []
  if (cerro && !asistio) avisos.push('Marcaste cerró sin marcar asistió. ¿Cerraste por mensaje después?')
  if (!cerro && cobroAnterior) avisos.push('Cash de una venta anterior. No cuenta como cierre nuevo.')

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

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const cuerpo = {
        fecha, personaId,
        leadNombre: leadNombre.trim(),
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
      // limpia el formulario para la siguiente
      setLeadNombre('')
      setAsistio(true); setReagendada(false); setCerro(false); setCobroAnterior(false)
      setRevenue(0); setCash(0); setNota('')
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(id: string) {
    setGuardando(true); setError(null)
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
      setLlamadas((xs) => xs.map((l) => (l.id === id ? { ...l, activa: false } : l)))
      setConfirmarBorrado(null)
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  const delDia = llamadas.filter((l) => l.activa && l.fecha === fecha)

  return (
    <>
      <div className="what write">
        <IconoLapiz />
        <span>
          Al terminar CADA llamada, registrala acá. El panel calcula
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
              <label>Fecha <span className="req">*</span></label>
              <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="field c8">
              <label>Closer <span className="req">*</span></label>
              {bloqueadoA ? (
                <div className="confirma-persona"><b>{persona?.nombre}</b></div>
              ) : (
                <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
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

          <div className="section-title">Cómo fue esta llamada</div>
          <div className="switches-llamada">
            <label className="sw"><input type="checkbox" checked={asistio} onChange={(e) => setAsistio(e.target.checked)} /> Asistió</label>
            <label className="sw"><input type="checkbox" checked={reagendada} onChange={(e) => setReagendada(e.target.checked)} /> Reagendada</label>
            <label className="sw"><input type="checkbox" checked={cerro} onChange={(e) => {
              const v = e.target.checked
              setCerro(v)
              // 🔴 prender «cerró» apaga «cobro anterior» — son excluyentes
              if (v) setCobroAnterior(false)
            }} /> Cerró</label>
          </div>

          {!cerro && (
            <div className="switches-llamada" style={{ marginTop: 6 }}>
              <label className="sw"><input type="checkbox" checked={cobroAnterior} onChange={(e) => setCobroAnterior(e.target.checked)} /> Cobro de venta anterior</label>
            </div>
          )}

          {(mostrarRevenue || mostrarCash) && (
            <>
              <div className="section-title">Plata</div>
              <div className="form-grid">
                {mostrarRevenue && (
                  <CampoDinero ancho="c6" nombre="revenue" etiqueta="Revenue contratado" valorCents={revenueCents}
                    onCambio={setRevenue} simbolo={simbolo}
                    pista="Lo que firmó en esta llamada." />
                )}
                <CampoDinero ancho={mostrarRevenue ? 'c6' : 'c8'} nombre="cash" etiqueta="Cash collected"
                  valorCents={cashCents} hero
                  onCambio={setCash} simbolo={simbolo}
                  pista={cerro
                    ? <>Solo lo que <b>entró en esta llamada</b>.</>
                    : <>Cobro que <b>entró hoy</b> de una venta anterior.</>} />
              </div>
            </>
          )}

          <div className="form-grid">
            <div className="field c12 full">
              <label>Nota (opcional)</label>
              <input type="text" value={nota} maxLength={500} placeholder="p. ej. cierra el viernes, mandar contrato"
                onChange={(e) => setNota(e.target.value)} />
            </div>
          </div>

          {avisos.map((a) => (<div className="note warn" key={a}><IconoAviso /><span>{a}</span></div>))}
          {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

          <div className="form-actions">
            <span className="helper">Se guarda al enviar y aparece abajo al instante.</span>
            <button className="btn-primary" onClick={guardar}
              disabled={guardando || !personaId || leadNombre.trim().length < 2}
              type="button">
              {guardando ? 'Guardando…' : 'Guardar llamada'}
            </button>
          </div>
        </div>

        <div className="lado">
          <div className="card">
            <div className="card-head"><div><h3>Hoy</h3><p>{fechaLarga(fecha)}</p></div></div>
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><div><h3>Llamadas del día</h3><p>{delDia.length} cargadas</p></div></div>
        {delDia.length === 0 ? (
          <div className="empty">
            <div className="tile" style={{ width: 44, height: 44 }}><IconoLapiz size={22} /></div>
            <h3>Todavía no cargaste ninguna</h3>
            <p>Después de cada llamada, marcá los switches y guardá. Van apareciendo acá.</p>
          </div>
        ) : (
          <div className="llamadas-lista">
            {delDia.map((l, i) => (
              <div className="llamada-row" key={l.id}>
                <span className="ll-n">#{i + 1}</span>
                <span className="ll-lead">{l.leadNombre || '(sin nombre)'}</span>
                <div className="ll-badges">
                  <span className={`pill ${l.asistio ? 'set' : 'no'}`}>{l.asistio ? 'asistió' : 'no asistió'}</span>
                  {l.reagendada && <span className="pill clo">reagendada</span>}
                  {l.cerro && <span className="pill amb">cerró</span>}
                </div>
                <span className="ll-cash num">{l.cashCents > 0 ? dinero(l.cashCents, simbolo) : '—'}</span>
                <button
                  className="del" disabled={guardando}
                  title="Borrar (baja lógica)" aria-label="Borrar"
                  onClick={() => setConfirmarBorrado(l.id)}
                >
                  <IconoEquis />
                </button>
              </div>
            ))}
          </div>
        )}

        {confirmarBorrado && (
          <div className="note warn" style={{ marginTop: 12 }}>
            <IconoAviso />
            <span>
              ¿Borrar esta llamada? Se marca inactiva pero queda en el histórico.
              <button type="button" className="btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => borrar(confirmarBorrado)} disabled={guardando}>
                Sí, borrar
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmarBorrado(null)} disabled={guardando}>
                Cancelar
              </button>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
