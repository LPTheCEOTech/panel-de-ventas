'use client'

import { tasa } from '@/shared/calculo/metricas'
import { diaDeLista } from '@/shared/calculo/rango'
import { IconoAviso, IconoInfo, IconoLapiz } from '@/shared/chasis/iconos'
import { numero, plural, porcentaje } from '@/shared/formato'
import type { ReporteSetter } from '@/shared/tipos'
import { BarraFiltros, type OpcionPersona } from '@/features/filtros/barra-filtros'
import type { Lista } from '@/features/filtros/use-lista'
import { Quien } from '@/features/llamadas/piezas'

/**
 * Los reportes de setter que ya se cargaron, con los mismos filtros del Panel
 * (persona + período). Como en el gasto, tocar un renglón lo sube al
 * formulario para corregirlo.
 */
export function ReportesCargados({
  lista, hoy, inicioSemana, nombres, setters, enFormulario, onElegir,
}: {
  lista: Lista<ReporteSetter>
  hoy: string
  inicioSemana: 0 | 1
  nombres: Record<string, string>
  /** Las opciones del filtro de persona; sin esto (vendedor) no hay filtro. */
  setters?: OpcionPersona[]
  /** El reporte que está en el formulario: su renglón se marca. */
  enFormulario: { fecha: string; personaId: string }
  onElegir: (r: ReporteSetter) => void
}) {
  const filas = lista.filas
  const agendas = filas.reduce((s, r) => s + r.agendas, 0)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div>
          <h3>Reportes cargados</h3>
          <p>
            {lista.cargando ? 'cargando…'
              : `${plural(lista.total, 'reporte')} · ${plural(agendas, 'agenda')} · toca uno para corregirlo`}
          </p>
        </div>
        <BarraFiltros lista={lista} hoy={hoy} inicioSemana={inicioSemana} personas={setters} />
      </div>

      {filas.length === 0 ? (
        <div className="empty">
          <div className="tile" style={{ width: 44, height: 44 }}><IconoLapiz size={22} /></div>
          <h3>{lista.cargando ? 'Buscando los reportes…' : 'No hay reportes en este período'}</h3>
          <p>Cada setter manda uno al terminar su día. Para ver otros días, cambia el período arriba.</p>
        </div>
      ) : (
        <div className="rep">
          <div className="rep-h">
            <span>Día</span><span>Setter</span><span>Conversaciones</span><span>Agendas</span><span>Tasa</span><span />
          </div>
          {filas.map((r) => (
            <button
              key={`${r.fecha}_${r.personaId}`} type="button" className="rep-row"
              aria-current={(r.fecha === enFormulario.fecha && r.personaId === enFormulario.personaId) || undefined}
              title="Corregir este reporte" onClick={() => onElegir(r)}
            >
              <span className="rep-f">{diaDeLista(r.fecha)}</span>
              <Quien nombre={nombres[r.personaId]} />
              <span className="num">{numero(r.conversaciones)}</span>
              <span className="num">{numero(r.agendas)}</span>
              <span className="rep-tasa num">{porcentaje(tasa(r.agendas, r.conversaciones))}</span>
              <IconoLapiz size={14} />
            </button>
          ))}
        </div>
      )}

      {lista.total > filas.length && (
        <div className="note">
          <IconoInfo />
          <span>
            Se muestran los <b>{numero(filas.length)}</b> más recientes de {numero(lista.total)}.
            Elige un período más corto para ver el resto.
          </span>
        </div>
      )}
      {lista.error && <div className="note warn"><IconoAviso /><span>{lista.error}</span></div>}
    </div>
  )
}
