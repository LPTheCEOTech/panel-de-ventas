# PRP-001 · Panel de Ventas de LP The CEO — v1

> **Estado: PENDIENTE DE APROBACIÓN DE JACK.** Generado y revisado por HQ el 1-sep-2026.
> Al aprobarse, este archivo se copia al repo nuevo como `.claude/PRPs/prp-panel-de-ventas-v1.md`
> y **ahí** se versiona (la copia del cerebro queda como registro de la entrega).
>
> ⚠️ **No es la app de anuncios.** `LPTheCEOTech/LP-Command-Center` está terminada, en producción
> y **congelada por decisión de Jack**. Acá sólo se lee como referencia de chasis, login y método.
> Ni un commit va a ese repo.

---

## 0. Qué manda y qué quedó viejo

| Fuente | Peso | Nota |
|---|---|---|
| `mockups/leandro-ventas-papel/index.html` (842 líneas, 1-sep) | 🥇 **SPEC LITERAL** | PAPEL v1. Artifact `5c7f825d`. **Manda la piel, el layout y los estados.** ⚠️ Falta que Leandro lo apruebe. |
| `mockups/leandro-cdc/index.html` (533 líneas, 31-jul) | 🥈 histórico | El que Leandro aprobó. Siguen mandando **campos, métricas y textos**; ya no la piel. Ver Enmienda 1. |
| `OUTPUTS/2026-08-17-leandro-cdc-arquitectura-datos.md` | 🥈 vigente | Capas A/B/C y §7 orden de construcción. El Panel de Ventas es su **Fase 1**. |
| `OUTPUTS/2026-08-25-leandro-centro-de-comando-entrega.md` §6 | 🥈 vigente | Los golpes ya pagados. Se portan como reglas, no se redescubren. |
| `OUTPUTS/2026-07-27-leandro-cdc-v1-scope-datamodel.md` | ⚠️ **viejo en un punto** | Dice *"solo rates, sin dinero"*. **Falso desde el 29-jul.** El dinero entra. El resto del doc (forms de Bryan, fórmulas) sigue bueno. |

**Verificado, no recordado:** el mockup se leyó completo; el CSS, el login, el `proxy.ts`, las
migraciones y los scripts de la app de anuncios se leyeron en disco.

---

## 0.bis · ENMIENDA 1 — el design system es **PAPEL v1** (Jack, 1-sep-2026)

Jack pidió PAPEL en vez del oscuro esmeralda del mockup original. **Tiene razón, y por un motivo
que va más allá del gusto:** PAPEL existe justo para esto — *la identidad es del CLIENTE*. Todo su
color sale de **un solo token `--marca`**, que es exactamente la palanca que cada alumno toca al
instalar su copia. El oscuro esmeralda era una piel de una sola vez; PAPEL es la piel de una
plantilla. Además deja las dos apps de Leandro hablando el mismo idioma visual.

**El nuevo spec literal es `mockups/leandro-ventas-papel/index.html`** (842 líneas, construido y
validado por foto el 1-sep). Artifact: https://claude.ai/code/artifact/5c7f825d-17dc-481d-a23e-9c682b8af951
El mockup oscuro `mockups/leandro-cdc/index.html` queda como **registro histórico**: de él siguen
mandando las **pantallas, los campos, las métricas y los textos**; ya **no** manda la piel.

**Qué resuelve el cambio, sin que hubiera que hacer nada:**

| Hueco del análisis original | Estado ahora |
|---|---|
| **H1** Equipo y Ajustes sin pantalla | ✅ **Dibujadas** en el mockup PAPEL. |
| **H2** No hay estado vacío | ✅ **Dibujado** — pantalla «Recién instalado», con tasas en `—` y un aviso ámbar. |
| **§5.4** El mockup es sólo oscuro | ✅ **Ya no.** PAPEL trae claro + oscuro. **Vuelve a aplicar la regla estándar: validar en claro Y oscuro.** |
| **§5.5** El móvil no tiene ni una media query | ✅ **Ya no.** PAPEL es responsive de verdad. Cada regla está escrita **dos veces** (`@media` real + gemela `body[data-view="mobile"]` para la demo), que es el patrón que `portar-css.py` ya sabe portar. **La tabla de traducción de 12 filas se cae: no hace falta.** |
| **Equipo/Ajustes inalcanzables en celular** | ✅ **Se cae.** PAPEL pone el menú **arriba**, y en celular baja a una segunda fila con scroll horizontal. No hay nav de 3 pestañas que deje pantallas afuera. |
| **H5** La semana del mockup no existía en el calendario | ✅ Corregido en el mockup: **20–26 de julio de 2026**, lunes a domingo de verdad. |
| **H6** Las barras dibujadas al 92% | ✅ Corregido: la más alta llega al 100%. |

**Lo que NO cambia:** los campos de los dos formularios, las fórmulas, el modelo de datos, los
números de oro, los invariantes, el login, el instalador y los tres bloqueantes. **H3** (reagendadas
se captura y no se muestra) y **H7** (qué muestran las barras en Día y en Mes) **siguen abiertos tal
como estaban.**

**Defectos que encontró el gate de fotos del mockup PAPEL** (los tres corregidos, y los tres valen
para el build):
1. Los **emoji hacían tofu** en un navegador sin fuente de emoji. PAPEL usa **SVG inline**. Regla
   para el build: **cero emoji en la interfaz.**
2. `.bar` no se dibujaba: era un `<span>`, y `height` no aplica a un elemento inline. En el embudo
   sí funcionaba **por casualidad** — ahí es hijo directo de un grid, que lo blockifica. Regla:
   toda caja con `height` lleva su `display` explícito.
3. `$41.4k` no entraba en la barra del embudo a 390 px. El `min-width` se calculó para `342`, no
   para el rótulo más largo.

---

## 1. Objetivo

Un **panel de métricas de ventas** para LP The CEO donde toda la data entra a mano por **dos
formularios EOD** (setter y closer), y **todo lo derivado se deriva** — tasa de agenda, asistencia,
cierre, % de cobro, ticket promedio, embudo y rankings. Tres pantallas del mockup (Panel · Reporte
Setter · Reporte Closer) más las dos que el mockup nombra en la navegación pero no dibuja (**Equipo**
y **Ajustes**).

Se construye **instalable desde el primer commit**: nada de Leandro quemado en el código. Leandro lo
usa él primero; después cada alumno instala su propia copia con el mismo procedimiento que corramos
nosotros ahora.

---

## 2. Alcance

### Entra
- **Panel de Ventas** — dinero (cash collected + revenue contratado), 3 KPIs con su comparación,
  4 totales, embudo de 6 pasos, cash por día, ranking de closers y de setters. Toggle **día/semana/mes**.
- **Reporte del Setter** — fecha · setter · conversaciones iniciadas · agendas.
- **Reporte del Closer** — fecha · closer · llamadas en agenda · asistieron · reagendadas · cierres
  · revenue contratado · cash collected.
- **Equipo** — alta/baja/edición de setters y closers. *(No dibujada en el mockup: §5.2.)*
- **Ajustes** — nombre del negocio, moneda, zona horaria, inicio de semana. *(Ídem.)*
- **Login** de un usuario, portado de la app de anuncios.
- **Instalador** — un script que crea el esquema, la configuración y el primer usuario.
- **Guía de instalación** para el alumno (documento; el video lo graba Leandro).

### No entra
- Cualquier integración: GHL, Calendly, ManyChat, Meta Ads, Zoom, Whop. **v1 es 100% manual.**
- El **embudo de marketing** (Fase 2 del doc del 17-ago). No está dibujado; sin mockup aprobado no se
  construye.
- Multi-usuario, invitaciones, correos, Resend. **Un solo usuario carga todo.**
- Multi-tenant. Cada alumno tiene su instancia; la app nunca sabe de más de un negocio.
- Reporte por llamada (los *Post Call Reports* de Bryan). LP eligió la versión agregada.
- Head of Sales / rollup de manager.
- Tema claro (§5.4).

---

## 3. Reglas no negociables

1. **El mockup es el spec literal.** Si algo no está en el HTML, no se inventa; si hay que agregarlo
   (Equipo, Ajustes, estados vacíos), se arma **con las clases CSS que el mockup ya define** — §5.3.
1.bis **PAPEL v1 es el sistema visual, y su acento es UN token (`--marca`).** Cero emoji en la interfaz: iconos SVG inline.
2. **Lo derivado se deriva, nunca se guarda.** Cero columnas calculadas, cero totales materializados.
3. **Nada de Leandro en el código.** Ni nombre, ni logo, ni personas, ni URL, ni moneda, ni zona
   horaria. Si aparece un string "Leandro" o "Sofía Lara" fuera de un archivo de semilla marcado como
   demo, es un defecto bloqueante.
4. **Los commits van firmados `LPTheCEOTech <tech@lpfinancialservices.info>` desde el primero.**
5. **El gate es la foto en los dos viewports**, app contra mockup, iterando hasta que coincidan.
6. **Ningún borrado duro de datos del usuario.** Personas se dan de baja (`activo=false`), nunca DELETE.
7. **Nunca `git add -A`.** Stage por nombre.
8. **La app no toca producción de nadie** (no manda mensajes, no escribe en GHL, no llama APIs externas).

---

## 4. Dónde vive — **propuesta a aprobar**

| | Propuesta | Por qué |
|---|---|---|
| **Ruta local** | `/Users/jack/LP THE CEO/LP PANEL DE VENTAS` | Hermana de `LP THE CEO APP`, que ya está ahí. Se ven las dos de un vistazo y no se confunden. |
| **Repo** | `github.com/LPTheCEOTech/panel-de-ventas` (privado, **marcado como Template repository**) | Nombre genérico a propósito: es el mismo repo que el alumno va a clonar con *Use this template* (un clic, sin fork, sin historia ajena). Si se llamara `lp-panel-ventas`, cada alumno arrancaría con el nombre de Leandro. |
| **Proyecto Vercel** | `panel-de-ventas`, cuenta de Leandro, plan Hobby, región `pdx1` | Misma región que su Supabase actual. |
| **Supabase** | proyecto **nuevo**, cuenta de Leandro, región **us-west-2 (Oregon)** | Base aparte: la app de anuncios queda intacta. |
| **Dominio** | por defecto la URL `*.vercel.app`. El mockup dibuja `panel.lpfinancialservices.info` → subdominio opcional, **handoff**. | El dominio no bloquea nada. |
| **Cuentas** | Se usan las que **ya existen a nombre de Leandro**. No se crea ninguna cuenta. | Decisión de Jack #1. |

`gh auth status` está activo como `JackMtz17` con scope `repo`, y la org `LPTheCEOTech` ya existe con
un repo. **Jack aprueba la ruta y el nombre antes de que se cree nada.**

---

## 4.bis · 🔴 Los tres bloqueantes de acceso (verificados el 1-sep, no supuestos)

| # | Qué | Cómo se verificó | Qué destraba y qué necesito |
|---|---|---|---|
| **B1** | **`LPTheCEOTech` NO es una organización: es una cuenta de USUARIO.** Jack es colaborador con push, **sin admin** → **no puede crear el repo nuevo ahí.** | `gh api users/LPTheCEOTech` → `"type":"User"` · `gh api repos/LPTheCEOTech/LP-Command-Center` → `permissions.admin:false` | **Un PAT de esa cuenta** (scope `repo`), **o** que se cree el repo vacío desde esa sesión y se agregue a Jack. Bloquea el push, no el trabajo local. |
| **B2** | **Supabase: sin acceso ninguno.** Y **no hay salida local**: la máquina no tiene Docker (`supabase start` lo necesita) ni Postgres. | `supabase projects list` → `LegacyPlatformAuthRequiredError` · `docker --version` → no existe · `psql` → no existe | **`SUPABASE_ACCESS_TOKEN`** (`sbp_…`, de *Account → Access Tokens* **en la cuenta de Leandro**). Con eso creo el proyecto, saco las 3 claves y corro migraciones + verificador sin pedir nada más. Alternativa: el proyecto creado + `URL` / `anon` / `service_role` (con **Reveal**, nunca copiando los `•`). **Es el que más destraba.** |
| **B3** | **Vercel: el CLI está en la cuenta personal de Jack**; la de Leandro no aparece. | `vercel whoami` → `jackmtz17` · `vercel teams ls` → Vicente y jaymendez, **no LP** | `VERCEL_TOKEN` de su equipo, o `vercel login` con su correo. **Sólo bloquea la Fase 9.** |

**Lo que NO bloquean:** mockup, scaffold, porteo de CSS, responsive, chasis, kernel de cálculo con
sus tests, y la validación por foto de todas las pantallas. Todo eso corre local.

---

## 5. El mockup, leído literal

### 5.1 Inventario de campos — copiado del HTML, no de memoria

**Reporte del Setter** (4 campos, todos obligatorios):

| Campo | Control en el mockup |
|---|---|
| Fecha | `input type="date"` |
| Setter | `select` de personas |
| Conversaciones iniciadas | stepper `− n ＋` |
| Agendas | stepper |

Pie vivo: `📈 Tu tasa de agenda de hoy: 33.3% (8 de 24)`.

**Reporte del Closer** (8 campos, todos obligatorios):

| Campo | Control |
|---|---|
| Fecha | `input type="date"` |
| Closer | `select` de personas |
| Llamadas en agenda | stepper |
| Asistieron (show-ups) | stepper |
| Reagendadas | stepper |
| Cierres | stepper |
| Revenue contratado | `cash-inp` — *"El total que firmaron hoy, aunque lo paguen en cuotas."* |
| Cash collected | `cash-inp hero` — *"Solo lo que **entró hoy** en la llamada. Si pagó el 50%, va el 50%."* |

Pie vivo: `📞 Hoy: asistencia 67% · cierre 50% · cobraste $3,500 de $6,000 (58%)`.

**Panel** — dinero (cash `$41,400` protagonista + revenue `$69,000` con ticket promedio y nº de
cierres) · 3 KPIs (agenda 30.4% · asistencia 65.6% · cierre 36.5%, cada uno con `N de M` y un chip
de comparación) · 4 totales (Leads 342 · Agendas 104 · Llamadas 96 · Cierres 23) · embudo de 6 filas
(Leads→Agendas→Llamadas→Asistieron→Cierres→Cash) · barras de cash por día (L M M J V S D) · ranking
de closers por cash y de setters por agendas.

### 5.2 🔴 Lo que el mockup NO resuelve — los 7 huecos que encontró la revisión de HQ

| # | Hueco | Resolución de HQ |
|---|---|---|
| **H1** | **Equipo y Ajustes están en la barra lateral** (`.nlink.sm`, líneas 256-257) **pero no tienen pantalla dibujada.** *Matiz sobre el encargo: la entrada de navegación sí existe; lo que falta es la pantalla.* | Se construyen con el vocabulario CSS que el mockup ya define (§5.3). Sin Equipo, el alumno instala su copia y se encuentra con los vendedores de ejemplo de Leandro. |
| **H2** | **No hay ningún estado vacío.** Una instalación limpia tiene 0 personas y 0 reportes: todas las tasas son `0÷0`. | **Regla dura: todo divisor 0 renderiza `—`, nunca `NaN` ni `0.0%`.** Panel vacío = totales en 0, tasas en `—`, y un `.note` que dice el siguiente paso. Los selectores sin personas se deshabilitan y apuntan a `/equipo`. Es la primera pantalla que ve el alumno; si sale rota, la plantilla no sirve. |
| **H3** | **`Reagendadas` se captura y no se muestra en ninguna parte** del panel. | Se sigue capturando (está en el form aprobado y en el modelo probado de Bryan) y **no se le agrega tarjeta**: agregarla sería desviarse del mockup aprobado. Queda listado como *capturado, no mostrado* y va a la conversación de v1.1 con Leandro. |
| **H4** | **El chip de comparación (`▲ +2.1 pts`) no dice contra qué compara.** | Contra el **período inmediatamente anterior de la misma longitud**: día→día anterior, semana→semana anterior, mes→mes anterior. Si el período anterior no tiene datos → `chip flat` con `—`. *(El mockup ya define `.chip.flat` y no la usa en ningún lado: está ahí justo para este caso.)* |
| **H5** | **La semana del mockup no existe en el calendario.** Dice *"Semana 21–27 de julio"* con barras `L M M J V S D`, pero el **21-jul-2026 es martes** y el **27 es lunes**. Es arte de demo, no una regla. | **Semana = lunes a domingo**, que es lo que dicen las barras. Configurable en Ajustes (`inicio_semana`), por defecto lunes. |
| **H6** | **Las barras de cash por día están dibujadas con la más alta al 92%,** no al 100%. No hay valores ni escala declarada. | `altura% = valor ÷ máximo del período × 100`. La más alta llega al tope. Es la única lectura no arbitraria; el 92% es arte. |
| **H7** | **El toggle día/semana/mes sólo está dibujado en el estado "Semana".** No se sabe qué muestran las barras ni el embudo en *Día* y en *Mes*. | Embudo, KPIs, totales y rankings: misma estructura, otra ventana. Barras: *Día* → los últimos 7 días (iniciales de esos días); *Semana* → lun-dom; *Mes* → una barra por semana del mes (`S1…S5`). |

**Además, dos cosas del mockup que se portan tal cual aunque parezcan errores:**
- El panel dice **"Leads"** (totales, embudo, `de 342 leads`) y el formulario dice **"Conversaciones
  iniciadas"**. Es el mismo número. Se porta la inconsistencia: son las dos palabras que Leandro
  aprobó. Queda escrito acá para que nadie lo "arregle" a mitad del build.
- **Agendas (104) ≠ Llamadas en agenda (96).** No es un bug: la primera la carga el setter y la
  segunda el closer, son dos fuentes distintas. El embudo lo muestra a propósito (`de agenda 92%`).

### 5.3 El vocabulario CSS alcanza para las pantallas que faltan

El mockup define 16 clases que no usa en ningún lado: `.note`, `.pill.ok`, `.pill.warn`, `.steps`,
`.step`, `.no`, `.sb`, `.chip.flat`, `.tot.derived`, `.fn-bar.dim`, `.field.full`, `.conn`, `.cn`,
`.logo`, `.spend`, `.dim`. **Equipo, Ajustes, los estados vacíos y la página de la guía se construyen
con ellas** — más `.card`, `.field`, `.inp`, `.submit`, `.lb-row` y `.av`, que ya se usan.

**Regla: cero CSS nuevo.** Si una pantalla nueva necesita un estilo que el mockup no tiene, se para y
se consulta, no se inventa.

### 5.4 ~~🔴 El mockup es SÓLO oscuro~~ — **SUPERADO por la Enmienda 1**

No tiene toggle de tema, no tiene `:root[data-theme]`, no tiene `@media (prefers-color-scheme)`. Es
un solo esquema: fondo `#0a0f0d`, verde esmeralda `#059669`, tipografía del sistema. **Distinto de la
app de anuncios**, que sí tiene los dos temas (PAPEL v1).

**Decisión: la app es oscura, sin toggle.** La regla estándar de validar *claro + oscuro* no aplica
acá porque el claro no existe en el spec aprobado; inventarlo sería des-especificar. **La validación
por foto corre igual en los dos viewports, en oscuro.** Si Leandro pide tema claro, es una revisión
del mockup primero.

### 5.5 ~~🔴 El móvil no tiene ni una media query~~ — **SUPERADO por la Enmienda 1**

Ésta es la diferencia grande con la app de anuncios, y hay que verla antes de empezar: el mockup de
ventas tiene **una sola `@media` en 533 líneas** — `prefers-reduced-motion`. La vista de celular es un
**árbol de DOM separado** dentro de un marco `.phone`, con modificadores `.m` y estilos en línea.

Portar el CSS con un script **no alcanza**: el responsive hay que **escribirlo**, traduciendo cada
modificador. Se hace de forma mecánica y auditable — un DOM único, el escritorio como base, y un
bloque `@media (max-width:600px)` derivado de esta tabla:

| Origen en el mockup | Regla móvil a escribir |
|---|---|
| `.kpis.m{grid-template-columns:1fr;gap:11px}` | `.kpis{grid-template-columns:1fr;gap:11px}` |
| `.kpis.m .kpi{display:flex;justify-content:space-between}` | ídem sobre `.kpi` |
| `.kpis.m .k-val{font-size:34px;margin-top:0}` | ídem |
| `.tots.m{grid-template-columns:1fr 1fr}` | ídem sobre `.tots` |
| `.money.m{grid-template-columns:1fr}` + `.mc{min-height:0}` + `.m-val:30px` + `.cash .m-val:36px` | ídem |
| `.fnr style="grid-template-columns:74px 1fr"` (en línea, 6 veces) | `.fnr{grid-template-columns:74px 1fr}` y **la columna de conversión (`.fn-cv`) se oculta** |
| `.cols{grid-template-columns:1fr 340px}` | `.cols{grid-template-columns:1fr}` |
| `.side` (barra lateral) | se oculta; aparece `.mnav` fija abajo (82px, `padding-bottom:14px`) |
| `.topbar h1:25px` → `.hd h1:26px` | tamaños de la cabecera móvil |
| `.fgrid{1fr 1fr}` | `.fgrid{grid-template-columns:1fr}` (el móvil usa columna única con `gap:14px`) |
| ranking: `.lb-val .pct` en vez de `.mini` | closers: se oculta `.mini` y se muestra `.pct` con el % de cierre. Setters: **ni barrita ni %**, sólo el número de agendas (verificado: `.pct` aparece 3 veces, `.mini` 6) |
| `.seg` | `align-self:flex-start` |

Lo que **no** se porta: `.phone`, `.mscreen`, `.statusbar`, `.window`, `.winbar`, `.ctl-row`, `.tg`,
`.tabs`, `.lede`, `.new`, `#view-pc`, `#view-mobile` — es andamiaje de la demo.

🔴 **Y hay un agujero de alcanzabilidad:** la nav móvil tiene **3 pestañas** (Panel · Setter · Closer).
**Equipo y Ajustes no se pueden alcanzar desde el celular.** Se resuelve con un botón en la cabecera
móvil (`.hd` ya está en `space-between` con un solo hijo — el hueco está reservado) que abre una hoja
con Equipo · Ajustes · Salir, hecha con `.card` y `.nlink`. *Estar y poder llegar no son lo mismo.*

---

## 6. Arquitectura

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Vercel. Igual que la app de
anuncios, sin Tailwind: **CSS plano portado del mockup**.

```
src/
  app/
    login/                     pantalla + CSS module          (portado)
    (app)/
      layout.tsx               export const dynamic = 'force-dynamic'   🔴
      panel/page.tsx           /panel        — el dashboard
      reporte-setter/page.tsx  /reporte-setter
      reporte-closer/page.tsx  /reporte-closer
      equipo/page.tsx          /equipo
      ajustes/page.tsx         /ajustes
      page.tsx                 /  → redirect a /panel
    api/
      auth/login|logout        (portado)
      reportes/setter|closer   POST, valida con zod y hace upsert
      equipo/                  POST/PATCH — alta, edición, baja lógica
      ajustes/                 PATCH
  proxy.ts                     🔴 NO middleware.ts            (portado)
  shared/
    datos/       sesion.ts · sesion-reglas.ts · supabase/{cliente,esquemas,capa}.ts
    calculo/     metricas.ts · periodo.ts · invariantes.ts · metricas.test.ts
    chasis/      nav.tsx · topbar-movil.tsx · tarjeta.tsx · stepper.tsx · campo-dinero.tsx
    formato/     dinero, porcentaje, fecha — con la regla del divisor 0
  features/
    panel/       dinero.tsx · kpis.tsx · totales.tsx · embudo.tsx · barras.tsx · ranking.tsx
    reportes/    form-setter.tsx · form-closer.tsx · calculo-vivo.ts
    equipo/      lista.tsx · alta.tsx
supabase/migraciones/  001_esquema.sql · 002_permisos.sql
scripts/  instalar.mjs · portar-css.py · usuario.mjs · semilla.mjs · verificar.mjs · db.mjs
MOCKUP-APROBADO.html   ← copia byte-idéntica, verificada con `cmp`
```

**Reglas de arquitectura portadas de la app de anuncios (leídas en el código, no de memoria):**

- **`proxy.ts`, no `middleware.ts`.** Next 16 renombró el archivo *y* la función. Un `middleware.ts`
  no da error: **simplemente no corre** — la app quedaría sin login y con un archivo que parece
  hacerlo.
- **`export const dynamic = 'force-dynamic'` en el layout de `(app)`.** Sin eso, Next 16 prerenderiza
  cualquier página que no use `searchParams` ni `cookies()` **aunque lea de la base**, e invisible en
  `next dev`. Leandro cargaría un reporte, vería el panel viejo y no entendería nada.
- **`next lint` no existe** en Next 16. El script es `eslint .`.
- Los datos los lee el **servidor con `service_role`**. La `anon key` se usa **sólo** para la sesión.
- **Un solo lugar decide quién entra:** el proxy. No se repite el chequeo en el layout.

---

## 7. Modelo de datos

```sql
-- una sola fila, id fijo = 1. Todo lo del negocio, nada en el código.
create table configuracion (
  id             int primary key default 1 check (id = 1),
  nombre_negocio text not null,          -- "LP Ventas" en la barra lateral
  iniciales      text not null,          -- la pastilla del avatar del pie
  usuario_nombre text not null,          -- "Leandro P."
  usuario_rol    text not null default 'Dueño',
  moneda         text not null default 'USD',
  simbolo        text not null default '$',
  zona_horaria   text not null default 'America/New_York',
  inicio_semana  smallint not null default 1 check (inicio_semana in (0,1)),
  actualizado_en timestamptz not null default now()
);

create type rol_persona as enum ('setter','closer','ambos');

create table personas (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null,
  rol      rol_persona not null,
  activo   boolean not null default true,     -- baja LÓGICA, nunca delete
  es_demo  boolean not null default false,    -- lo que planta la semilla
  orden    int not null default 0,
  creado_en timestamptz not null default now()
);
create unique index personas_nombre_unico on personas (lower(nombre));

create table reportes_setter (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  persona_id  uuid not null references personas(id),
  conversaciones int not null check (conversaciones >= 0),
  agendas        int not null check (agendas >= 0),
  es_demo     boolean not null default false,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- 🔴 EL invariante. Sin esto, un doble envío del EOD duplica el día en silencio.
  unique (fecha, persona_id)
);

create table reportes_closer (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  persona_id  uuid not null references personas(id),
  llamadas    int not null check (llamadas    >= 0),
  asistieron  int not null check (asistieron  >= 0),
  reagendadas int not null check (reagendadas >= 0),
  cierres     int not null check (cierres     >= 0),
  revenue_cents bigint not null check (revenue_cents >= 0),
  cash_cents    bigint not null check (cash_cents    >= 0),
  es_demo     boolean not null default false,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (fecha, persona_id)
);
```

**Las decisiones del esquema, con su porqué:**

1. **`unique (fecha, persona_id)`** — *el invariante va en el esquema.* Validarlo sólo en el formulario
   deja tres lugares para equivocarse; la restricción no deja ninguno. Si un setter reenvía su día, la
   app se lo dice (*"ya cargaste el 27-jul: 24 conversaciones / 8 agendas — ¿reemplazar?"*) y hace
   **upsert**. Sin esto, el panel suma dos veces y nadie se entera.
2. **Dinero en centavos (`bigint`), nunca `float`.** Se formatea al mostrar.
3. **Cero columnas derivadas.** No existe `tasa_agenda`, no existe `total_semana`. Un test de esquema
   falla si aparece una.
4. **Baja lógica.** `activo=false` en vez de DELETE: un closer que se va no puede borrar el historial
   que produjo. Los selectores muestran sólo `activo=true`; los rankings históricos siguen mostrando
   a los inactivos que tuvieron actividad en el período.
5. **`es_demo`** marca lo que planta la semilla de verificación. `semilla.mjs --limpiar` borra
   **exactamente** las filas con esa marca. Un seeder que estampa sobre filas reales ya nos costó
   antes; acá no puede.
6. **Permisos explícitos a `service_role`, revocados a `anon` y `authenticated`** (migración 002,
   portada de `004_permisos.sql` de la app de anuncios: las tablas creadas por conexión directa **no**
   heredan los GRANT de Supabase y la app falla con *permission denied* aunque use `service_role`).
7. **RLS prendido sin políticas**, a propósito: no es multi-tenant, todo pasa por el servidor.

---

## 8. Las métricas — fórmula por fórmula

Todas se calculan en `shared/calculo/metricas.ts`, sobre las filas del período. **Ninguna se guarda.**

| Métrica | Fórmula | Se muestra como |
|---|---|---|
| Leads | Σ `conversaciones` | `342` |
| Agendas | Σ `agendas` | `104` |
| Llamadas | Σ `llamadas` | `96` |
| Asistieron | Σ `asistieron` | `63` |
| Cierres | Σ `cierres` | `23` |
| Revenue contratado | Σ `revenue_cents` | `$69,000` |
| Cash collected | Σ `cash_cents` | `$41,400` |
| **Tasa de agenda** | Agendas ÷ Leads | `30.4%` + `104 agendas de 342 leads` |
| **Tasa de asistencia** | Asistieron ÷ Llamadas | `65.6%` + `63 asistieron de 96 llamadas` |
| **Tasa de cierre** | Cierres ÷ Asistieron | `36.5%` + `23 cierres de 63 asistencias` |
| % de cobro | Cash ÷ Revenue | `60% de cobro` |
| Ticket promedio | Revenue ÷ Cierres | `$3,000` |
| Embudo `de agenda` | Llamadas ÷ Agendas | `92%` |
| Ranking closers | orden desc por Cash; sub: `N cierres · X% cierre` | barra `.mini` relativa al 1º |
| Ranking setters | orden desc por Agendas; sub: `X% tasa de agenda` | ídem |
| Chip de comparación | `tasa(período) − tasa(período anterior)`, en **puntos** | `▲ +2.1 pts` / `▼ −1.5 pts` / `flat —` |

**Reglas de presentación, sin excepción:**
- **Divisor 0 → `—`.** Nunca `NaN`, nunca `0.0%`, nunca `Infinity`. Aplica a las 3 tasas, al % de
  cobro, al ticket promedio y a los chips.
- Tasas grandes con **un decimal** (`30.4%`); tasas dentro del ranking y del embudo, **enteras**
  (`32%`, `92%`) — es como está en el mockup.
- Dinero: `$41,400` (sin decimales, separador de miles). El símbolo sale de `configuracion`.
- Rankings: **todas** las personas con actividad en el período, ordenadas. El mockup muestra 3 porque
  hay 3, no porque sea un tope.

---

## 9. Login

Se **porta** de `LP-Command-Center`, archivo por archivo (`proxy.ts`, `sesion.ts`,
`sesion-reglas.ts`, `api/auth/login`, `api/auth/logout`, `login/page.tsx`, `login.module.css`),
adaptando la piel al CSS de este mockup y el destino a `/panel`.

**Lo que se porta y no se toca:**
- **303, no 307**, en el redirect del POST (un 307 repetiría el POST contra `/login` → 405).
- **La respuesta se crea ANTES de autenticar** — si no, la cookie se escribe sobre un objeto
  descartado y el login "funciona" pero deja al usuario sin sesión, en un bucle sin un solo error.
- **`getUser()`, no `getSession()`.**
- 🔴 **Un fallo de red o de configuración NO se reporta como "contraseña incorrecta".**
  `AuthRetryableFetchError`, `status` vacío o `401` → `?error=servidor`. Los errores de credenciales
  siguen unificados a propósito (para que el login no sea un detector de qué correos existen). Esto
  costó una hora de depuración del lado equivocado; llega gratis.

**Lo que NO se porta:** el `frame-ancestors` de `next.config.ts` y el `SameSite=None` de la cookie.
Esta app **no vive dentro de un iframe de GHL** — el mockup la dibuja en su propia ventana, en
`panel.lpfinancialservices.info/panel`. Sin iframe: cookie `SameSite=Lax`, y de paso desaparece el
riesgo abierto con Safari que sí tiene la app de anuncios.

**El usuario se crea por Admin API** (`npm run usuario -- crear <correo> "<contraseña>"`), con
`email_confirm: true`: no hay SMTP, y un usuario esperando un correo que nunca llega no puede entrar
jamás — el error que ve dice *"Email not confirmed"*, que no explica nada.

---

## 10. Instalable desde el día 1

### 10.1 Variables de entorno — **sólo tres**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Todo lo demás vive en la tabla `configuracion` y se edita en Ajustes.** Es una desviación consciente
de "todo por variables de entorno": cada variable que el alumno tiene que pegar a mano en Vercel es
una oportunidad de pegar los caracteres `•` de un valor enmascarado y quedarse con una app rota que
no dice por qué. Tres es el mínimo irreducible (son las que Supabase da y Vercel necesita). El nombre
del negocio, la moneda y la zona horaria se escriben una vez en una pantalla y quedan en la base.

### 10.2 `npm run instalar` — el script único

Corre contra una base vacía y hace, en orden, sin pedir nada más que respuestas:
1. Verifica que las tres variables existan y que **respondan** — no que estén presentes. Falla ruidoso
   con el motivo exacto si Supabase no contesta.
2. Aplica `001_esquema.sql` y `002_permisos.sql`.
3. Pregunta: nombre del negocio · iniciales · nombre del usuario · moneda y símbolo · zona horaria ·
   inicio de semana. Escribe la fila de `configuracion`.
4. Pregunta correo y contraseña, y crea el **primer y único usuario** (`email_confirm: true`).
5. **No planta ni una persona ni un reporte.** Una instalación limpia queda vacía, y la app tiene que
   verse bien vacía (H2).
6. Imprime el resumen y el siguiente paso: *"Entrá a `/equipo` y cargá a tu equipo"*.

**Es idempotente**: correrlo dos veces no duplica nada ni pisa datos.

### 10.3 🔴 Los dos pasos propios de la guía del alumno

1. **Vercel Hobby bloquea los deploys por `git push` si el autor del commit no es el dueño de la
   cuenta.** El deploy del import sale verde y **no prueba nada — la prueba es el segundo.** La guía
   lleva el `git config user.email` correcto y cómo leer el estado sin abrir el dashboard:
   `gh api repos/OWNER/REPO/deployments` → `/deployments/<id>/statuses`.
2. **Supabase free apaga el proyecto tras ~7 días sin consultas a la base.** El síntoma es que el
   subdominio deja de resolver en DNS y la app dice "error de servidor" — no se parece a la causa.
   Se detecta desde afuera con `dig +short <ref>.supabase.co @1.1.1.1` **y un segundo proyecto de
   control**: sin el control, "no resuelve" es indistinguible de un bloqueo de red. **Va como paso
   propio de la guía**, porque le va a pasar a cada alumno que instale y no entre por una semana.

### 10.4 Qué prueba que es instalable
Un test de repo que falla si aparece `Leandro`, `LP The CEO`, `Sofía Lara`, `Andrea Ríos`, `Mateo Gil`,
`Valentina Paz`, `Diego Torres`, `Carlos Méndez`, `lpfinancialservices` o `panel.lp` en `src/`. La
única excepción declarada es `scripts/semilla.mjs` y `MOCKUP-APROBADO.html`. **La lista de excepciones
se escribe a mano; no se deriva.**

---

## 11. El gate de verificación

### 11.1 Los números de oro — externos y fijos
Salen del mockup aprobado, que es un documento que no cambia. `npm run semilla -- cargar` planta
**42 filas** (3 setters × 7 días + 3 closers × 7 días, todas `es_demo=true`) que suman exactamente:

| | Verificado |
|---|---|
| Leads · Agendas · Llamadas · Asistieron · Cierres | 342 · 104 · 96 · 63 · 23 |
| Revenue · Cash | $69,000 · $41,400 |
| Tasa de agenda · asistencia · cierre | 30.4% · 65.6% · 36.5% |
| % de cobro · ticket promedio | 60% · $3,000 |
| Setters (agendas / tasa) | Sofía 38 / 32% (119 leads) · Mateo 36 / 30% (120) · Valentina 30 / 29% (103) |
| Closers (cash / cierres / tasa) | Andrea $19,800 / 11 / 42% (26 shows) · Diego $14,400 / 8 / 35% (23) · Carlos $7,200 / 4 / 29% (14) |

Los desgloses por persona **cierran contra los totales al entero**: 119+120+103 = 342 · 38+36+30 = 104
· 26+23+14 = 63 · 11+8+4 = 23 · 19.800+14.400+7.200 = 41.400 · y el % de cobro da 60% exacto en los
tres closers. Verificado con aritmética, no asumido: el mockup es consistente hasta el nivel de
persona, así que sirve como banco de prueba y no hace falta inventar números.

`verificar.mjs` **cuenta las filas (42) y compara contra estos valores literales**. Nada de "el total
coincide con la suma de las partes" — eso da verde con la base vacía.

### 11.2 La contraprueba (el gate tiene que poder ponerse rojo)
Antes de aceptar cualquier fase: **se rompe a propósito** un filtro de período o una fórmula, se corre
el verificador y **tiene que ponerse rojo**. Si sigue verde, el gate no está mirando ahí. Se revierte
y se anota en la bitácora del PRP.

### 11.3 La foto
Playwright contra el dev server, con la semilla cargada:
- **Escritorio 1440×900** y **celular 390×844**, oscuro, contra las vistas 💻 y 📱 del mockup.
- **Cada estado abierto**: el `select` de personas, el date picker, el diálogo de "ya cargaste este
  día", la hoja de menú del celular, y la confirmación de baja en Equipo. **Validar por foto estática
  no es QA.**
- **Grep de controles nativos** en las tres pantallas y sus formularios. El mockup usa `select.inp` y
  `input type="date"` estilizados: se acepta lo que el mockup usa, y **nada más** que eso.
- Los steppers `− n ＋` funcionando (no se pueden bajar de 0).

### 11.4 🔴 Lo que este gate NO cubre — se dice, no se calla
Que el verificador dé verde **no es una entrega**. Fuera de su alcance: que las variables de Vercel
estén bien cargadas (§12), que el deploy de producción sea el segundo y no el del import, que el
proyecto de Supabase siga despierto, que los textos suenen bien en español neutro, y si a Leandro le
sirve el orden de las pantallas. Eso se verifica a mano y se lista en el cierre.

---

## 12. Las claves — quién hace qué

**Las variables de entorno de Vercel las carga Jack a mano.** No se copian desde una pantalla que las
enmascara: pegar los `•` deja un valor roto que no se ve, y el síntoma (*"error de servidor"* en el
login) no se parece a la causa. Si hay que corregir una: **borrarla con el ícono de basura y crearla
de nuevo** — editarla no alcanza, el valor se mezcla con los puntitos. Después, **Redeploy sin cache**.

**HQ verifica desde afuera, con un login real, sin pedirle a nadie que mire una pantalla:**

| Prueba | Resultado que prueba que está bien |
|---|---|
| contraseña correcta | `303` a `/panel` |
| contraseña incorrecta | `303` a `/login?error=credenciales` |
| **las dos dan `error=servidor`** | 🔴 la app **no está llegando a Supabase** — es config, no contraseña |

*(Si Jack pasa un token de Vercel, esto se escribe y se verifica por API y desaparece el ida y vuelta.
Con o sin token, el build no se bloquea: se verifica con el login.)*

---

## 13. Las fases

Cada fase cierra con: `typecheck` verde + `build` verde por **EXIT code**, contraprueba del gate en
rojo, commit firmado como `LPTheCEOTech`, y una entrada en la bitácora de este PRP.

| # | Fase | Qué entrega | Cómo se acepta |
|---|---|---|---|
| **0** | **Mockup PAPEL** ✅ **HECHO** | 6 pantallas (Panel · Panel vacío · Setter · Closer · Equipo · Ajustes), claro+oscuro, escritorio+celular, estado por URL (`?v=&t=&s=&e=`) para que el gate sea repetible. | Foto en los 2 viewports × 2 temas + chequeo por DOM: cero texto recortado, cero scroll horizontal. 3 defectos hallados y corregidos. |
| **1** | **Repo y chasis** | Scaffold Next 16, `MOCKUP-APROBADO.html` (copia byte-idéntica del mockup **PAPEL**, verificada con `cmp`), `portar-css.py` (adaptado a este mockup), `globals.css` portado con sus `@media` reales, topbar de PAPEL (menú arriba, nunca barra lateral), `.claude/` con las skills de la fábrica. | Una página de muestra con las 3 pantallas estáticas: **foto contra el mockup en los 2 viewports**. |
| **2** | **Base y kernel** | Migraciones 001/002, capa de datos, `metricas.ts`, `periodo.ts`, `invariantes.ts` + tests. `semilla.mjs` y `verificar.mjs`. | `npm test` verde · `verificar` da los números de oro **y se pone rojo** al romper una fórmula a propósito. |
| **3** | **Login** | Portado completo + pantalla con la piel del mockup. | Ciclo por HTTP: sin sesión no hay `/panel` ni datos; los 3 casos de la tabla de §12. |
| **4** | **Panel** | Dinero, KPIs con chips, totales, embudo, barras, rankings, toggle día/semana/mes. | DOM y foto **idénticos al mockup** con la semilla puesta, en los 2 viewports. Divisor 0 → `—`. |
| **5** | **Los dos formularios** | Setter y closer, steppers, `cash-inp`, cálculo vivo al pie, upsert con diálogo de reemplazo. | Se carga un reporte y el panel cambia. Se reenvía el mismo día → **una fila, no dos** (la restricción del esquema se prueba). |
| **6** | **Equipo y Ajustes** | Alta/edición/baja lógica de personas; configuración persistida. **Cero CSS nuevo.** | Se da de baja a alguien con historial: desaparece del selector y **sigue** en el ranking del período pasado. Ajustes cambia y persiste tras refrescar (prueba de `force-dynamic`). |
| **7** | **Estados vacíos** | Base sin personas y sin reportes: panel, formularios y rankings. | `npm run semilla -- limpiar` y **cero** `NaN`, `Infinity`, `0.0%` o pantalla rota. Foto de la app vacía en los 2 viewports. |
| **8** | **Instalador y guía** | `instalar.mjs` idempotente, `README`, test anti-hardcodeo, `docs/guia-instalacion.md` con los 2 pasos de §10.3. | **Se corre entero contra una base limpia** y queda una app usable con 0 rastros de Leandro. |
| **9** | **Deploy y cierre** | Repo en la org (marcado *Template*), proyecto de Vercel, variables, producción. | El **segundo** deploy verde (`gh api …/deployments`), login real contra producción, guía de prueba para Jack. |

**Límites:** 3 vueltas de revisión del PRP · 3 rondas de fix por fase. Si no converge, se para y se
consulta.

---

## 14. Decisiones resueltas por HQ

| | Decisión | Por qué |
|---|---|---|
| D1 | Repo `panel-de-ventas` genérico y marcado **Template** | El alumno lo instala con un clic y sin el nombre de Leandro encima. |
| D2 | ~~Sólo tema oscuro~~ → **PAPEL v1, claro + oscuro, con toggle** | Enmienda 1. El tema del visor manda por defecto; el toggle lo pisa en las dos direcciones. |
| D3 | **Un solo DOM**; el responsive ya viene resuelto en PAPEL | Enmienda 1: las `@media` existen y `portar-css.py` las porta. |
| D4 | Rutas `/panel` `/reporte-setter` `/reporte-closer`; `/` redirige | Son las URL que el propio mockup dibuja en su barra. |
| D5 | Se porta la inconsistencia **"Leads" / "Conversaciones iniciadas"** | Son las dos palabras que Leandro aprobó. Documentada para que nadie la "arregle". |
| D6 | **Reagendadas se captura y no se muestra** | Agregarle tarjeta sería desviarse del mockup. Va a v1.1. |
| D7 | Semana **lunes-domingo**, configurable | Lo dicen las barras `L M M J V S D`; las fechas del mockup son arte. |
| D8 | Barras: **la más alta al 100%** | El 92% del mockup no es una regla derivable. |
| D9 | **Sin iframe** → cookie `SameSite=Lax`, sin `frame-ancestors` | El mockup la dibuja en su propia ventana. De paso se evita el riesgo con Safari. |
| D10 | Zona horaria por defecto **`America/New_York`** | La cuenta de Leandro está en EDT (verificado en `2026-08-14-leandro-3-subcuentas-checklist.md` y en el CRO tracker). El instalador la pregunta igual. |
| D11 | **3 variables de entorno**, el resto en la base | Cada variable pegada a mano es una chance de pegar los `•`. |
| D12 | Rankings: **todas** las personas con actividad | El mockup muestra 3 porque hay 3. |
| D13 | **`unique (fecha, persona_id)` + upsert con confirmación** | Un doble envío del EOD duplicaría el día en silencio. El invariante va en el esquema. |
| D14 | El PRP lo escribió **HQ**, no una sesión obrera | El repo todavía no existe: no hay código que investigar. Lo que sí existe —el mockup y la app de anuncios— lo leyó HQ en disco, línea por línea. Spawnear una sesión fría habría producido un PRP con menos contexto, no más. |

---

## 15. Riesgos

| | Riesgo | Mitigación |
|---|---|---|
| 🔴 1 | **Doble conteo por reenvío del EOD.** Es el bug más caro del modelo: no falla, sólo infla. | `unique (fecha, persona_id)` + upsert + confirmación visible. |
| 🔴 2 | **La app vacía se ve rota** y es lo primero que ve cada alumno. | Fase 7 entera, con foto. |
| 🔴 3 | **Vercel Hobby bloquea los pushes** y el primer deploy engaña. | Commits firmados desde el commit 1; se lee el **segundo** deploy por API. |
| 🔴 4 | **Supabase free se duerme a los ~7 días** y el síntoma no se parece a la causa. | Paso propio en la guía + `dig` con proyecto de control. |
| 🔴 5 | **Las claves con `•`.** | §12: Jack las carga, HQ las verifica con un login real. |
| 🔴 6 | **Next 16 prerenderiza** y sirve los números del build. | `force-dynamic` en el layout + se comprueba que el `build` no marque `○ (Static)` en ninguna ruta de `(app)`. |
| 7 | El responsive escrito a mano se desvía del mockup. | La tabla de §5.5 es el contrato; el gate es la foto a 390 px. |
| 8 | Alguien "arregla" Leads/Conversaciones o le agrega tarjeta a Reagendadas. | D5 y D6, escritas. |

---

## 16. Anti-patrones

- ❌ Escribir código antes de que Jack apruebe este PRP.
- ❌ Guardar una métrica derivada "para que cargue más rápido".
- ❌ Inventar una clase CSS que el mockup no tiene.
- ❌ `git add -A`.
- ❌ Tocar `LP-Command-Center`, su base, su Vercel o su dominio.
- ❌ Aceptar el reporte de la sesión obrera sin leer el código.
- ❌ Dar por buena una foto de página completa como QA.
- ❌ Borrar filas de personas o de reportes con `DELETE`.
- ❌ Poner un dato de Leandro en `src/`.

---

## 17. Bitácora
*(vacía — se llena fase por fase durante el build)*
