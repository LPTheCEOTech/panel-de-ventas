import Link from 'next/link'

import { sumarDias, ventana } from '@/shared/calculo/periodo'
import { IconoDerecha, IconoIzquierda } from '@/shared/chasis/iconos'
import type { Periodo, Ventana } from '@/shared/tipos'

const OPCIONES: [Periodo, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']]

/**
 * La fecha de referencia del período ANTERIOR y del SIGUIENTE.
 *
 * 🔴 Se pide un día que caiga adentro de la ventana vecina, no `desde - 1` a
 * secas: para "mes" eso daría el último día del mes anterior, que es correcto,
 * pero para "semana" con el inicio en domingo daría el sábado, y `ventana()`
 * lo volvería a acomodar igual. Un día de adentro siempre resuelve bien.
 */
function saltar(periodo: Periodo, v: Ventana, inicioSemana: 0 | 1, haciaAdelante: boolean) {
  const pivote = haciaAdelante ? sumarDias(v.hasta, 1) : sumarDias(v.desde, -1)
  return ventana(periodo, pivote, inicioSemana).desde
}

/**
 * El toggle Día/Semana/Mes con el paso de fecha al lado. Son enlaces, no
 * botones con estado: así el período vive en la URL, se puede compartir,
 * sobrevive a un refresco y —de paso— hace que la página use `searchParams`,
 * que es lo que la mantiene dinámica en Next.
 *
 * 🔴 Sin las flechas, `?f=` era un parámetro que la interfaz no sabía escribir:
 * el panel solo podía mirar la semana en curso y el historial que la gente
 * carga todos los días quedaba inalcanzable desde la pantalla.
 */
export function SelectorPeriodo({
  actual, fecha, ventanaActual, inicioSemana, esHoy,
}: {
  actual: Periodo
  /** La fecha explícita de la URL, si la hay. */
  fecha?: string
  ventanaActual: Ventana
  inicioSemana: 0 | 1
  /** ¿La ventana que se está viendo es la que contiene a hoy? */
  esHoy: boolean
}) {
  const query = (extra: Record<string, string>) => ({ p: actual, ...extra })
  return (
    <>
      <div className="fnav">
        <Link
          href={{ pathname: '/panel', query: query({ f: saltar(actual, ventanaActual, inicioSemana, false) }) }}
          aria-label={`${{ dia: 'Día', semana: 'Semana', mes: 'Mes' }[actual]} anterior`}
        >
          <IconoIzquierda />
        </Link>
        <span className="div" />
        <Link
          href={{ pathname: '/panel', query: { p: actual } }}
          aria-disabled={esHoy || undefined}
          tabIndex={esHoy ? -1 : undefined}
        >
          Hoy
        </Link>
        <span className="div" />
        <Link
          href={{ pathname: '/panel', query: query({ f: saltar(actual, ventanaActual, inicioSemana, true) }) }}
          aria-label={`${{ dia: 'Día', semana: 'Semana', mes: 'Mes' }[actual]} siguiente`}
        >
          <IconoDerecha />
        </Link>
      </div>

      <div className="modo" role="group" aria-label="Período">
        {OPCIONES.map(([valor, texto]) => {
          const q: Record<string, string> = { p: valor }
          if (fecha) q.f = fecha
          return (
            <Link
              key={valor} href={{ pathname: '/panel', query: q }}
              aria-pressed={valor === actual}
              style={{ textDecoration: 'none' }}
            >
              {texto}
            </Link>
          )
        })}
      </div>
    </>
  )
}
