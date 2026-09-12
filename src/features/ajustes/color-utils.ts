/**
 * 🔴 Fase C (sesion 2) · helpers de conversión de color para el picker visual.
 *
 * hex ⇄ hsv usando la fórmula estándar (Wikipedia HSL and HSV). El picker
 * usa HSV porque es más intuitivo para gradient sat/brillo × hue slider —
 * HSL habría requerido conversiones extra en cada handler.
 *
 * 🔴 Idempotencia con tolerancia: `hsvToHex(hexToHsv(x))` puede diferir de
 * `x` en ± 1 unidad por el redondeo del round-trip float. Los tests lo
 * comprueban.
 */

export function hexValido(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

export interface Hsv { h: number; s: number; v: number }

/** hex `#RRGGBB` → `{h: 0-360, s: 0-1, v: 0-1}`. Devuelve `{h:0,s:0,v:0}` para hex inválido. */
export function hexToHsv(hex: string): Hsv {
  if (!hexValido(hex)) return { h: 0, s: 0, v: 0 }
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const v = max
  const s = max === 0 ? 0 : d / max
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s, v }
}

/** `{h,s,v}` → hex `#RRGGBB` en MAYÚSCULAS. */
export function hsvToHex(h: number, s: number, v: number): string {
  const hh = ((h % 360) + 360) % 360 / 60
  const c = v * s
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (hh < 1)      { r = c; g = x; b = 0 }
  else if (hh < 2) { r = x; g = c; b = 0 }
  else if (hh < 3) { r = 0; g = c; b = x }
  else if (hh < 4) { r = 0; g = x; b = c }
  else if (hh < 5) { r = x; g = 0; b = c }
  else             { r = c; g = 0; b = x }
  const dosDig = (n: number) => {
    const s = Math.round((n + m) * 255).toString(16).toUpperCase()
    return s.length === 1 ? '0' + s : s
  }
  return '#' + dosDig(r) + dosDig(g) + dosDig(b)
}
