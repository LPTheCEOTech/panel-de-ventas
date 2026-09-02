import Link from 'next/link'

import type { Periodo } from '@/shared/tipos'

const OPCIONES: [Periodo, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']]

/**
 * El toggle Día/Semana/Mes. Son enlaces, no botones con estado: así el período
 * vive en la URL, se puede compartir, sobrevive a un refresco y —de paso— hace
 * que la página use `searchParams`, que es lo que la mantiene dinámica en Next.
 */
export function SelectorPeriodo({ actual, fecha }: { actual: Periodo; fecha?: string }) {
  return (
    <div className="modo" role="group" aria-label="Período">
      {OPCIONES.map(([valor, texto]) => {
        const query: Record<string, string> = { p: valor }
        if (fecha) query.f = fecha
        return (
          <Link
            key={valor} href={{ pathname: '/panel', query }}
            aria-pressed={valor === actual}
            style={{ textDecoration: 'none' }}
          >
            {texto}
          </Link>
        )
      })}
    </div>
  )
}
