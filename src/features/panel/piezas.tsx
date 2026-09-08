import Link from 'next/link'

import type { Barra, FilaRanking, Metricas, PasoEmbudo, Tasa } from '@/shared/calculo/metricas'
import {
  dinero, dineroCorto, iniciales, numero, porcentaje, porcentajeEntero, puntos,
} from '@/shared/formato'
import {
  IconoAviso, IconoCash, IconoEquipo, IconoInfo, IconoMedalla, IconoTendencia, IconoTrofeo,
} from '@/shared/chasis/iconos'

/** Un porcentaje 0–100 listo para meter en un `width`/`height` de CSS. */
function ancho(t: Tasa): string {
  return t === null ? '0%' : `${Math.max(0, Math.min(100, t * 100))}%`
}

/**
 * La tarjeta del dinero: la única pieza con relleno de marca y con sombra de
 * toda la pantalla.
 *
 * 🔴 El revenue contratado NO es una tarjeta hermana. Antes competía de igual a
 * igual con el cash —dos cifras enormes al lado, la segunda siempre más grande
 * que la primera— cuando en realidad es el DENOMINADOR de la primera. Acá vive
 * adentro: en la frase, en el medidor y en el pie.
 */
export function Plata({ m, simbolo }: { m: Metricas; simbolo: string }) {
  return (
    <div className="plata">
      <div className="plata-h">
        <span className="m-lbl"><IconoCash size={14} /> Cash collected</span>
        {m.porcentajeCobro !== null && (
          <span className="chip num">{porcentajeEntero(m.porcentajeCobro)} cobrado</span>
        )}
      </div>
      <div className="plata-v num">{dinero(m.cashCents, simbolo)}</div>
      <div className="plata-ctx num">
        {m.revenueCents > 0
          ? <>de <b>{dinero(m.revenueCents, simbolo)}</b> contratados</>
          : 'Sin reportes en este período'}
      </div>
      {/* la pista se dibuja siempre: ancla la tarjeta y, vacía, no afirma nada */}
      <span className="medidor"><i style={{ width: ancho(m.porcentajeCobro) }} /></span>
      <div className="plata-pie">
        <div>
          <span>Contratado</span>
          <b className="num">{dinero(m.revenueCents, simbolo)}</b>
        </div>
        <div>
          <span>Ticket promedio</span>
          <b className={`num${m.ticketPromedioCents === null ? ' sin' : ''}`}>
            {m.ticketPromedioCents === null ? '—' : dinero(m.ticketPromedioCents, simbolo)}
          </b>
        </div>
        <div>
          <span>Cierres</span>
          <b className="num">{numero(m.cierres)}</b>
        </div>
      </div>
    </div>
  )
}

function Tasa_({
  etiqueta, valor, contexto, diferencia,
}: {
  etiqueta: string; valor: Tasa; contexto: React.ReactNode; diferencia: number | null
}) {
  const clase = diferencia === null ? 'nil' : diferencia > 0 ? 'up' : diferencia < 0 ? 'down' : 'nil'
  const flecha = diferencia === null || diferencia === 0 ? '' : diferencia > 0 ? '▲ ' : '▼ '
  return (
    <div className="tasa">
      <div className="tasa-h">
        <span className="tasa-l">{etiqueta}</span>
        <span className={`delta ${clase}`}>{flecha}{puntos(diferencia)}</span>
      </div>
      <div className="tasa-b">
        <span className={`tasa-v num${valor === null ? ' sin' : ''}`}>{porcentaje(valor)}</span>
        <span className="tasa-c num">{contexto}</span>
      </div>
      <span className="medidor fino"><i style={{ width: ancho(valor) }} /></span>
    </div>
  )
}

/**
 * Las tres tasas, como RENGLONES de una sola tarjeta.
 *
 * 🔴 Eran tres tarjetas de 430 px con un número de 29 px adentro: 85% de aire.
 * Como renglones se leen los tres de un barrido, cada uno lleva su medidor —una
 * tasa es una proporción, y una proporción se ve— y la banda de arriba pasa de
 * nueve cajas a dos piezas.
 */
export function Tasas({ m, deltas }: { m: Metricas; deltas: [number | null, number | null, number | null] }) {
  return (
    <div className="card tasas">
      <Tasa_ etiqueta="Tasa de agenda" valor={m.tasaAgenda} diferencia={deltas[0]}
        contexto={<><b>{numero(m.agendas)}</b> agendas de <b>{numero(m.leads)}</b> leads</>} />
      <Tasa_ etiqueta="Tasa de asistencia" valor={m.tasaAsistencia} diferencia={deltas[1]}
        contexto={<><b>{numero(m.asistieron)}</b> asistieron de <b>{numero(m.llamadas)}</b> llamadas</>} />
      <Tasa_ etiqueta="Tasa de cierre" valor={m.tasaCierre} diferencia={deltas[2]}
        contexto={<><b>{numero(m.cierres)}</b> cierres de <b>{numero(m.asistieron)}</b> asistencias</>} />
    </div>
  )
}

export function Embudo({
  pasos, simbolo, avisoAgendas, deQue,
}: { pasos: PasoEmbudo[]; simbolo: string; avisoAgendas: boolean; deQue: string }) {
  return (
    <div className="card">
      <div className="card-head"><div><h3>Embudo {deQue}</h3><p>de leads a cash collected</p></div></div>
      <div className="fn">
        {pasos.map((p, i) => (
          <div className="fnr" key={p.nombre}>
            <span className="fn-n">
              <strong>{p.nombre}</strong>
              <small>
                {i === 0 ? 'conversaciones iniciadas'
                  : p.conversion === null || p.conversion.tasa === null ? '—'
                  : <>{p.conversion.etiqueta} <b>{porcentajeEntero(p.conversion.tasa)}</b></>}
              </small>
            </span>
            <span className="fn-track"><i style={{ width: `${p.ancho}%` }} /></span>
            <span className="fn-v num">
              {p.esDinero ? dineroCorto(p.valor, simbolo) : numero(p.valor)}
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

export function CashPorDia({
  barras, simbolo, subtitulo, unidad,
}: { barras: Barra[]; simbolo: string; subtitulo: string; unidad: 'día' | 'semana' }) {
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
    <div className="card crece">
      <div className="card-head">
        <div><h3>Cash collected por {unidad}</h3><p>{subtitulo}</p></div>
        <span className="chip num">{dinero(total, simbolo)}</span>
      </div>
      {/* 🔴 La barra vive en su PROPIA pista (`.day-t`). Cuando el alto en % se
          aplicaba a la columna entera —que además llevaba las dos etiquetas— el
          flex le comía a la barra alta lo que las etiquetas necesitaban y todos
          los días salían casi iguales. */}
      <div className="days" style={{ gridTemplateColumns: `repeat(${barras.length}, 1fr)` }}>
        {barras.map((b) => (
          <div className={`day${b.esMaxima ? ' hl' : ''}`} key={b.clave}>
            <span className="day-t"><i style={{ height: `${b.altura}%` }} /></span>
            <em className="num">{b.cashCents > 0 ? dineroCorto(b.cashCents, simbolo) : ''}</em>
            <small>{b.etiqueta}</small>
          </div>
        ))}
      </div>
      {share !== null && (
        <div className="note">
          <IconoTendencia />
          <span>
            {unidad === 'día' ? 'El día' : 'La semana'} más fuerte se llevó el <b>{share}%</b> de
            todo el cash del período.
          </span>
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
      <div className="card-head"><div><h3 className="h3i"><Icono size={15} /> {titulo}</h3><p>{subtitulo}</p></div></div>
      {filas.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoEquipo size={22} /></div>
          <h3>Todavía no hay nada que ordenar</h3>
          <p>El ranking aparece en cuanto haya reportes cargados en este período.</p>
        </div>
      ) : (
        <div className="lb">
          {filas.map((f, i) => (
            /* 🔴 La barra es la franja al PIE del renglón, no un rayita debajo
               del número: ahí parecía un subrayado y no una medida. `--w` es la
               parte que se llevó esa persona sobre el primero. */
            <div
              className="lbrow" key={f.persona.id}
              style={{ '--w': `${tope > 0 ? (f.valor / tope) * 100 : 0}%` } as React.CSSProperties}
            >
              <span className={`rk${i === 0 ? ' g1' : ''}`}>{i + 1}</span>
              <span className="av2">{iniciales(f.persona.nombre)}</span>
              <span className="lbn">
                <strong>{f.persona.nombre}</strong>
                <small className="num">{detalle(f)}</small>
              </span>
              <span className="lbv"><b className="num">{formatear(f.valor)}</b></span>
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
    <div className="note warn" style={{ marginTop: 0, marginBottom: 16 }}>
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
        <Link className="btn-primary" href="/equipo">Cargar mi equipo</Link>
      </div>
    </div>
  )
}
