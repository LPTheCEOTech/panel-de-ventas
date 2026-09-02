import Link from 'next/link'

import type { Barra, FilaRanking, Metricas, PasoEmbudo, Tasa } from '@/shared/calculo/metricas'
import {
  dinero, dineroCorto, iniciales, numero, porcentaje, porcentajeEntero, puntos,
} from '@/shared/formato'
import {
  IconoAviso, IconoCalendario, IconoCash, IconoCheck, IconoDoc, IconoEquipo, IconoInfo,
  IconoMedalla, IconoTelefono, IconoTendencia, IconoTrofeo,
} from '@/shared/chasis/iconos'

export function Dinero({ m, simbolo }: { m: Metricas; simbolo: string }) {
  return (
    <div className="money">
      <div className="mc hero">
        <div className="m-lbl"><IconoCash /> Cash collected</div>
        <div className="m-val num">{dinero(m.cashCents, simbolo)}</div>
        <div className="m-ctx num">
          {m.revenueCents > 0 ? (
            <>Cobrado de <b>{dinero(m.revenueCents, simbolo)}</b> vendidos · <b>{porcentajeEntero(m.porcentajeCobro)}</b> de cobro</>
          ) : (
            'Sin reportes en este período'
          )}
        </div>
        {m.porcentajeCobro !== null && (
          <div className="bar"><i style={{ width: `${Math.min(100, m.porcentajeCobro * 100)}%` }} /></div>
        )}
      </div>
      <div className="mc">
        <div className="m-lbl"><IconoDoc /> Revenue contratado</div>
        <div className="m-val num">{dinero(m.revenueCents, simbolo)}</div>
        <div className="m-ctx num">
          Ticket promedio <b>{m.ticketPromedioCents === null ? '—' : dinero(m.ticketPromedioCents, simbolo)}</b>
          {m.cierres > 0 && <> · <b>{numero(m.cierres)}</b> cierres</>}
        </div>
      </div>
    </div>
  )
}

function Kpi({
  Icono, etiqueta, valor, contexto, diferencia,
}: {
  Icono: React.ComponentType<{ size?: number }>
  etiqueta: string; valor: Tasa; contexto: React.ReactNode; diferencia: number | null
}) {
  const clase = diferencia === null ? 'nil' : diferencia > 0 ? 'up' : diferencia < 0 ? 'down' : 'nil'
  const flecha = diferencia === null || diferencia === 0 ? '' : diferencia > 0 ? '▲ ' : '▼ '
  return (
    <div className="kpi">
      <div className="tile"><Icono /></div>
      <div>
        <div className="kpi-label">{etiqueta}</div>
        <div className="kpi-val num">{porcentaje(valor)}</div>
        <div className="kpi-ctx num">{contexto}</div>
      </div>
      <div className="kdx">
        <span className={`delta ${clase}`}>{flecha}{puntos(diferencia)}</span>
      </div>
    </div>
  )
}

export function Kpis({ m, deltas }: { m: Metricas; deltas: [number | null, number | null, number | null] }) {
  return (
    <div className="kpis">
      <Kpi Icono={IconoCalendario} etiqueta="Tasa de agenda" valor={m.tasaAgenda} diferencia={deltas[0]}
        contexto={<><b>{numero(m.agendas)}</b> agendas de <b>{numero(m.leads)}</b> leads</>} />
      <Kpi Icono={IconoTelefono} etiqueta="Tasa de asistencia" valor={m.tasaAsistencia} diferencia={deltas[1]}
        contexto={<><b>{numero(m.asistieron)}</b> asistieron de <b>{numero(m.llamadas)}</b> llamadas</>} />
      <Kpi Icono={IconoCheck} etiqueta="Tasa de cierre" valor={m.tasaCierre} diferencia={deltas[2]}
        contexto={<><b>{numero(m.cierres)}</b> cierres de <b>{numero(m.asistieron)}</b> asistencias</>} />
    </div>
  )
}

export function Totales({ m }: { m: Metricas }) {
  const filas: [string, number][] = [
    ['Leads', m.leads], ['Agendas', m.agendas], ['Llamadas', m.llamadas], ['Cierres', m.cierres],
  ]
  return (
    <div className="derived">
      {filas.map(([nombre, valor]) => (
        <div className="dv" key={nombre}>
          <span>{nombre}</span>
          <b className="num">{numero(valor)}</b>
        </div>
      ))}
    </div>
  )
}

export function Embudo({ pasos, simbolo, avisoAgendas, deQue }: { pasos: PasoEmbudo[]; simbolo: string; avisoAgendas: boolean; deQue: string }) {
  return (
    <div className="card">
      <div className="card-head"><div><h3>Embudo {deQue}</h3><p>de leads a cash collected</p></div></div>
      <div className="fn">
        {pasos.map((p) => (
          <div className="fnr" key={p.nombre}>
            <span className="fn-n">{p.nombre}</span>
            <span className="fn-track">
              <i className="num" style={{ width: `${p.ancho}%` }}>
                {p.esDinero ? dineroCorto(p.valor, simbolo) : numero(p.valor)}
              </i>
            </span>
            <span className="fn-cv">
              {p.conversion === null || p.conversion.tasa === null ? '—'
                : p.conversion.etiqueta === '' ? '100%'
                : <>{p.conversion.etiqueta} <b>{porcentajeEntero(p.conversion.tasa)}</b></>}
            </span>
          </div>
        ))}
      </div>
      {avisoAgendas && (
        <div className="note">
          <IconoInfo />
          <span>
            Las <b>agendas</b> y las <b>llamadas</b> no tienen por qué coincidir: la agenda la carga
            el setter y la llamada el closer. La diferencia es la que se cae entre los dos.
          </span>
        </div>
      )}
    </div>
  )
}

export function CashPorDia({ barras, simbolo, subtitulo, unidad }: { barras: Barra[]; simbolo: string; subtitulo: string; unidad: 'día' | 'semana' }) {
  // 🔴 El total sale de LAS BARRAS, no de las métricas del período.
  //
  // En modo "Día" el gráfico muestra los últimos 7 días pero las métricas son
  // de uno solo: al dividir el pico por el total del período daba 100% siempre.
  // Sumando las barras, el encabezado y el aviso hablan de lo mismo que se ve.
  const total = barras.reduce((s, b) => s + b.cashCents, 0)
  const pico = barras.find((b) => b.esMaxima)
  // 🔴 Con un solo período con plata, «se llevó el 100%» no dice nada: es
  // aritmética, no un hallazgo. El aviso aparece solo cuando hay con qué comparar.
  const conPlata = barras.filter((b) => b.cashCents > 0).length
  const share = pico && total > 0 && conPlata > 1 ? Math.round((pico.cashCents / total) * 100) : null
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Cash collected por día</h3><p>{subtitulo}</p></div>
        <span className="chip num">{dinero(total, simbolo)}</span>
      </div>
      <div className="days" style={{ gridTemplateColumns: `repeat(${barras.length}, 1fr)` }}>
        {barras.map((b) => (
          <div className={`day${b.esMaxima ? ' hl' : ''}`} key={b.clave}>
            <i style={{ height: `${b.altura}%` }} />
            <em className="num">{b.cashCents > 0 ? dineroCorto(b.cashCents, simbolo) : ''}</em>
            <small>{b.etiqueta}</small>
          </div>
        ))}
      </div>
      {share !== null && pico && (
        <div className="note">
          <IconoTendencia />
          <span>{unidad === 'día' ? 'El día' : 'La semana'} más fuerte se llevó el <b>{share}%</b> de todo el cash del período.</span>
        </div>
      )}
    </div>
  )
}

function Ranking({
  titulo, subtitulo, Icono, filas, formatear, detalle,
}: {
  titulo: string; subtitulo: string; Icono: React.ComponentType<{ size?: number }>
  filas: FilaRanking[]
  formatear: (v: number) => string
  detalle: (f: FilaRanking) => string
}) {
  const tope = filas[0]?.valor ?? 0
  return (
    <div className="card">
      <div className="card-head"><div><h3 className="h3i"><Icono /> {titulo}</h3><p>{subtitulo}</p></div></div>
      {filas.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoEquipo size={22} /></div>
          <h3>Todavía no hay nada que ordenar</h3>
          <p>El ranking aparece en cuanto haya reportes cargados en este período.</p>
        </div>
      ) : (
        <div className="lb">
          {filas.map((f, i) => (
            <div className="lbrow" key={f.persona.id}>
              <span className={`rk${i === 0 ? ' g1' : ''}`}>{i + 1}</span>
              <span className="av2">{iniciales(f.persona.nombre)}</span>
              <span className="lbn">
                <strong>{f.persona.nombre}</strong>
                <small className="num">{detalle(f)}</small>
              </span>
              <span className="lbv">
                <b className="num">{formatear(f.valor)}</b>
                <span className="bar"><i style={{ width: `${tope > 0 ? (f.valor / tope) * 100 : 0}%` }} /></span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RankingClosers({ filas, simbolo }: { filas: FilaRanking[]; simbolo: string }) {
  return (
    <Ranking
      titulo="Ranking · Closers" subtitulo="por cash collected" Icono={IconoTrofeo} filas={filas}
      formatear={(v) => dinero(v, simbolo)}
      detalle={(f) => `${f.detalle.cierres} cierres · ${porcentajeEntero(f.detalle.tasa)} de cierre`}
    />
  )
}

export function RankingSetters({ filas }: { filas: FilaRanking[] }) {
  return (
    <Ranking
      titulo="Ranking · Setters" subtitulo="por agendas" Icono={IconoMedalla} filas={filas}
      formatear={(v) => numero(v)}
      detalle={(f) => `${porcentajeEntero(f.detalle.tasa)} de agenda · ${numero(f.detalle.leads ?? 0)} leads`}
    />
  )
}

/** El aviso de "todavía no hay nadie", que es la primera pantalla de una instalación nueva. */
export function SinEquipo() {
  return (
    <div className="note warn" style={{ marginTop: 0, marginBottom: 14 }}>
      <IconoAviso />
      <span>
        <b>Todavía no hay nadie en el equipo.</b> Cargá a tus setters y closers en{' '}
        <b>Equipo</b> y después van a poder mandar su reporte de fin de día. Hasta
        entonces el panel no tiene de dónde calcular.
      </span>
    </div>
  )
}

export function LlamadaAEquipo() {
  return (
    <div className="card">
      <div className="empty">
        <div className="tile" style={{ width: 44, height: 44 }}><IconoEquipo size={22} /></div>
        <h3>El panel se llena solo</h3>
        <p>
          En cuanto tu equipo empiece a mandar el reporte de fin de día, acá aparecen las tasas,
          el embudo y el ranking. No hay nada que configurar.
        </p>
        <Link className="btn-primary" href="/equipo" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Cargar mi equipo
        </Link>
      </div>
    </div>
  )
}
