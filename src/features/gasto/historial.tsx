'use client'

import { diaDeLista } from '@/shared/calculo/rango'
import { IconoAviso, IconoInfo, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero, numero } from '@/shared/formato'
import type { Gasto } from '@/shared/tipos'
import { BarraFiltros } from '@/features/filtros/barra-filtros'
import type { Lista } from '@/features/filtros/use-lista'

/**
 * Los gastos cargados, con el mismo filtro de fechas del Panel. Lo pidió el
 * dueño: «solo me deja poner los gastos, no veo lo que puse para ver si está
 * correcto». Sin filtro de persona: el gasto es del negocio, no de nadie.
 *
 * Tocar un renglón sube ese día al formulario para corregirlo.
 */
export function HistorialGastos({
  lista, hoy, inicioSemana, simbolo, enFormulario, onElegir,
}: {
  lista: Lista<Gasto>
  hoy: string
  inicioSemana: 0 | 1
  simbolo: string
  /** La fecha que está en el formulario: su renglón se marca. */
  enFormulario: string
  onElegir: (g: Gasto) => void
}) {
  const filas = lista.filas
  const total = filas.reduce((s, g) => s + g.montoCents, 0)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div><h3>Gastos cargados</h3><p>{lista.cargando ? 'cargando…' : 'toca un día para corregirlo'}</p></div>
        <BarraFiltros lista={lista} hoy={hoy} inicioSemana={inicioSemana} />
      </div>

      {filas.length === 0 ? (
        <div className="gastos-vacio">
          {lista.cargando ? 'Buscando los gastos…' : 'No hay gastos cargados en este período.'}
        </div>
      ) : (
        <>
          <div className="gastos-lista">
            {filas.map((g) => (
              <button
                key={g.fecha} type="button" className="gasto-row"
                aria-current={g.fecha === enFormulario || undefined}
                title="Corregir este día" onClick={() => onElegir(g)}
              >
                <span className="gr-f">{diaDeLista(g.fecha)}</span>
                <span className="gr-nota">{g.nota ?? ''}</span>
                <span className="gr-monto num">{dinero(g.montoCents, simbolo)}</span>
                <IconoLapiz size={14} />
              </button>
            ))}
          </div>
          <div className="gastos-total">
            <span>Total del período</span>
            <b className="num">{dinero(total, simbolo)}</b>
          </div>
        </>
      )}

      {lista.total > filas.length && (
        <div className="note">
          <IconoInfo />
          <span>
            Se muestran los <b>{numero(filas.length)}</b> más recientes de {numero(lista.total)}: el
            total es de esos. Elige un período más corto para ver el resto.
          </span>
        </div>
      )}
      {lista.error && <div className="note warn"><IconoAviso /><span>{lista.error}</span></div>}
    </div>
  )
}
