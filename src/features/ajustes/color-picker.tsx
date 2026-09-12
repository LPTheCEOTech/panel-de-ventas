'use client'

import { useEffect, useRef, useState } from 'react'

import { hexToHsv, hexValido, hsvToHex, type Hsv } from './color-utils'

/**
 * 🔴 Fase C (sesion 2) · picker visual estilo Framer/Notion/Linear.
 *
 * Estado interno HSV derivado del hex de entrada. En cada cambio (drag /
 * tipeo) llama a `onCambio(hex)`. Se cierra con click afuera, Enter (aplica)
 * o Esc (revierte al valor con el que se abrió).
 *
 * 🔴 Drag con Pointer Events (funciona en mouse y touch). Captura en window
 * para que el drag no se corte al salir del rect. Cleanup en unmount.
 */
export function ColorPicker({
  valor, onCambio, onCerrar,
}: {
  valor: string
  onCambio: (hex: string) => void
  onCerrar: (aplicar: boolean) => void
}) {
  // 🔴 dos estados y un solo camino: cuando cambia HSV (drag/teclado) también
  // actualizamos hex y llamamos onCambio; cuando el user tipea el input hex,
  // si es válido actualizamos HSV en paralelo. NO usamos useEffect para
  // sincronizar — dispara el warning react-hooks/set-state-in-effect y crea
  // renders en cascada.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(valor))
  const [hexTexto, setHexTexto] = useState(valor.toUpperCase())

  function aplicarHsv(nuevo: Hsv) {
    setHsv(nuevo)
    const h = hsvToHex(nuevo.h, nuevo.s, nuevo.v)
    setHexTexto(h)
    onCambio(h)
  }
  function aplicarHexTexto(texto: string) {
    const t = (texto.startsWith('#') ? texto : '#' + texto).toUpperCase()
    setHexTexto(t)
    if (hexValido(t)) {
      setHsv(hexToHsv(t))
      onCambio(t)
    }
  }

  // click afuera cierra APLICANDO. Refs para no cerrar al hacer click dentro.
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function afuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar(true)
    }
    // pequeño delay: si abrimos con click, ese mismo click no debe cerrarnos
    const t = setTimeout(() => document.addEventListener('mousedown', afuera), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', afuera) }
  }, [onCerrar])

  // teclado global mientras el popover está abierto
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCerrar(false) }
      if (e.key === 'Enter')  { e.preventDefault(); onCerrar(true) }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar])

  return (
    <div className="picker-pop" ref={ref} role="dialog" aria-label="Elegir color">
      <Gradiente hsv={hsv} onCambio={(s, v) => aplicarHsv({ ...hsv, s, v })} />
      <Hue h={hsv.h} onCambio={(h) => aplicarHsv({ ...hsv, h })} />
      <div className="picker-foot">
        <span className="muestra" style={{ background: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
        <input
          className="picker-hex" value={hexTexto} maxLength={7} spellCheck={false}
          aria-label="Color en hexadecimal"
          onChange={(e) => aplicarHexTexto(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}  /* Enter/Esc los maneja el listener global */
        />
      </div>
    </div>
  )
}

/**
 * Rectángulo grande: fondo con dos gradients apilados (blanco→hue puro en X,
 * transparente→negro en Y). Cursor circular posicionado por left/top.
 */
function Gradiente({ hsv, onCambio }: { hsv: Hsv; onCambio: (s: number, v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)

  function calcular(e: PointerEvent | React.PointerEvent) {
    const r = ref.current
    if (!r) return
    const rect = r.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    onCambio(x, 1 - y)
  }

  function abajo(e: React.PointerEvent) {
    arrastrando.current = true
    calcular(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function moviendo(e: React.PointerEvent) {
    if (!arrastrando.current) return
    calcular(e)
  }
  function arriba(e: React.PointerEvent) {
    arrastrando.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const puroDeHue = `hsl(${hsv.h}, 100%, 50%)`
  return (
    <div
      ref={ref} className="picker-grad"
      role="slider" tabIndex={0}
      aria-label="Saturación y brillo"
      aria-valuenow={Math.round(hsv.v * 100)}
      style={{
        background:
          `linear-gradient(to top, #000, transparent), ` +
          `linear-gradient(to right, #fff, ${puroDeHue})`,
      }}
      onPointerDown={abajo} onPointerMove={moviendo} onPointerUp={arriba}
      onKeyDown={(e) => {
        const paso = e.shiftKey ? 0.1 : 0.02
        if (e.key === 'ArrowRight') onCambio(Math.min(1, hsv.s + paso), hsv.v)
        else if (e.key === 'ArrowLeft') onCambio(Math.max(0, hsv.s - paso), hsv.v)
        else if (e.key === 'ArrowUp')   onCambio(hsv.s, Math.min(1, hsv.v + paso))
        else if (e.key === 'ArrowDown') onCambio(hsv.s, Math.max(0, hsv.v - paso))
        else return
        e.preventDefault()
      }}
    >
      <span
        className="picker-grad-cursor"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </div>
  )
}

/** Barra de hue horizontal. */
function Hue({ h, onCambio }: { h: number; onCambio: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)

  function calcular(e: PointerEvent | React.PointerEvent) {
    const r = ref.current
    if (!r) return
    const rect = r.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onCambio(x * 360)
  }
  function abajo(e: React.PointerEvent) { arrastrando.current = true; calcular(e); e.currentTarget.setPointerCapture(e.pointerId) }
  function moviendo(e: React.PointerEvent) { if (arrastrando.current) calcular(e) }
  function arriba(e: React.PointerEvent) { arrastrando.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }

  return (
    <div
      ref={ref} className="picker-hue"
      role="slider" tabIndex={0}
      aria-label="Tono"
      aria-valuenow={Math.round(h)} aria-valuemin={0} aria-valuemax={360}
      onPointerDown={abajo} onPointerMove={moviendo} onPointerUp={arriba}
      onKeyDown={(e) => {
        const paso = e.shiftKey ? 10 : 2
        if (e.key === 'ArrowRight') onCambio((h + paso) % 360)
        else if (e.key === 'ArrowLeft') onCambio((h - paso + 360) % 360)
        else return
        e.preventDefault()
      }}
    >
      <span className="picker-hue-cursor" style={{ left: `${(h / 360) * 100}%` }} />
    </div>
  )
}
