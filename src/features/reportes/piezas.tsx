'use client'

import { useId } from 'react'

import { EL_GUION } from '@/shared/formato'

/** El `− n ＋` del mockup. El input queda editable: escribir 24 es más rápido
 *  que apretar 24 veces, y en el celular abre el teclado numérico. */
export function Stepper({
  nombre, valor, onCambio, etiqueta, pista, ancho = 'c3',
}: {
  nombre: string; valor: number; onCambio: (n: number) => void
  etiqueta: string; pista?: string
  /** Cuántas de las 12 columnas ocupa. Un contador de dos dígitos no necesita
   *  el mismo ancho que un monto de cinco cifras. */
  ancho?: 'c3' | 'c4' | 'c6' | 'c8'
}) {
  const id = useId()
  return (
    <div className={`field ${ancho}`}>
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
  nombre, valorCents, onCambio, etiqueta, pista, simbolo, hero, ancho = 'c6',
}: {
  nombre: string; valorCents: number; onCambio: (cents: number) => void
  etiqueta: string; pista?: React.ReactNode; simbolo: string; hero?: boolean
  ancho?: 'c3' | 'c4' | 'c6' | 'c8'
}) {
  const id = useId()
  const texto = valorCents === 0 ? '' : Math.round(valorCents / 100).toLocaleString('en-US')
  return (
    <div className={`field ${ancho}`}>
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

export function Derivado({ etiqueta, valor, principal }: { etiqueta: string; valor: string; principal?: boolean }) {
  return (
    <div className={`dv${principal ? ' principal' : ''}`}>
      <span>{etiqueta}</span>
      {/* 🔴 El guion de "todavía no se puede calcular" se apaga: en display 800
          a 34 px un — es una barra negra que parece un dato tachado. */}
      <b className={`num${valor === EL_GUION ? ' sin' : ''}`}>{valor}</b>
    </div>
  )
}
