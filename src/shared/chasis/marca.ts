/**
 * La rampa de color, derivada del hex del negocio.
 *
 * 🔴 Ajustes dice «Todo el verde del panel sale de acá. Cambiálo y cambia
 * todo». Hasta acá eso era mentira: el hex se guardaba en `configuracion` y no
 * lo leía nadie. Una promesa que la pantalla no cumple es peor que no hacerla.
 *
 * Cómo se deriva: del hex se toman TONO y SATURACIÓN, y sobre eso se aplican
 * las dos escalas de abajo, que son las que ya tenía el mockup. Es decir: la
 * forma de la rampa —cuánto aclara m1, cuánto oscurece m7— no se recalcula por
 * marca; se conserva, que es lo que hace que un panel violeta se vea tan
 * armado como el verde. Lo único que viaja es el color.
 *
 * La saturación de cada peldaño se escala por la del hex: una marca apagada
 * (S 30%) no puede tener un m6 al 94% de saturación, porque el botón primario
 * dejaría de ser de su color.
 */

/** [saturación, luminosidad] de m1…m7 en tema claro. Salen del mockup. */
const CLARA: [number, number][] = [
  [46, 94], [46, 86], [53, 70], [52, 51], [88, 33], [94, 26], [94, 17],
]

/** Lo mismo en oscuro: la rampa se da vuelta y sube el piso de saturación. */
const OSCURA: [number, number][] = [
  [55, 11], [53, 16], [72, 28], [72, 38], [69, 46], [75, 53], [79, 72],
]

/**
 * Los neutros TAMBIÉN llevan el tono de la marca.
 *
 * 🔴 Sin esto, un panel violeta queda sobre un papel verde menta y con las
 * pistas de las barras verdes: se ve el acento cambiado, no el panel de otro
 * negocio. Son los mismos valores del mockup leídos en HSL — con la marca por
 * defecto sale la misma pintura.
 *
 * `--card` en claro es blanco puro y se queda blanco: el papel puede tener
 * temperatura, la hoja no.
 */
const NEUTROS_CLAROS: [string, number, number][] = [
  ['bg', 21, 96], ['hueco', 22, 96], ['border', 17, 90], ['line', 18, 94],
  ['ink', 37, 7], ['muted', 10, 40], ['faint', 9, 58],
]

const NEUTROS_OSCUROS: [string, number, number][] = [
  ['bg', 33, 4], ['card', 24, 7], ['hueco', 23, 10], ['border', 19, 15], ['line', 20, 12],
  ['ink', 27, 93], ['muted', 11, 62], ['faint', 8, 46],
]

/** La saturación del hex de referencia del mockup (#00D97E es 100%). */
const SATURACION_BASE = 100

export interface Hsl { h: number; s: number; l: number }

/**
 * `#00D97E` → `{ h: 155, s: 100, l: 42.5 }`.
 *
 * Devuelve `null` para cualquier cosa que no sea `#RRGGBB`: un hex a medio
 * escribir no puede tumbar el render de la app entera.
 */
export function hexAHsl(hex: string): Hsl | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

const redondear = (n: number) => Math.round(n * 10) / 10

function peldanos(base: Hsl, escala: [number, number][]): string[] {
  // la saturación de la marca modula toda la rampa, pero nunca la apaga del
  // todo: sin un piso, un hex casi gris deja los tintes indistinguibles del papel
  const factor = base.s / SATURACION_BASE
  return escala.map(([s, l]) => {
    const sat = base.s === 0 ? 0 : Math.max(8, Math.min(100, s * factor))
    return `hsl(${redondear(base.h)} ${redondear(sat)}% ${l}%)`
  })
}

/** El color del texto que va ENCIMA del color de marca sólido (m6). */
function sobreMarca(base: Hsl, escala: [number, number][]): string {
  const [, l] = escala[5]
  return l < 45 ? '#FFFFFF' : `hsl(${redondear(base.h)} ${redondear(Math.min(60, base.s))}% 8%)`
}

function neutros(base: Hsl, tabla: [string, number, number][]): string[] {
  // los neutros ya son casi grises; su saturación se apaga con la de la marca
  // pero no se amplifica: un papel demasiado teñido deja de ser papel
  const factor = Math.min(1, base.s / SATURACION_BASE)
  return tabla.map(([nombre, s, l]) =>
    `--${nombre}:hsl(${redondear(base.h)} ${redondear(s * factor)}% ${l}%)`)
}

function bloque(base: Hsl, escala: [number, number][], tabla: [string, number, number][]): string {
  const m = peldanos(base, escala)
  return [
    ...m.map((v, i) => `--m${i + 1}:${v}`),
    `--sobre-marca:${sobreMarca(base, escala)}`,
    `--marca:${hslATexto(base)}`,
    ...neutros(base, tabla),
  ].join(';')
}

const hslATexto = (c: Hsl) =>
  `hsl(${redondear(c.h)} ${redondear(c.s)}% ${redondear(c.l)}%)`

/**
 * El `<style>` que reescribe la rampa, o `null` si el hex no sirve.
 *
 * 🔴 Los tres selectores son los MISMOS que trae `globals.css`, en el mismo
 * orden: `:root`, el tema elegido a mano y el del sistema. Pisar solo el
 * primero dejaría el panel oscuro con los verdes viejos, que es justo el caso
 * que nadie mira hasta que un cliente abre la app de noche.
 */
export function estiloDeMarca(hex: string): string | null {
  const base = hexAHsl(hex)
  if (!base) return null
  const claro = bloque(base, CLARA, NEUTROS_CLAROS)
  const oscuro = bloque(base, OSCURA, NEUTROS_OSCUROS)
  return [
    `:root{${claro}}`,
    `:root[data-theme="dark"]{${oscuro}}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${oscuro}}}`,
  ].join('')
}
