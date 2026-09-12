# PRP-C · Ajustes — Color picker visual (popover)

> **Padre**: [`prp-maestro-sesion-2-feedback.md`](./prp-maestro-sesion-2-feedback.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 4 de 5 · **Depende de**: Fase B cerrada (por checkpoint, ambas viven en Ajustes).
> **Autónoma**: no toca BD. Se puede arrancar sola con `/bucle-agentico`.

---

## 1. Objetivo

Reemplazar el input hex de la fila «Color de tu marca» (Ajustes) por un
**popover visual** con:

- Rectángulo grande arriba: **gradient de saturación (X) × brillo (Y)** del hue actual.
- Barra debajo: **hue slider** (0-360, degradado de colores).
- Preview del color seleccionado.
- Input hex editable a la derecha (con la muestra de color).
- (opcional) Dropdown para cambiar entre Hex / RGB / HSL.

El popover se cierra con **click afuera** o **Enter**. Cancelar (Esc) revierte.
Sigue guardando el hex en `configuracion.marca` como hoy, sigue disparando el
repintado del panel entero.

Estado final: en `/ajustes`, la fila «Color de tu marca» muestra la muestra
+ el hex + un botón de picker (o la muestra hace de trigger). Click →
popover con el picker visual. Al elegir → hex actualizado en el input,
color re-derivado en `shared/chasis/marca.ts` al guardar.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| Hoy el color se cambia tipeando el hex (`#00D97E`). Un usuario que no conoce hex tiene que ir a Google, elegir un color en una tool ajena, copiar el hex y pegarlo. Feo. | Picker visual embebido: elegís el color viendo el color, sin salir de Ajustes. |
| El input hex tiene una muestra pequeña (`.color-inp .muestra`, 20×20) que solo confirma lo que ya escribiste. No sirve para explorar colores. | El popover ES el explorador; la muestra sigue ahí como confirmación del estado guardado. |
| Referencia visual: Framer / Notion / Linear tienen el mismo patrón (grande gradient + hue slider + hex). Es un estándar que los usuarios reconocen. | Mismo patrón: no innovamos donde no hace falta. |

---

## 3. Criterios de éxito (medibles)

- [ ] En `/ajustes`, la fila «Color de tu marca» sigue existiendo pero el
  input hex actual pasa a estar **dentro del popover**. En su lugar (o al
  lado), hay un trigger visual: la muestra actual (`.muestra`) hace de
  botón, click abre el popover.
- [ ] El popover contiene:
  - **Rectángulo grande** (`~220×160` px) que muestra el gradient de saturación
    (X, blanco → color puro) × brillo (Y, arriba → color puro, abajo → negro),
    para el `hue` actual.
  - **Cursor circular** sobre el rectángulo, marcando la (s, v) actual.
  - **Barra horizontal** (`~220×12` px) debajo con el gradient de hue
    completo (0-360, `hsl(N, 100%, 50%)`).
  - **Cursor lineal** sobre la barra, marcando el hue actual.
  - **Preview del color** (`~28×28` swatch a la izquierda) + **input hex
    editable** (`#RRGGBB`, 7 chars) a la derecha.
  - (opcional) **Dropdown** «Hex / RGB / HSL» que cambia el formato del
    input. Recomendación: mantener SOLO hex en el primer release.
- [ ] Interacciones:
  - Click/drag en el rectángulo cambia s/v → color se actualiza en tiempo real.
  - Click/drag en la barra cambia hue → color se actualiza.
  - Tipear en el input hex → si es válido (`^#[0-9a-fA-F]{6}$`), actualiza s/v/hue.
  - Enter cierra el popover y aplica el cambio (equivalente a click afuera).
  - Esc cierra sin aplicar (revierte al color anterior a abrir).
  - Click afuera cierra y aplica.
- [ ] Teclado / accesibilidad:
  - Tab navega entre: rectángulo (foco visible), barra, input hex, botón cerrar.
  - Flechas ↑↓←→ mueven el cursor en el rectángulo (paso de 1% s/v).
  - Flechas ←→ en la barra mueven el hue (paso de 1°).
  - Enter en el input hex aplica y cierra.
- [ ] El estado del picker (s, v, h) se deriva del hex actual al abrir. Al
  cerrar aplicando, se convierte de vuelta a hex y se llama a
  `set('marca', hex)` — la misma función que hoy usa el input.
- [ ] La muestra chica en la fila (`.color-inp .muestra`) refleja el color
  actual (mientras el picker está abierto: preview en vivo; al cerrar:
  color aplicado).
- [ ] Al hacer «Guardar ajustes» (botón general de la página), el hex nuevo
  se persiste en `configuracion.marca` y el topbar/panel repintan
  (comportamiento actual, sin cambios).
- [ ] `sin-cliente.py` verde: no hay colores hardcodeados que rompan el
  chequeo (los defaults del picker son grises neutros).
- [ ] Tests unitarios:
  - `hexToHsv(hex)` y `hsvToHex(h, s, v)`: casos redondos (blanco, negro,
    verde puro, magenta) devuelven lo esperado y son inversos.
  - `hexValido(str)`: `#000000`, `#FFFFFF`, `#00D97E` → true; `#00D`,
    `#GGG`, `00D97E` sin # → false.
- [ ] `npm run gate` verde.

---

## 4. Comportamiento esperado

```
Admin abre /ajustes
  ↓
  Fila "Color de tu marca":
    [ ▉ #00D97E ]  ← la muestra hace de trigger
  ↓ click en la muestra
  ↓
  Popover aparece anclado a la fila:
    ┌────────────────────────────────┐
    │                                │
    │   [gradient sat×val 220×160]   │  ← click/drag mueve el cursor ⊕
    │                          ⊕     │
    │                                │
    ├────────────────────────────────┤
    │ [hue slider 220×12]  ▮         │  ← click/drag mueve el marcador ▮
    ├────────────────────────────────┤
    │ [▉] [#00D97E]  ← preview + hex │
    └────────────────────────────────┘
  ↓ user arrastra el cursor a otro punto → nuevo hex se ve en el input
  ↓ user aprieta Enter (o click afuera)
  ↓
  Popover se cierra. La muestra de la fila queda con el nuevo color.
  El botón "Guardar ajustes" queda enabled.
  ↓ user aprieta Guardar
  ↓ POST /api/ajustes { marca: "#3AB0FF", ... }
  ↓ el topbar y el panel entero repintan (deriva marca.ts)

Admin abre el popover, arrastra un color, aprieta Esc:
  → el picker se cierra y la muestra vuelve al color anterior.
```

---

## 5. Investigación y contexto

Referencias absolutas:

- **Panel de Ajustes**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/ajustes/panel.tsx`
  — línea 96 es la fila «Color de tu marca». Estado `c.marca`, setter `set('marca', ...)`.
  Validación actual: `colorValido = /^#[0-9a-fA-F]{6}$/.test(c.marca)` (línea 73).
- **CSS actual del input color**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/globals.css`
  — líneas 697-705 (`.color-inp`, `.color-inp .muestra`, `.color-inp input`).
- **Marca (derivación)**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/marca.ts`
  — deriva los peldaños `--m1..--m7` a partir del hex.
- **Tests de marca**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/marca.test.ts`
  — patrón para tests unitarios de conversión de color.
- **Iconos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/iconos.tsx` — para el icono de cerrar el popover si hace falta.

---

## 6. Decisión clave: ¿componente propio o librería?

**Opción A · Escribirlo desde cero.**
- Ventaja: cero dependencia externa. Pesa poco. Encaja con el vocabulario
  del mockup.
- Desventaja: hay que implementar (y testear) drag, teclado, HSV↔hex, etc.
  Es un componente no trivial pero es un patrón conocido.

**Opción B · Usar `react-colorful`** (o similar, ~2 KB gzipped).
- Ventaja: hecho, testeado, con accesibilidad razonable.
- Desventaja: dependencia nueva, un package a mantener, styling que hay que
  overridear para que encaje con el mockup.

**Opción C · `react-color`** — más pesado, más features. Descartado por peso.

**Recomendación del PRP**: **Opción A**. El componente no es enorme (~150
líneas de TSX + ~40 de CSS) y encaja con la filosofía del repo: mockup +
porteo, sin dependencias que sobran. Los helpers de conversión ya son un
patrón conocido (Wikipedia HSV↔RGB).

**El hijo puede argumentar B si Jack lo prefiere** (por tiempo o por
robustez comprobada). Documenta en la bitácora la elección.

---

## 7. Modelo de implementación (Opción A · custom)

### 7.1 Nuevo componente `src/features/ajustes/color-picker.tsx`

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 🔴 Sesión 2 · Color picker visual estilo Framer/Notion/Linear.
 *
 * Recibe un hex `#RRGGBB`, mantiene estado interno `{h, s, v}` derivado.
 * En cambios (drag/tipeo) llama a `onCambio` con el hex actualizado.
 * Se abre como popover; se cierra con click afuera, Enter o Esc.
 */
export function ColorPicker({
  valor, onCambio, onCerrar,
}: {
  valor: string             // hex #RRGGBB
  onCambio: (hex: string) => void
  onCerrar: (aplicar: boolean) => void
}) {
  // convertir valor → hsv al montar y cuando cambia externamente
  const [hsv, setHsv] = useState(() => hexToHsv(valor))
  const [hex, setHex] = useState(valor)

  // sincronizar hsv → hex y llamar onCambio
  useEffect(() => {
    const h = hsvToHex(hsv.h, hsv.s, hsv.v)
    setHex(h)
    onCambio(h)
  }, [hsv])

  // click afuera cierra aplicando
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function afuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar(true)
    }
    document.addEventListener('mousedown', afuera)
    return () => document.removeEventListener('mousedown', afuera)
  }, [onCerrar])

  // teclado
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar(false)
      if (e.key === 'Enter') onCerrar(true)
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar])

  return (
    <div className="picker-pop" ref={ref} role="dialog" aria-label="Elegir color">
      <GradientRect hsv={hsv} onCambio={(s, v) => setHsv((x) => ({ ...x, s, v }))} />
      <HueBar h={hsv.h} onCambio={(h) => setHsv((x) => ({ ...x, h }))} />
      <div className="picker-foot">
        <span className="muestra" style={{ background: hex }} />
        <input
          className="picker-hex"
          value={hex}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value
            setHex(v)
            if (/^#[0-9a-fA-F]{6}$/.test(v)) setHsv(hexToHsv(v))
          }}
        />
      </div>
    </div>
  )
}
```

**Sub-componentes**:

- `<GradientRect hsv={} onCambio={}>` — SVG o `<canvas>` con dos linear-gradients
  (blanco→hue puro en X, transparente→negro en Y). Un pointer handler
  convierte (x, y) → (s, v). Cursor `⊕` posicionado por CSS con `left/top`.
- `<HueBar h={} onCambio={}>` — degradado horizontal con 6 stops. Pointer
  handler convierte x → h.

**Handlers**: usar `pointerdown` + capturar `pointermove/pointerup` en
`window` durante el drag (patrón estándar). No usar `mousedown` — falla en
touch.

### 7.2 Helpers en el mismo archivo (o nuevo `color-utils.ts`)

```ts
export function hexValido(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  // parse RRGGBB → r,g,b (0-1)
  // convertir con la fórmula estándar (Wikipedia HSL and HSV)
  // devolver { h: 0-360, s: 0-1, v: 0-1 }
}

export function hsvToHex(h: number, s: number, v: number): string {
  // fórmula estándar
  // devolver "#RRGGBB" en mayúsculas
}
```

**🔴 Tests obligatorios** (en `color-utils.test.ts`):

- `hexValido('#00D97E')` → true; `hexValido('#00D')` → false.
- `hsvToHex(0, 0, 1)` → `'#FFFFFF'`.
- `hsvToHex(0, 0, 0)` → `'#000000'`.
- `hsvToHex(120, 1, 1)` → `'#00FF00'`.
- `hsvToHex(hexToHsv('#00D97E'))` es idempotente (o al menos ± 1 unidad por redondeo).

### 7.3 Integración en `panel.tsx`

Cambio en la fila «Color de tu marca» (línea 96):

```tsx
<Fila titulo="Color de tu marca" explicacion="Todo el color del panel sale de acá. Cambiálo y cambia todo.">
  <div className="color-inp" style={{ position: 'relative' }}>
    <button
      type="button"
      className="muestra clic"
      style={colorValido ? { background: c.marca } : undefined}
      onClick={() => setPickerAbierto(true)}
      aria-label="Elegir color de tu marca"
    />
    <input
      value={c.marca} maxLength={7} placeholder="#00D97E" spellCheck={false}
      aria-label="Color de tu marca en hexadecimal"
      onChange={(e) => set('marca', e.target.value)}
    />
    {pickerAbierto && (
      <ColorPicker
        valor={c.marca}
        onCambio={(hex) => set('marca', hex)}
        onCerrar={(aplicar) => {
          if (!aplicar) set('marca', valorAntes.current)  // revertir Esc
          setPickerAbierto(false)
        }}
      />
    )}
  </div>
</Fila>
```

Estado nuevo: `const [pickerAbierto, setPickerAbierto] = useState(false)`.
Ref para el «valor antes de abrir»: `const valorAntes = useRef(c.marca)`.
Al abrir: `valorAntes.current = c.marca; setPickerAbierto(true)`.

### 7.4 CSS (mockup + porteo)

**🔴 En el mockup, no en `globals.css`.**

Nuevas reglas (en el mockup):

```css
.color-inp .muestra.clic{cursor:pointer;border:1px solid var(--linea)}
.color-inp .muestra.clic:focus-visible{outline:2px solid var(--m5);outline-offset:2px}

.picker-pop{
  position:absolute; z-index:20; top:calc(100% + 6px); left:0;
  width:248px; padding:14px; border-radius:12px;
  background:var(--card); border:1px solid var(--linea);
  box-shadow:var(--sombra);
  display:flex; flex-direction:column; gap:10px;
}
.picker-grad{
  position:relative; height:160px; border-radius:8px; cursor:crosshair;
  background:
    linear-gradient(to top, #000, transparent),
    linear-gradient(to right, #fff, hsl(var(--pick-h,120), 100%, 50%));
}
.picker-grad-cursor{
  position:absolute; width:14px; height:14px; border:2px solid #fff;
  border-radius:50%; pointer-events:none; transform:translate(-50%,-50%);
  box-shadow:0 0 0 1px rgba(0,0,0,.3);
}
.picker-hue{
  position:relative; height:12px; border-radius:6px; cursor:pointer;
  background:linear-gradient(to right,
    #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
}
.picker-hue-cursor{
  position:absolute; top:-2px; width:4px; height:16px; background:#fff;
  border:1px solid rgba(0,0,0,.6); border-radius:2px;
  pointer-events:none; transform:translateX(-50%);
}
.picker-foot{display:flex; align-items:center; gap:8px}
.picker-foot .muestra{width:28px; height:28px; border-radius:6px; border:1px solid var(--linea)}
.picker-hex{
  flex:1; padding:8px 10px; font-family:var(--mono, monospace);
  border:1px solid var(--linea); border-radius:6px; background:var(--hueco);
}

/* celular: popover queda anclado abajo del trigger, ocupa hasta el ancho del contenedor */
@media (max-width:600px){
  .picker-pop{width:100%; left:0; right:0}
}
```

Correr `python3 scripts/gemelas.py` + `npm run portar-css`. El `portar-css.py`
falla si falta una gemela.

---

## 8. Fases internas (para el Bucle Agéntico)

| # | Fase | Qué entrega |
|---|---|---|
| C.1 | **Helpers + tests** | `color-utils.ts` con `hexValido`, `hexToHsv`, `hsvToHex`. Tests unitarios. |
| C.2 | **Componente ColorPicker** | `src/features/ajustes/color-picker.tsx` con drag, teclado, click afuera. |
| C.3 | **Integración** | `src/features/ajustes/panel.tsx` reemplaza el input hex por el trigger + popover. |
| C.4 | **Mockup + porteo** | Nuevas reglas en el mockup, `gemelas.py` + `portar-css.py`. |
| C.5 | **Gate + foto** | 4 modos, con el popover abierto, con el drag activo (opcional), con teclado (focus visible). |

---

## 9. Referencias explícitas al repo (paths absolutos)

- **Panel Ajustes**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/ajustes/panel.tsx` — línea 96 (fila color).
- **Componente nuevo**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/ajustes/color-picker.tsx`.
- **Helpers nuevos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/ajustes/color-utils.ts` y `color-utils.test.ts`.
- **Marca (deriva colores del panel)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/marca.ts` — sin cambios; recibe el hex y hace lo suyo.
- **CSS actual**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/globals.css` — líneas 697-705 (`.color-inp`).
- **Mockup**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/MOCKUP-APROBADO.html` — fila color en pantalla `?s=ajustes`; agregar `.picker-pop`, `.picker-grad`, `.picker-hue`, `.picker-foot`.

---

## 10. Números / criterios de "listo"

**No hay números de oro nuevos.**

Chequeos manuales:

- [ ] Abrir el popover → arrastrar en el gradient → el input hex cambia en vivo.
- [ ] Arrastrar el hue slider → el gradient de sat/val cambia de tono; el input hex cambia.
- [ ] Tipear `#3AB0FF` en el input → el cursor del gradient y el marcador del hue slider saltan a esa posición.
- [ ] Enter cierra el popover con el nuevo color aplicado.
- [ ] Esc cierra sin aplicar; la muestra de la fila queda con el color anterior.
- [ ] Click afuera cierra aplicando.
- [ ] Tab navega: muestra → gradient → hue slider → input hex → botón cerrar (si existe).
- [ ] En celular 390 px, el popover no se sale de la pantalla horizontalmente.
- [ ] Después de aplicar y guardar, el topbar y el panel entero cambian de
  color (`marca.ts` deriva los peldaños).

---

## 11. Contraprueba

- Reemplazar temporalmente `set('marca', hex)` en `onCambio` por un no-op →
  arrastrar en el picker no hace nada. Reactivar → sí.
- Cambiar el hex a `#GGG` a mano en el input → el color no cambia (falla la
  regex), pero tampoco crashea.

---

## 12. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar
```

**Foto** (5 estados × 4 modos, agrupables):

- Ajustes con la fila color cerrada (sin popover). Muestra + hex visibles.
- Ajustes con popover abierto, gradient visible, cursor en la esquina.
- Ajustes con popover abierto en celular 390: layout no desborda.
- Ajustes con el drag activo (cursor moviéndose) — opcional.
- Ajustes tras aplicar un color nuevo: topbar del panel cambia.

---

## 13. Anti-patrones

- ❌ Usar `<input type="color">` nativo — el estilo depende del sistema
  operativo, no encaja con el mockup, y no ofrece HSV.
- ❌ Cambiar `c.marca` directamente cada `pointermove` sin throttling — el
  panel repintaría 60 veces por segundo. El picker mantiene su propio
  estado y aplica solo al final (Enter / click afuera).
- ❌ Usar `useDeferredValue` o similares para «arreglar» el rendering
  excesivo — el componente hace lo suyo con su estado local; el padre solo
  recibe el `onCambio` al final.
- ❌ Popover como `<div>` con `position: fixed` centrado — se despega del
  trigger y confunde. Usar `position: absolute` relativo a `.color-inp`.
- ❌ Escribir el CSS directo en `globals.css` — mockup + porteo.
- ❌ Dependencia de una librería sin necesidad (ver §6 Opción A vs B).
- ❌ Cerrar el popover con click adentro del propio popover — el
  `mousedown` handler tiene que verificar que el target está afuera.

---

## 14. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-11 | PRP generado. Estado: PENDIENTE de aprobación de Jack. |
| 2026-09-11 | **Ejecutado. Opción A (custom).** `color-utils.ts` con `hexValido/hexToHsv/hsvToHex`. `color-picker.tsx` con `Gradiente` (rect sat×val) + `Hue` (barra 0-360), drag con Pointer Events (funciona en touch), teclado (flechas con paso 2%, shift = 10%), click afuera cierra aplicando, Enter aplica, Esc revierte al valor previo (que se guarda en un ref antes de abrir). CSS del popover en el mockup: `.picker-pop`, `.picker-grad`, `.picker-hue`, `.picker-foot`, `.picker-hex` + gemela mobile (ocupa el ancho del contenedor). El botón `.muestra.clic` abre el popover; el input hex sigue existiendo al lado y sigue siendo editable a mano. **Aprendizaje**: usar `setState` sincrónico en `useEffect` para sincronizar HSV → hex → onCambio dispara warning `react-hooks/set-state-in-effect` y crea renders en cascada. Fix: dos setters convergen en un solo handler `aplicarHsv()` sin `useEffect`. **Aprendizaje 2**: el test script en `package.json` no incluía `src/features/**/*.test.ts`, había que agregarlo. Gate local: typecheck, **41/41 tests** (4 nuevos), lint, sin-cliente (68), build (11/11) — todo verde. |
