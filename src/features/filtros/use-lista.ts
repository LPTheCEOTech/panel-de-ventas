'use client'

import { useRef, useState } from 'react'

import { queryDe, type Rango } from '@/shared/calculo/rango'

/** Lo que manda el servidor para una lista: el rango ya resuelto y las filas. */
export interface Pagina<T> {
  rango: Rango
  filas: T[]
  /** Cuántas hay en el período; si es más que `filas`, se cortó en el tope. */
  total: number
}

/**
 * El estado de una lista con filtros (período + persona) de las pantallas de
 * carga. La primera página llega del servidor con la pantalla; cada cambio de
 * filtro se pide a la API con la MISMA query que el Panel.
 *
 * 🔴 Cada pedido se numera: si se elige «Mes pasado» y enseguida «Todo», la
 * respuesta del primero puede llegar después y pisar la del segundo.
 *
 * `clave`: dónde vienen las filas en la respuesta (`llamadas`, `reportes`, `gastos`).
 */
export function useLista<T>(ruta: string, clave: string, inicial: Pagina<T>) {
  const [rango, setRango] = useState<Rango>(inicial.rango)
  const [persona, setPersona] = useState<string | undefined>(undefined)
  const [filas, setFilas] = useState<T[]>(inicial.filas)
  const [total, setTotal] = useState(inicial.total)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pedido = useRef(0)

  async function pedir(r: Pick<Rango, 'desde' | 'hasta' | 'atajo'>, p: string | undefined) {
    const n = ++pedido.current
    setCargando(true); setError(null)
    try {
      const q = new URLSearchParams(queryDe(r))
      if (p) q.set('persona', p)
      const res = await fetch(`${ruta}?${q}`)
      const d = await res.json().catch(() => null)
      if (n !== pedido.current) return
      if (!res.ok || !d) { setError(d?.error ?? 'No se pudo leer la lista. Prueba de nuevo.'); return }
      setRango(d.rango as Rango)
      setFilas(d[clave] as T[])
      setTotal(d.total as number)
    } catch {
      if (n === pedido.current) setError('No se pudo hablar con el servidor. Revisa tu conexión.')
    } finally {
      if (n === pedido.current) setCargando(false)
    }
  }

  return {
    rango, persona, filas, total, cargando, error,
    elegirRango: (r: Pick<Rango, 'desde' | 'hasta' | 'atajo'>) => pedir(r, persona),
    /** `''` = todo el equipo. */
    elegirPersona: (id: string) => {
      const p = id || undefined
      setPersona(p)
      pedir(rango, p)
    },
    /** Vuelve a pedir lo que se está viendo: después de guardar o borrar. */
    recargar: () => pedir(rango, persona),
    /** Para sacar al instante lo que se borró, sin esperar el pedido. */
    setFilas,
  }
}

export type Lista<T> = ReturnType<typeof useLista<T>>
