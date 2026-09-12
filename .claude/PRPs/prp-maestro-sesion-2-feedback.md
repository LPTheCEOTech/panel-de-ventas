# PRP MAESTRO · Sesión 2 — Feedback de Jack revisando el preview

> **Estado: PENDIENTE de aprobación de Jack.** Generado por HQ el 11-sep-2026,
> mirando `panel-de-ventas-kappa.vercel.app` con las Fases A/B/C/D + demo-vivo
> ya deployadas y merged a `main`.
>
> Este archivo es **índice + coordinación** de cinco PRPs hijos. Cada hijo se
> puede arrancar solo con `/bucle-agentico` y trae su propio blueprint.
> Este maestro **no implementa nada**: dice el orden, las dependencias, y las
> reglas globales que ningún hijo puede violar.

---

## 0. De dónde salió esto

Jack, mirando el preview con las 4 fases + la semilla de demo cargada, pidió
cinco cosas concretas, una por pantalla:

1. **EQUIPO** · unificar «Agregar a alguien» e «Invitar por correo» en UN solo
   flujo. Hoy son dos cards separadas; se vuelve un solo formulario donde el
   correo es obligatorio y la invitación se manda siempre.
2. **AJUSTES · Favicon = logo.** El logo que se sube en Ajustes también tiene
   que ser el favicon de la pestaña del navegador, y el `<title>` de la
   pestaña tiene que decir el nombre del panel. Fallback si no hay logo: un
   favicon dibujado con las iniciales (como `.brand-tile`).
3. **AJUSTES · Color picker visual.** Reemplazar el input hex por un panel
   visual (gradient de saturación/brillo + hue slider + preview + hex
   editable), estilo Framer/Notion/Linear. Popover que se cierra con click
   afuera o Enter.
4. **POST LLAMADA** · agregar campo «Nombre del lead» (texto libre,
   obligatorio) + esconder/deshabilitar Revenue y Cash cuando «Cerró» está
   OFF, con excepción para «cobro anterior» (cash sin cierre) — decisión en
   el PRP hijo.
5. **PANEL** · corregir la separación de la banda «Costos» (CAC + Costo por
   asistida): tiene distinto gap/margin que el resto de los `.grid2` del
   panel. Fix en el mockup, no en `globals.css` directo.

Decisiones que **ya tomó Jack** y no se re-preguntan:

| # | Decisión |
|---|---|
| DG1 | **Equipo** deja de tener «alta sin login». Toda alta manda invitación por correo. El admin único (persona=null) sigue existiendo como excepción; se crea en `instalar.mjs` u otro camino, NUNCA desde Equipo. |
| DG2 | **Favicon dinámico**: se prefiere el logo (PNG/JPG/SVG/WebP subido). Fallback = SVG generado en runtime con las iniciales y el color de marca (mismo estilo del `.brand-tile`). |
| DG3 | **Color picker** guarda el hex en `configuracion.marca` como hoy. Sigue disparando el repintado del panel entero. Sigue permitiendo pegar el hex a mano. |
| DG4 | **«Nombre del lead»** es OBLIGATORIO (§4 del hijo). Sin nombre no se guarda la llamada — la lista del día sin contexto no sirve. |
| DG5 | **Cash sin cierre**: se preserva el aviso actual («¿es cash de una venta anterior?») pero los campos ya no llevan asterisco de required cuando `cerró === false`. Sub-decisión (checkbox explícito «cobro anterior» vs. flujo aparte) queda en el PRP hijo. |
| DG6 | **Orden de ejecución acordado: E → A → B → C → D** (visual y autónomos primero; DB al final). |

---

## 1. Las 5 fases

| # | PRP | Objetivo (1 línea) | Estado |
|---|---|---|---|
| **E** | [`prp-sesion-2-panel-gap-costos.md`](./prp-sesion-2-panel-gap-costos.md) | Arreglar la separación entre `.panel-costos` y las bandas de arriba/abajo (fix en mockup + porteo). | ⏳ PENDIENTE |
| **A** | [`prp-sesion-2-equipo-unificado.md`](./prp-sesion-2-equipo-unificado.md) | Un solo formulario en Equipo: nombre + rol + correo → siempre manda invitación. | ⏳ PENDIENTE |
| **B** | [`prp-sesion-2-favicon-y-titulo.md`](./prp-sesion-2-favicon-y-titulo.md) | Favicon dinámico = logo (o SVG con iniciales) + `<title>` = nombre del panel. | ⏳ PENDIENTE |
| **C** | [`prp-sesion-2-color-picker-visual.md`](./prp-sesion-2-color-picker-visual.md) | Popover visual (sat/brillo + hue + hex) reemplazando el input hex de Ajustes. | ⏳ PENDIENTE |
| **D** | [`prp-sesion-2-nombre-lead-y-cerro.md`](./prp-sesion-2-nombre-lead-y-cerro.md) | Campo «Nombre del lead» + Revenue/Cash condicionales al switch «Cerró» (con excepción para cobro anterior). | ⏳ PENDIENTE |

> A medida que cada hijo se cierre, se actualiza su estado a **✅ HECHA** y se
> escribe una línea en la bitácora de este archivo.

---

## 2. Por qué este orden — dependencias reales, no gusto

```
E ──┐
    ├── A ──┐
            ├── B ──┐
                    ├── C ──┐
                            └── D
```

- **E antes que todo**: es puro CSS (mockup + porteo). Autónomo, riesgo cero
  para la lógica. Le devuelve al panel su ritmo visual antes de que Jack lo
  vuelva a ver. Si algo sale mal, se revierte con un porteo.
- **A antes que B/C**: no toca DB pero cambia el flujo de invitación y la
  UI de Equipo — es autónomo pero es una decisión de producto que abre
  camino para que Leandro invite alumnos ya con el modelo final.
- **B antes que C**: ambas viven en `/ajustes`. B toca `layout.tsx`
  (`generateMetadata`) y no toca la tarjeta «Tu negocio»; C toca la fila
  «Color de tu marca» de esa tarjeta. Se hacen en orden para no pisarse
  con conflictos de merge.
- **C antes que D**: C es autónoma (solo Ajustes, sin DB). D es la única
  fase con **migración de BD** (007), toca tipos, kernel, semilla,
  verificador y forma parte del contrato del endpoint `/api/llamadas`. Va
  al final porque, cerrado esto, todo lo anterior tiene que seguir cuadrando
  con el verificador nuevo.
- **D al final**: cambio de modelo más grande (columna nueva, semilla
  actualizada, verificador nuevo).

**Puntos de reversibilidad**: cada fase cierra con `npm run gate` +
`npm run verificar` en verde + foto contra el mockup. Si una fase deja el
gate rojo, no se pasa a la siguiente. **Ni A se apoya sobre una E rota, ni B
sobre una A rota, ni C sobre una B rota, ni D sobre una C rota.**

---

## 3. Reglas globales que aplican a las 5 fases

Nada de esto es nuevo; sale de `CLAUDE.md`, `CLAUDE.panel-de-ventas.md` y
`.claude/memory/`. Se re-escribe acá para que cada agente de Bucle Agéntico
las tenga a la vista antes de empezar.

| Regla | Por qué está |
|---|---|
| **CSS del mockup, nunca `globals.css` a mano.** Circuito: `MOCKUP-APROBADO.html` → `python3 scripts/gemelas.py` → `npm run portar-css`. `@media` en `max-width` (no `min-width`). | Un estilo escrito directo en `globals.css` desaparece en el siguiente porteo. |
| **Cero datos de un negocio en el código.** Lo verifica `scripts/sin-cliente.py`. Nombre, moneda, zona horaria, color y logo viven en `configuracion`. | La plantilla se instala muchas veces. Un nombre olvidado en un componente y el alumno abre SU panel y ve el del otro. |
| **Divisor 0 → `null` en el kernel; se pinta como `EL_GUION` (`—`).** | Una instalación nueva tiene 0 datos. Nada de `NaN`, `0%` ni `Infinity`. |
| **Baja lógica, nunca DELETE.** Se marca `activo=false`. | Un closer que se va no puede borrar el historial. |
| **Cero emoji en la UI.** Iconos SVG inline en `src/shared/chasis/iconos.tsx`. | En una máquina sin fuente de emoji salen cuadraditos. |
| **Español rioplatense en comentarios, con `🔴` para lo que se pagó caro.** | Consistencia del repo. |
| **`proxy.ts`, NUNCA `middleware.ts`.** Next 16 renombró el archivo. | Un `middleware.ts` no da error: no corre. |
| **`export const dynamic = 'force-dynamic'` en `src/app/(app)/layout.tsx`.** | Sin esto, Next 16 prerenderiza y sirve los números del build. |
| **Commits firmados `LPTheCEOTech <tech@lpfinancialservices.info>`.** | Vercel Hobby bloquea deploys con autor distinto. |
| **Nunca `git add -A`.** Stage por nombre. | Un `.env.local` o un temporal metido en un commit ya nos costó. |
| **El gate no es opcional**: `npm run gate` (typecheck + lint + tests + sin-cliente + build) + `npm run verificar` (24 números de oro + 4 gasto + `filasSetter/filasLlamadas`) + **foto**: 1440×900 y 390×844, claro **y** oscuro. | Un verde de terminal no es una entrega. Jack mira la pantalla. |
| **Los alumnos van a clonar este repo.** Nada hardcodeado a Leandro; el instalador tiene que seguir funcionando desde cero. | El repo es la plantilla, no un producto único. |

---

## 4. Checkpoints humanos entre fases

El bucle se **para** al terminar cada fase y espera a Jack. Cada fase entrega:

1. **Mockup actualizado en `MOCKUP-APROBADO.html`** con las pantallas o piezas
   nuevas — porteado con `gemelas.py` + `portar-css.py`, y verificado que
   `globals.css` no tenga cambios a mano.
2. **Foto** en los 4 modos (escritorio/celular × claro/oscuro), abriendo cada
   estado nuevo (popover del color picker, form de Equipo con correo, aviso
   condicional del cash, favicon en la pestaña, etc.).
3. **Gate en verde**: `npm run gate` y `npm run verificar`.
4. **Bitácora**: una entrada en la sección `Bitácora` del PRP de la fase con
   fecha, qué se hizo, qué se descubrió, qué queda.

Jack decide si se pasa a la siguiente fase o se corrige lo que ve.

---

## 5. Lo que este maestro **no** decide (queda al hijo)

- La forma exacta de la migración 007 (sí decide el número: **007**).
- El copy fino de cada aviso, tooltip o etiqueta nueva.
- Los IDs de los `<input>`, las clases nuevas del mockup y los nombres de
  archivo.
- Si el gate se rompe por un caso raro, el hijo tiene autonomía para pedir un
  ajuste al maestro — pero **no** al orden, ni a las reglas globales.

---

## 6. Numeración de migraciones — un solo tren, en orden

| Fase | Migración | Qué agrega |
|---|---|---|
| E | — | Solo CSS. |
| A | — | Solo UI + reuso de endpoints. |
| B | — | Solo `layout.tsx` + generación de favicon. |
| C | — | Solo UI (mockup + popover). |
| D | `supabase/migraciones/007_lead_nombre.sql` | Columna `llamadas.lead_nombre text` NOT NULL con default '' (o nullable + backfill; decide el hijo). |

**🔴 No se cambia una migración ya aplicada.** Si D se equivoca, se crea 008.
Nunca se edita un `.sql` que ya se corrió contra la base de Leandro.

---

## 7. Riesgos globales — se dicen ahora, no cuando muerdan

| # | Riesgo | Mitigación |
|---|---|---|
| 🔴 1 | **E deja el ritmo del panel peor** porque el hijo agrega `margin-top` en `globals.css` a mano en vez de fix en el contenedor del mockup. | Regla dura: `git diff src/app/globals.css` **tiene que ser** solo lo generado por `portar-css.py`. Cualquier otro cambio en el `.css` = rechazado. |
| 🔴 2 | **A rompe la creación del admin único.** Si el flow unificado obliga a correo, el admin (persona=null) no puede crearse desde Equipo — pero **el instalador** sí lo crea. | Confirmar en el hijo A: el instalador sigue creando el admin (persona=null, rol='admin') sin pasar por `/api/equipo`. Ver §5.1 del PRP hijo A. |
| 🔴 3 | **B deja pestañas rotas** si el `<img>` del logo falla como favicon (bucket caído, URL rota). El navegador no tiene `onError` para favicons declarados en `<link>`. | Fallback declarado en el `Metadata`: `icons.icon = [{url: logoUrl}, {url: '/icon.svg'}]` — el navegador cae al segundo si el primero falla (comportamiento estándar de spec). Ver §5.2 del PRP hijo B. |
| 🔴 4 | **C rompe la accesibilidad del color picker.** Un popover custom sin teclado ni ARIA excluye a quien no usa mouse. | El hijo C tiene un criterio de éxito explícito: tab para navegar entre sat/hue/hex, Enter cierra, Esc cancela, click afuera cierra. Y un test unitario del gradient (no del popover entero). |
| 🔴 5 | **D deja el verificador en rojo** porque la semilla de 96 llamadas no tiene `lead_nombre` cargado y el `NOT NULL` bloquea. | El hijo D decide entre (a) nullable + backfill vacío o (b) NOT NULL con default '' + semilla actualizada. Recomendación: **(b)** con nombres deterministas «Lead demo 1/96» en la semilla. |
| 6 | **El mockup queda desfasado** porque una fase agregó CSS a `globals.css` a mano. | Cada PRP hijo tiene en su gate: `git diff src/app/globals.css` tiene que ser vacío después de correr `portar-css`. |
| 7 | **Rebases con Leandro produciendo datos**. Si Leandro empieza a cargar llamadas reales antes de D, la migración 007 tiene que preservarlas. | D **agrega** columna con default, nunca borra; las filas viejas quedan con `lead_nombre = ''` (o NULL) y el panel las muestra como «(sin nombre)». |

---

## 8. Anti-patrones (aplican a las 5 fases)

- ❌ Empezar A sin haber cerrado E con foto y gate.
- ❌ Empezar D antes que C — Ajustes se toca dos veces y se pierde una tarde
  con merges.
- ❌ Editar `src/app/globals.css` a mano.
- ❌ Meter «Leandro», «LP The CEO» o un logo hardcodeado en `src/`.
- ❌ Dejar el aviso «cash sin cierre» sin un checkbox explícito que revele
  Cash cuando `cerro === false` (o cualquier UX que confunda al closer).
- ❌ Un favicon estático en `public/favicon.ico` — el favicon sale de
  `configuracion.logoUrl` o del SVG con iniciales, nunca de un archivo con
  el logo de Leandro.

---

## 9. Bitácora

| Fecha | Fase | Nota |
|---|---|---|
| 2026-09-11 | — | PRP maestro y 5 hijos generados. Estado: PENDIENTE de aprobación de Jack. |
