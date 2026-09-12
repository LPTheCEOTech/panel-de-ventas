# PRP-E · Panel — Consistencia del gap de `.panel-costos`

> **Padre**: [`prp-maestro-sesion-2-feedback.md`](./prp-maestro-sesion-2-feedback.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 1 de 5 · **Depende de**: nada.
> **Autónoma**: solo CSS (mockup + porteo). Se puede arrancar sola con `/bucle-agentico`.

---

## 1. Objetivo

Que la banda de **Costos** (CAC + Costo por asistida) respire igual que el
resto del panel. Hoy tiene un `margin-top` o `margin-bottom` distinto al ritmo
de `.resumen` → `.grid2` → `.grid2`, y se ve como un remiendo.

Estado final: al abrir `/panel` con la semilla de oro, las bandas siguen el
mismo ritmo vertical de arriba a abajo — `.resumen` (Plata + Tasas),
`.panel-costos` (CAC + costo asistida), `.grid2` (embudo + cash/día), `.grid2`
(rankings). Los cuatro huecos entre bandas son iguales. Foto contra el
mockup: cuadra exacto.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| La banda «Costos» tiene DIFERENTE separación (gap/margin-bottom) que el resto de los bloques del panel. La probable causa: se le agregó un `margin-top` a mano al `.panel-costos` para desplazarla, o el `.tasas` que hereda no tiene el `margin-bottom` que los otros `.grid2` sí tienen. | Ver §3, ver §4. Se resuelve en el mockup, no en `globals.css`. |
| Jack lo notó a ojo. Es la señal de que el mockup **no** es el spec literal en ese punto — hay una regla en `globals.css` que no vino del mockup. | Corregir el mockup para que el ritmo salga solo del contenedor, sin `margin-top` extra. |

---

## 3. Criterios de éxito (medibles)

- [ ] En `/panel` con la semilla de oro (semana), la distancia vertical entre:
  - `.resumen` y `.panel-costos`
  - `.panel-costos` y el primer `.grid2` (embudo + cash/día)
  - primer `.grid2` y segundo `.grid2` (rankings)
  es **exactamente la misma** (16 px en escritorio, 12 px en celular — los mismos valores que hoy definen `.grid2` en `globals.css` líneas 243-245 y 813).
- [ ] `git diff src/app/globals.css` después de correr `npm run portar-css`:
  - **NO** contiene un `margin-top` a `.panel-costos`.
  - **SÍ** contiene el ajuste equivalente (por ejemplo `.panel-costos{margin-bottom:16px}` si el patrón lo requiere, o **nada** si el fix es agregar el `<div class="grid2">` correcto en el mockup).
- [ ] El diff **no** introduce ninguna regla nueva a mano en `globals.css`: todo cambio vino de `portar-css.py`.
- [ ] Foto 1440×900 y 390×844 (claro y oscuro) del panel con y sin semilla: los huecos calzan con el mockup.
- [ ] Sin semilla (`DEMO_VACIA=1` o rol miembro que oculta Costos): el ritmo se conserva — el panel salta directo de `.resumen` a `.grid2` sin dejar un hueco doble.
- [ ] `npm run gate` verde, `npm run verificar` sin cambios (no hay números nuevos).

---

## 4. Comportamiento esperado

```
/panel con semilla (admin)
  ↓
  [ page-head ]
  ↓ 16 px
  [ what read ]
  ↓ 16 px
  [ .resumen ] (Plata + Tasas)
  ↓ 16 px    ← este hueco tiene que ser el mismo…
  [ .panel-costos ] (CAC + Costo/asistida)
  ↓ 16 px    ← …que este…
  [ .grid2 ] (Embudo + Cash/día)
  ↓ 16 px    ← …y este.
  [ .grid2 ] (Rankings)

/panel con rol=miembro (Costos oculto)
  ↓
  [ page-head ]
  ↓ 16 px
  [ what read ]
  ↓ 16 px
  [ .resumen ]
  ↓ 16 px    ← al no haber .panel-costos, el hueco sigue siendo uno solo
  [ .grid2 ] (Embudo + Cash/día)
  ↓ 16 px
  [ .grid2 ] (Rankings)
```

En celular:

```
/panel 390 px
  ↓
  [ page-head ]
  ↓ 12 px
  [ .resumen ] (una columna)
  ↓ 12 px
  [ .panel-costos ]
  ↓ 12 px
  [ .grid2 ]
  ↓ 12 px
  [ .grid2 ]
```

---

## 5. Investigación: dónde vive el problema hoy

Contexto de código relevante (paths absolutos):

- **Panel page**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/(app)/panel/page.tsx`
  - Líneas 120-134: la banda `<div className="resumen">…</div>` y `<Costos />`
    se renderizan en secuencia. `<Costos>` sale del componente en
    `src/features/panel/piezas.tsx` línea 79 y monta un `<div className="card tasas">`.
    **NO tiene wrapper `.grid2`** — es una tarjeta suelta, y eso es
    exactamente lo que rompe el ritmo: `.grid2` tiene `margin-bottom:16px`
    (línea 243 de `globals.css`), la tarjeta suelta no lo tiene.
- **CSS del panel** (`globals.css`):
  - Línea 161: `.wrap{padding:20px 22px 44px;max-width:1320px;margin:0 auto}`
  - Línea 243: `.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}`
  - Línea 245: `.grid2:last-child{margin-bottom:0}`
  - Línea 285: `.resumen{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:16px;margin-bottom:16px}`
  - Líneas 783-814 (mobile): `.grid2` y `.resumen` bajan a `gap:12px;margin-bottom:12px`.
- **Mockup**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/MOCKUP-APROBADO.html`
  - Línea 811: `<div class="card tasas panel-costos">…</div>` — tarjeta
    suelta, sin `.grid2` wrapper.

**Diagnóstico probable**: `<div class="card tasas panel-costos">` no tiene
un `margin-bottom` propio (ni el que le daría estar dentro de un `.grid2`),
así que **su hueco hacia el siguiente `.grid2` depende del `margin-top` del
`.grid2`** (que no existe) o de que **el elemento previo** (`.resumen`) le
haya cedido el suyo. Como `.resumen` sí tiene `margin-bottom:16px`, ese
hueco existe **entre `.resumen` y `.panel-costos`**, pero el hueco **entre
`.panel-costos` y el primer `.grid2`** queda a cero o depende de un margin
inventado.

---

## 6. Opciones para el fix (el hijo elige)

**Opción A · Envolver `.panel-costos` en su propio `.grid2` de una columna.**

En el mockup:

```html
<!-- reemplaza -->
<div class="card tasas panel-costos">…</div>

<!-- por -->
<div class="grid2 sola">
  <div class="card tasas panel-costos">…</div>
</div>
```

Y en el mockup:

```css
.grid2.sola{grid-template-columns:1fr}
```

**Pro**: hereda automáticamente el `margin-bottom:16px` (y `gap:16px` no
aplica porque hay un solo hijo). Ritmo consistente sin regla nueva.

**Contra**: agrega un DOM wrapper extra. Componente `<Costos>` no cambia
pero el `page.tsx` tiene que renderizarlo dentro del wrapper.

---

**Opción B · Darle a `.panel-costos` un `margin-bottom` propio.**

En el mockup:

```css
.panel-costos{margin-bottom:16px}
@media (max-width:600px){
  .panel-costos{margin-bottom:12px}
}
```

**Pro**: cambio mínimo, sin tocar el DOM. Una sola regla + su gemela.

**Contra**: introduce una regla `.panel-costos` específica en `globals.css`
que solo aplica a esta tarjeta suelta. Si mañana aparece otra tarjeta suelta
similar, se copia el patrón en vez de reusarlo.

---

**Opción C · Crear una clase reusable `.banda`.**

En el mockup:

```css
.banda{margin-bottom:16px}
.banda:last-child{margin-bottom:0}
@media (max-width:600px){
  .banda{margin-bottom:12px}
}
```

Y en el mockup:

```html
<div class="card tasas panel-costos banda">…</div>
```

**Pro**: reusable. Cualquier tarjeta suelta que se agregue en el futuro se
marca `.banda` y hereda el ritmo. Consistente con `.grid2:last-child` que ya
existe.

**Contra**: agrega vocabulario nuevo al mockup. El hijo tiene que decidir si
vale la pena.

---

**Recomendación del PRP**: **Opción C**. El vocabulario del panel ya tiene
`.resumen`, `.grid2`, `.hoja`, `.wrap`; `.banda` encaja como «cualquier
tarjeta suelta que necesita el ritmo de arriba a abajo». Y `:last-child`
protege de un margin colgado al final.

**El hijo puede argumentar A o B si Jack lo prefiere.** Se documenta en la
bitácora.

---

## 7. Fases internas (para el Bucle Agéntico)

| # | Fase | Qué entrega |
|---|---|---|
| E.1 | **Diagnóstico** | Confirmar (con `git blame` o corriendo `next dev` con y sin `.panel-costos`) que el hueco falta a ese lado. Screenshot ANTES en `docs/screenshots/panel-costos-antes.png` (opcional). |
| E.2 | **Elegir opción** | A / B / C. Documentar decisión en la bitácora. |
| E.3 | **Editar mockup** | `MOCKUP-APROBADO.html`: agregar clase / wrapper / regla. NO tocar `globals.css` directo. |
| E.4 | **Porteo** | `python3 scripts/gemelas.py` + `npm run portar-css`. Verificar: `git diff src/app/globals.css` solo contiene la nueva regla (con su gemela `body[data-view="mobile"]`). |
| E.5 | **Panel** | Si es Opción A: `src/features/panel/piezas.tsx` (o `src/app/(app)/panel/page.tsx`) envuelve `<Costos>` en `<div className="grid2 sola">`. Si es Opción B/C: `src/features/panel/piezas.tsx` — el `<div className="card tasas">` de `<Costos>` gana `panel-costos banda` en su className. |
| E.6 | **Gate + foto** | `npm run gate` verde. Foto en 4 modos (1440/390 × claro/oscuro), con y sin `.panel-costos` (rol admin vs rol miembro para simular). |

---

## 8. Referencias explícitas al repo (paths absolutos)

- **Mockup**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/MOCKUP-APROBADO.html` — línea 811 aprox.
- **CSS generado** (no editar a mano): `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/globals.css` — líneas 243-245 (`.grid2`), 285 (`.resumen`), 783-814 (mobile).
- **Panel page**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/(app)/panel/page.tsx` — líneas 120-134.
- **Componente Costos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/panel/piezas.tsx` — línea 79.
- **Scripts CSS**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/scripts/gemelas.py`, `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/scripts/portar-css.py`.

---

## 9. Números / criterios de "listo"

**No hay números de oro nuevos.** `verificar.mjs` sigue con 24 + 4 + filas.

Sí hay chequeos visuales:

- [ ] En DevTools, con la semilla cargada, medir con la regla:
  - `.resumen` → `.panel-costos`: 16 px
  - `.panel-costos` → primer `.grid2`: 16 px
  - primer `.grid2` → segundo `.grid2`: 16 px
- [ ] En celular (390 px, `body[data-view="mobile"]`): los tres huecos = 12 px.
- [ ] Sin `.panel-costos` (rol miembro): `.resumen` → `.grid2` = 16 px (no 32).

---

## 10. Contraprueba

- Reintroducir a mano un `margin-top:32px` al `.panel-costos` en el mockup y
  re-portear: la foto tiene que verse **peor** que después del fix (huecos
  disparejos). Deshacer.

---

## 11. Recordatorio del gate — antes de decir "listo"

```bash
npm run typecheck     # sin errores
npm run lint          # sin warnings nuevos
npm test              # tests unitarios verdes
npm run sin-cliente   # sin datos de un negocio en el código
npm run build         # build verde por exit code
npm run verificar     # 24 + 4 + filasSetter/filasLlamadas, sin cambios
```

Y **la foto**:

- Escritorio 1440×900 y celular 390×844
- Tema claro **y** oscuro
- Con la semilla cargada: `/panel` con las 4 bandas visibles, ritmo consistente
- Sin `.panel-costos` (simulado con rol miembro o commit temporal que oculta): `/panel` con 3 bandas, ritmo consistente

---

## 12. Anti-patrones

- ❌ Editar `src/app/globals.css` a mano — el próximo porteo lo pisa.
- ❌ Agregar `margin-top` en vez de `margin-bottom` — rompe el `:last-child`
  de las bandas siguientes.
- ❌ Usar `<div style="margin: …">` inline en `page.tsx` — inconsistente con
  el resto del panel.
- ❌ Ignorar la variante celular — la gemela `@media (max-width:600px)` es
  obligatoria, si no `portar-css.py` falla ruidoso.
- ❌ Tocar el orden de las bandas — el orden actual (resumen → costos →
  embudo/cash → rankings) es el spec del mockup y no es alcance de esta fase.

---

## 13. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-11 | PRP generado. Estado: PENDIENTE de aprobación de Jack. |
| 2026-09-11 | **Ejecutado. Opción C (`.banda`).** Mockup: nueva regla `.banda{margin-bottom:16px}` + `:last-child{margin-bottom:0}` + gemela mobile `12px`. `<div class="card tasas panel-costos">` pasa a `panel-costos banda`. Componente `<Costos>` en piezas.tsx gana la clase igual. Porteo limpio (0 huérfanas, 265 reglas). Gate local: typecheck, 37/37 tests, lint, sin-cliente (65 archivos), build (12/12) — todo verde. |
