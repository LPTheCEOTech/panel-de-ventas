import { diaDeLista, nombreDelMes } from '@/shared/calculo/rango'
import { IconoDerecha, IconoIzquierda, IconoLapiz } from '@/shared/chasis/iconos'
import { dinero } from '@/shared/formato'
import type { Gasto } from '@/shared/tipos'

/**
 * Los gastos cargados, un mes a la vez. Lo pidió el dueño: «solo me deja
 * poner los gastos, no veo lo que puse para ver si está correcto».
 *
 * Solo dibuja: el mes, la lista y los pedidos los maneja el formulario, que es
 * quien sabe cuándo se guardó algo y tiene que volver a pedir el mes.
 */
export function HistorialGastos({
  mes, mesActual, gastos, cargando, simbolo, enFormulario, onMes, onElegir,
}: {
  /** `AAAA-MM` que se está mirando. */
  mes: string
  /** El mes en curso: la flecha de adelante se apaga ahí (no hay gastos de mañana). */
  mesActual: string
  gastos: Gasto[]
  cargando: boolean
  simbolo: string
  /** La fecha que está en el formulario: su renglón se marca. */
  enFormulario: string
  onMes: (delta: -1 | 1) => void
  onElegir: (g: Gasto) => void
}) {
  const nombre = nombreDelMes(mes)
  const total = gastos.reduce((s, g) => s + g.montoCents, 0)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div><h3>Gastos cargados</h3><p>{cargando ? 'cargando…' : 'toca un día para corregirlo'}</p></div>
        <div className="mes-nav">
          <button type="button" className="cal-flecha" aria-label="Mes anterior" onClick={() => onMes(-1)}>
            <IconoIzquierda />
          </button>
          <b>{nombre}</b>
          <button
            type="button" className="cal-flecha" aria-label="Mes siguiente"
            disabled={mes >= mesActual} onClick={() => onMes(1)}
          >
            <IconoDerecha />
          </button>
        </div>
      </div>

      {gastos.length === 0 ? (
        <div className="gastos-vacio">
          {cargando ? 'Buscando los gastos…' : `No hay gastos cargados en ${nombre.toLowerCase()}.`}
        </div>
      ) : (
        <>
          <div className="gastos-lista">
            {gastos.map((g) => (
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
            <span>Total de {nombre.split(' ')[0].toLowerCase()}</span>
            <b className="num">{dinero(total, simbolo)}</b>
          </div>
        </>
      )}
    </div>
  )
}
