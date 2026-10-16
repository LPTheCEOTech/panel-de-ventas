'use client'

import { SelectorFechas } from '@/features/panel/selector-fechas'
import { SelectorPersona } from '@/features/panel/selector-persona'
import type { Lista } from './use-lista'

export interface OpcionPersona { id: string; nombre: string; activo: boolean }

/**
 * Los filtros de una lista, en la cabecera de su tarjeta: los MISMOS dos
 * botones del Panel («Todo el equipo» y el período), en modo lista.
 *
 * Sin `personas` (el vendedor, o el gasto, que es del negocio) va solo el de fechas.
 */
export function BarraFiltros<T>({
  lista, hoy, inicioSemana, personas,
}: {
  lista: Lista<T>
  hoy: string
  inicioSemana: 0 | 1
  personas?: OpcionPersona[]
}) {
  return (
    <div className="head-actions">
      {personas && personas.length > 0 && (
        <SelectorPersona
          persona={lista.persona} ocupado={lista.cargando} onElegir={lista.elegirPersona}
          activas={personas.filter((p) => p.activo)}
          deBaja={personas.filter((p) => !p.activo)}
        />
      )}
      {/* `key`: con cada período nuevo el calendario arranca de cero, como en el Panel */}
      <SelectorFechas
        key={`${lista.rango.desde}_${lista.rango.hasta}`}
        rango={lista.rango} hoy={hoy} inicioSemana={inicioSemana}
        onElegir={lista.elegirRango} ocupado={lista.cargando}
      />
    </div>
  )
}
