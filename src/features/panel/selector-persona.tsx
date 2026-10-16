'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { urlDelPanel, type Rango } from '@/shared/calculo/rango'
import { IconoAbajo, IconoPersona } from '@/shared/chasis/iconos'

interface Opcion { id: string; nombre: string }

/**
 * «Ver a»: el Panel de todo el equipo o el de una persona.
 *
 * 🔴 Es un `<select>` nativo, invisible, ENCIMA de un botón con la pinta del
 * de fechas (el truco de la pastilla de rol). Así se maneja con teclado y
 * lector de pantalla como un select de verdad, sin un popover propio.
 *
 * 🔴 La persona vive en la URL, igual que el rango, y cada selector conserva
 * lo que eligió el otro (`urlDelPanel`). Si quien mira no puede pedir a otra
 * persona, el servidor ignora el parámetro: este componente ni se dibuja.
 * En las listas de las pantallas de carga va en modo lista (`onElegir`).
 */
export function SelectorPersona({
  rango, persona, activas, deBaja, onElegir, ocupado,
}: {
  /** El período que se conserva al navegar el Panel. En modo lista no hace falta. */
  rango?: Pick<Rango, 'desde' | 'hasta' | 'atajo'>
  persona?: string
  activas: Opcion[]
  /** Los de baja tienen historia: sus números siguen contando en los períodos en que trabajaron. */
  deBaja: Opcion[]
  /** Modo lista: avisa a quién se eligió (`''` = todo el equipo) en vez de navegar. */
  onElegir?: (id: string) => void
  ocupado?: boolean
}) {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  const [optimista, setOptimista] = useState<string | null>(null)

  const nombreDe = (id: string | undefined) =>
    (id && [...activas, ...deBaja].find((p) => p.id === id)?.nombre) || 'Todo el equipo'
  const cargando = pendiente || !!ocupado
  const etiqueta = cargando && optimista ? optimista : nombreDe(persona)

  function elegir(id: string) {
    setOptimista(nombreDe(id))
    if (onElegir) onElegir(id)
    else empezar(() => router.push(urlDelPanel(rango ?? null, id || undefined)))
  }

  return (
    <label className={`persona-btn${persona ? ' elegida' : ''}`} data-pendiente={cargando || undefined}>
      <IconoPersona />
      <span>{etiqueta}</span>
      <IconoAbajo />
      <select aria-label="Ver a" value={persona ?? ''} onChange={(e) => elegir(e.target.value)}>
        <option value="">Todo el equipo</option>
        {activas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        {deBaja.length > 0 && (
          <optgroup label="De baja">
            {deBaja.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </optgroup>
        )}
      </select>
    </label>
  )
}
