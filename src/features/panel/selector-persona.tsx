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
 */
export function SelectorPersona({
  rango, persona, activas, deBaja,
}: {
  rango: Pick<Rango, 'desde' | 'hasta' | 'atajo'>
  persona?: string
  activas: Opcion[]
  /** Los de baja tienen historia: sus números siguen contando en los períodos en que trabajaron. */
  deBaja: Opcion[]
}) {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  const [optimista, setOptimista] = useState<string | null>(null)

  const nombreDe = (id: string | undefined) =>
    (id && [...activas, ...deBaja].find((p) => p.id === id)?.nombre) || 'Todo el equipo'
  const etiqueta = pendiente && optimista ? optimista : nombreDe(persona)

  function elegir(id: string) {
    setOptimista(nombreDe(id))
    empezar(() => router.push(urlDelPanel(rango, id || undefined)))
  }

  return (
    <label className={`persona-btn${persona ? ' elegida' : ''}`} data-pendiente={pendiente || undefined}>
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
