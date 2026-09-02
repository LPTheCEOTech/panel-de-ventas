'use client'

import { useId } from 'react'

/** El `− n ＋` del mockup. El input queda editable: escribir 24 es más rápido
 *  que apretar 24 veces, y en el celular abre el teclado numérico. */
export function Stepper({
  nombre, valor, onCambio, etiqueta, pista,
}: {
  nombre: string; valor: number; onCambio: (n: number) => void
  etiqueta: string; pista?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta} <span className="req">*</span></label>
      <div className="step">
        {/* 🔴 no baja de 0: un día con −1 llamadas rompe cualquier tasa */}
        <button type="button" onClick={() => onCambio(Math.max(0, valor - 1))} aria-label={`Restar uno a ${etiqueta}`}>−</button>
        <input
          id={id} name={nombre} className="num" inputMode="numeric" value={valor}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ''))
            onCambio(Number.isFinite(n) ? n : 0)
          }}
        />
        <button type="button" onClick={() => onCambio(valor + 1)} aria-label={`Sumar uno a ${etiqueta}`}>＋</button>
      </div>
      {pista && <span className="hint">{pista}</span>}
    </div>
  )
}

/** El input de dinero. Se escribe con separadores y se guarda en centavos. */
export function CampoDinero({
  nombre, valorCents, onCambio, etiqueta, pista, simbolo, hero,
}: {
  nombre: string; valorCents: number; onCambio: (cents: number) => void
  etiqueta: string; pista?: React.ReactNode; simbolo: string; hero?: boolean
}) {
  const id = useId()
  const texto = valorCents === 0 ? '' : Math.round(valorCents / 100).toLocaleString('en-US')
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta} <span className="req">*</span></label>
      <div className={`money-inp${hero ? ' hero' : ''}`}>
        <span className="cur">{simbolo}</span>
        <input
          id={id} name={nombre} className="num" inputMode="decimal" value={texto} placeholder="0"
          onChange={(e) => {
            // se aceptan comas y puntos de miles; el valor real son centavos
            const limpio = e.target.value.replace(/[^\d]/g, '')
            onCambio(limpio === '' ? 0 : Number(limpio) * 100)
          }}
        />
      </div>
      {pista && <span className="hint">{pista}</span>}
    </div>
  )
}

export function Derivado({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="dv">
      <span>{etiqueta}</span>
      <b className="num">{valor}</b>
    </div>
  )
}
