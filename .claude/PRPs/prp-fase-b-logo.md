# PRP-FASE-B · Logo personalizable en el topbar

> **Padre**: [`prp-maestro-evolucion-leandro.md`](./prp-maestro-evolucion-leandro.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 2 de 4 · **Depende de**: Fase A cerrada.
> **Autónoma**: no toca lógica de negocio. Se puede arrancar sola con `/bucle-agentico` una vez A está en verde.

---

## 1. Objetivo

Que el dueño pueda **subir un logo desde Ajustes** y que aparezca en el
topbar en vez del cuadradito con las iniciales. Fallback silencioso al
cuadradito si el logo no carga.

Estado final: en Ajustes hay un input de archivo con vista previa. Al guardar,
el archivo va a un bucket público de Supabase Storage, la URL se guarda en
`configuracion.logo_url`, y `<Topbar>` renderiza un `<img>` en lugar del
`<span className="brand-tile">`. Si `logo_url` está vacío o el `<img>` falla,
vuelve a las iniciales. **Sin gente logueada nueva, sin roles, sin nada de
Fase C.**

---

## 2. Por qué

| Problema | Solución |
|---|---|
| Un panel «plantilla» sin logo se ve como el panel de otro. Las iniciales son un placeholder honesto pero no venden la sensación de ser tuyo. | Un input de archivo en Ajustes que reemplaza esas dos letras por la marca real del alumno. |
| El branding tiene que sobrevivir a cambios de color (Fase actual ya deja cambiar `--marca` desde Ajustes). Falta el vehículo visual: el logo. | El campo `logo_url` + el `<img>` con fallback cubren el hueco sin tocar la rampa de la marca. |
| **NO** hay que caer en el hueco de armar un CDN. Supabase Storage con bucket público resuelve exactamente esto. | Bucket `logos` público, una carpeta por proyecto no hace falta (es una sola fila de configuración). |

---

## 3. Criterios de éxito (medibles)

- [ ] Migración `004_logo.sql` aplica: agrega `logo_url text null` a `configuracion`. Idempotente.
- [ ] En Supabase Storage existe un bucket `logos` con `public = true`. Si no existe, el instalador o una nota en `docs/` lo crea (decisión del hijo: automatizado o manual documentado).
- [ ] En `/ajustes` hay una fila **«Logo»** dentro de la tarjeta «Tu negocio», con:
  - Vista previa (el logo actual, si hay).
  - `<input type=file accept="image/png,image/jpeg,image/svg+xml">`.
  - Botón «Quitar logo» si hay uno cargado.
  - Aviso de tamaño máximo (256 KB, decisión del hijo).
- [ ] Al elegir un archivo:
  - `POST /api/logo` con `multipart/form-data` (o un endpoint dedicado si el hijo prefiere, ver §5.3).
  - Se sube a `logos/logo-<timestamp>.<ext>` (nombre único para bypass del cache del navegador).
  - Se guarda `configuracion.logo_url = <url pública>`.
  - `router.refresh()` y el topbar cambia sin recargar.
- [ ] Botón «Quitar logo»: setea `logo_url = null` y borra el archivo del bucket (best-effort; si el borrado falla, se loguea pero no rompe).
- [ ] `<Topbar>` (`src/shared/chasis/topbar.tsx`):
  - Si `config.logoUrl` está seteado, renderiza `<img src={config.logoUrl} alt={config.nombreNegocio} className="brand-logo" onError={...} />` en vez del `<span className="brand-tile">`.
  - Si el `<img>` falla al cargar, cae al `<span className="brand-tile">` con las iniciales (fallback silencioso, sin console.error).
- [ ] Sin logo: el topbar sigue exactamente como está hoy.
- [ ] `npm run gate` verde, `verificar` verde (no hay números nuevos), foto en los 4 modos (con y sin logo).

---

## 4. Comportamiento esperado

```
Leandro entra a /ajustes
  → ve la tarjeta "Tu negocio" con una fila nueva "Logo"
  → click en "Elegir archivo" → sube su PNG
  → ve la vista previa al instante
  → click "Guardar ajustes" → el topbar de arriba cambia de "LP" (cuadrado) a su logo
  → refresca la página → sigue apareciendo el logo

Leandro cambia de opinión
  → click "Quitar logo"
  → confirma
  → topbar vuelve a las iniciales "LP"
```

Casos de borde:

- Sube un SVG con dimensiones raras → CSS de `.brand-logo` con `max-height: 31px; width: auto` lo contiene.
- Sube un archivo de 5 MB → el endpoint rechaza con «Máximo 256 KB. Bajalo con squoosh.app.»
- Sube un `.pdf` → rechazado por el `accept` del input y por la validación del endpoint (magic-bytes o extensión, decide el hijo).
- El bucket se cae en producción → el `<img>` no carga, `onError` mete la clase de fallback y aparecen las iniciales. Sin pantalla rota.

---

## 5. Modelo de datos y almacenamiento

### 5.1 Migración `supabase/migraciones/004_logo.sql`

```sql
alter table configuracion
  add column if not exists logo_url text null;
```

Una línea. No hay que tocar RLS (la tabla ya está en RLS-sin-políticas).

### 5.2 Bucket de Storage

Dos opciones — el hijo decide y documenta cuál:

**Opción A · Manual, documentado en `docs/`**:
En `docs/guia-instalacion.md` (o un nuevo `docs/logo.md`), instrucciones:
1. Dashboard Supabase → Storage → New bucket → nombre `logos` → toggle Public → Create.
2. Nada más.

**Opción B · Automatizado en el instalador**:
En `scripts/instalar.mjs`, después del paso 3 (configuración), llamar a
`sb.storage.createBucket('logos', { public: true })` — con `try/catch` porque
si ya existe, tira `Bucket already exists` que no es un error de flujo.

**Recomendación**: **Opción B**. El instalador ya crea el usuario admin;
crear un bucket es una línea más. Si falla, se cae al camino de la Opción A
(mensaje: «No pude crear el bucket `logos`. Creálo a mano en el Dashboard…»).

### 5.3 Endpoint `src/app/api/logo/route.ts` (nuevo)

Dos rutas dentro:

- **`POST`** — sube un archivo:
  - Recibe `FormData` con `file`.
  - Valida: `file.size <= 256 * 1024`, `file.type` empieza con `image/`.
  - Nombra: `logo-${Date.now()}.${ext}` (para bustear cache del navegador).
  - `sb.storage.from('logos').upload(nombre, file, { contentType, upsert: false })`.
  - Obtiene URL pública: `sb.storage.from('logos').getPublicUrl(nombre)`.
  - Si había un logo anterior, intenta borrarlo (best-effort).
  - `guardarConfiguracion({ logoUrl: url })`.
  - Devuelve `{ logoUrl }`.
- **`DELETE`** — quita el logo:
  - Lee `configuracion.logo_url`, si hay algo intenta borrar el archivo.
  - `guardarConfiguracion({ logoUrl: null })`.
  - Devuelve `{ ok: true }`.

**🔴 Por qué endpoint dedicado y no meterlo en `/api/ajustes`**:
`/api/ajustes` es `PATCH` con JSON. Meter multipart ahí lo obligaría a
detectar el `content-type` y tener dos códigos-camino. Un endpoint aparte
mantiene cada uno haciendo una cosa.

### 5.4 Tipos — `src/shared/tipos/index.ts`

Agregar a `Configuracion`:

```ts
export interface Configuracion {
  // ...lo actual...
  /** URL pública del logo, o null si no hay. Puede fallar la carga; el topbar cae a las iniciales. */
  logoUrl: string | null
}
```

Y a `CONFIGURACION_POR_DEFECTO` en `src/shared/datos/interfaz.ts`:
`logoUrl: null`.

### 5.5 Capa Supabase — `src/shared/datos/supabase/capa.ts`

- En `leerConfiguracion`: agregar mapeo `logoUrl: data.logo_url ?? null`.
- En `guardarConfiguracion`: agregar `logoUrl: 'logo_url'` al mapa (línea 68-73).

---

## 6. UI

### 6.1 `src/features/ajustes/panel.tsx`

Agregar una fila **Logo** dentro de la tarjeta «Tu negocio», entre «Iniciales»
y «Tu nombre». Componente nuevo `<CampoLogo>` (puede vivir en el mismo
archivo o en `src/features/ajustes/campo-logo.tsx`):

```
[preview 40×40] Logo del panel        [Elegir archivo]  [Quitar]
                 max 256 KB, PNG/JPG/SVG
```

Cuando se elige un archivo:
1. Muestra preview local (`URL.createObjectURL`).
2. `POST /api/logo` con el `FormData`.
3. Actualiza `c.logoUrl` en el estado.
4. `router.refresh()` para que el topbar recargue.

Cuando se aprieta «Quitar»:
1. Confirmación inline («¿Quitar logo? Vuelve al cuadradito con las iniciales.»).
2. `DELETE /api/logo`.
3. `setC(x => ({ ...x, logoUrl: null }))` + `router.refresh()`.

### 6.2 `src/shared/chasis/topbar.tsx`

Reemplazar el bloque de `.brand`:

```tsx
<div className="brand">
  {config.logoUrl ? (
    <img
      src={config.logoUrl}
      alt={config.nombreNegocio}
      className="brand-logo"
      // 🔴 Fallback silencioso. Si el bucket se cae o la URL se rompe, la
      // imagen no carga; el onError le agrega la clase que hace visible al
      // hermano <span> de iniciales. Sin console.error, sin pantalla rota.
      onError={(e) => { e.currentTarget.hidden = true; e.currentTarget.nextElementSibling?.removeAttribute('hidden') }}
    />
  ) : null}
  <span className="brand-tile" hidden={!!config.logoUrl}>{config.iniciales}</span>
  <span className="brand-txt">
    <strong>{config.nombreNegocio}</strong>
    <span>Panel de métricas</span>
  </span>
</div>
```

**🔴 El `<span>` con `hidden` sigue estando en el DOM** para que el
`onError` del `<img>` lo pueda mostrar sin re-render. `hidden` lo oculta
visualmente y para lectores de pantalla — se comporta como `display:none`.

### 6.3 CSS

**🔴 En el mockup, no en globals.css directo.**

En `MOCKUP-APROBADO.html`, agregar la regla `.brand-logo`:

```css
.brand-logo{width:31px;height:31px;border-radius:9px;object-fit:contain;background:var(--card)}
```

- **Mismo tamaño exacto** que `.brand-tile` (31×31) para que la sustitución
  no cambie el alto del topbar.
- `object-fit: contain` para que un logo rectangular no se recorte ni se
  deforme.
- `background: var(--card)` cubre el hueco cuando el logo es SVG con
  transparencias.

Correr `python3 scripts/gemelas.py` (por si la regla tiene alguna `@media`) y `npm run portar-css`.

Agregar en Ajustes la regla `.cfg-file` para el input, si el hijo la
necesita — o reusar `.field` con un `<label>` que envuelve el `<input
type=file>` (patrón HTML nativo).

### 6.4 Configuración del instalador

`scripts/instalar.mjs` — después del bloque de configuración, agregar el paso
de crear el bucket (§5.2 Opción B). Si falla, no aborta: sigue con un
warning y una nota final que dice cómo hacerlo a mano.

---

## 7. Fases internas

| # | Fase | Qué entrega |
|---|---|---|
| B.1 | **BD y bucket** | Migración 004 + bucket creado (con instalador actualizado o guía en `docs/`) + `logoUrl` en tipos/capa. |
| B.2 | **Endpoint** | `POST /api/logo` y `DELETE /api/logo` con validación de tamaño y content-type. |
| B.3 | **Ajustes** | Fila «Logo» con preview, subida y botón Quitar. |
| B.4 | **Topbar** | `<img>` con fallback silencioso al `.brand-tile`. |
| B.5 | **Mockup + porteo** | Nueva regla `.brand-logo` en el mockup, `gemelas.py` + `portar-css.py`. |
| B.6 | **Gate + foto** | Con y sin logo, en 4 modos. |

---

## 8. Referencias explícitas al repo

- **Tipos**: `src/shared/tipos/index.ts` — agregar `logoUrl: string | null`.
- **Capa demo**: `src/shared/datos/demo.ts` — `CONFIGURACION_POR_DEFECTO` ya trae `logoUrl: null` si se agrega bien en `interfaz.ts`.
- **Capa Supabase**: `src/shared/datos/supabase/capa.ts` — mapear `logo_url` en `leerConfiguracion` (línea 57-62) y en `guardarConfiguracion` (línea 68-73).
- **Interfaz**: `src/shared/datos/interfaz.ts` — `logoUrl: null` en `CONFIGURACION_POR_DEFECTO`.
- **Migración**: `supabase/migraciones/004_logo.sql`.
- **Endpoint**: `src/app/api/logo/route.ts` — nuevo (patrón `/api/ajustes/route.ts` para el error handling).
- **Ajustes**: `src/features/ajustes/panel.tsx` — nueva fila y (posible) componente `CampoLogo`.
- **Topbar**: `src/shared/chasis/topbar.tsx` — bloque `.brand` con `<img>` + fallback.
- **Instalador**: `scripts/instalar.mjs` — paso para crear bucket `logos`.
- **Mockup**: `MOCKUP-APROBADO.html` — regla `.brand-logo` (31×31, radius 9, object-fit contain).
- **`sin-cliente.py`**: **no cambia** (no hay excepción nueva; `configuracion.logo_url` es un valor de la BD, no un string en el código).

---

## 9. Números / criterios de "listo" para esta fase

**No hay números de oro nuevos.** `npm run verificar` sigue con los 24 + 4
(post-A) sin cambios.

Sí hay chequeos que van en el gate:

- [ ] `curl -F "file=@logo.png" http://localhost:3110/api/logo` (autenticado) devuelve `{logoUrl}`.
- [ ] `SELECT logo_url FROM configuracion WHERE id=1` devuelve la URL.
- [ ] Cargar `http://localhost:3110/panel` **sin login**: 303 a `/login` (no rompió el proxy).
- [ ] Cargar `http://localhost:3110/panel` con logo cargado: el topbar tiene `<img>` visible, `<span.brand-tile>` con `hidden`.
- [ ] Cambiar `configuracion.logo_url` a `'https://x.invalid/no.png'` a mano en la BD → refrescar → el topbar muestra las iniciales, sin error en consola.

---

## 10. Contraprueba

- Deshabilitar el fallback (comentar el `onError` del `<img>`), poner una URL
  rota, refrescar → el topbar tiene el ícono roto del navegador. **Reactivar
  el fallback** → aparecen las iniciales. La foto tiene que capturar el
  segundo estado.

---

## 11. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar
```

Y **la foto** (5 estados, 4 combinaciones):
- Topbar con logo (escritorio/celular, claro/oscuro) — 4 fotos
- Topbar sin logo (default) — 4 fotos
- Ajustes con fila «Logo» y vista previa activa — 4 fotos
- Ajustes con «Quitar logo» abierto (confirmación inline) — 2 fotos (basta 1440 claro/oscuro)
- Topbar con URL rota y fallback en acción — 2 fotos

---

## 12. Anti-patrones

- ❌ Meter la subida de logo dentro del PATCH de `/api/ajustes` — dos content-types en un endpoint.
- ❌ Guardar el archivo como base64 en `configuracion.logo_url` — hincharía la fila y rompería el patrón.
- ❌ Bucket privado — el `<img>` del navegador no puede autenticarse a Supabase Storage; requiere URL firmada, complejidad innecesaria para un logo público que se muestra a todos los que entran al panel.
- ❌ Fallback ruidoso (`console.error` o un banner rojo) — el usuario final no puede hacer nada, y el mockup no tiene esa pieza.
- ❌ Reemplazar `.brand-tile` por el `<img>` **sin** dejar el `<span>` en el DOM — sin él, el `onError` no tiene a quién mostrar.
- ❌ Editar `globals.css` directo — el `.brand-logo` va en el mockup y se porta.
- ❌ `configuracion.logo_url` con un valor por defecto (una URL de placeholder) — habría que meterla en el código y `sin-cliente.py` cazaría el string.

---

## 13. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-10 | **Código completo.** Migración 004 (una columna `logo_url text null`), tipo `Configuracion.logoUrl`, capa Supabase mapea `logo_url` en leer/guardar. Endpoint `POST/DELETE /api/logo` con validación de tamaño (256 KB), tipos (PNG/JPG/SVG/WebP), best-effort al borrar el anterior. Módulo `shared/datos/supabase/logo.ts` con subirLogo/borrarLogo. Topbar con `<img>` + fallback `hidden` al `.brand-tile` vía onError. CampoLogo en Ajustes con preview + input file + botón Quitar con confirmación inline. Mockup: `.brand-logo` (31×31, contain), `.campo-logo` + fila nueva en Ajustes. Instalador: `003` y `004` agregadas a `MIGRACIONES`, y crea el bucket `logos` público best-effort (falla → warning + instrucciones manuales). Gate local: typecheck, 32/32 tests, lint, sin-cliente (56 archivos), build (10/10 páginas). |
| 2026-09-10 | **Falta contra base real:** aplicar migración 004, crear bucket `logos` (o dejar que `npm run instalar` lo intente), subir un logo desde `/ajustes`, verificar que aparece en el topbar y que la URL rota cae al `.brand-tile`. |
