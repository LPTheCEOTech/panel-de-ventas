# PRP-B · Favicon dinámico = logo + `<title>` = nombre del panel

> **Padre**: [`prp-maestro-sesion-2-feedback.md`](./prp-maestro-sesion-2-feedback.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 3 de 5 · **Depende de**: Fase A cerrada (por checkpoint).
> **Autónoma**: no toca BD. Se puede arrancar sola con `/bucle-agentico`.

---

## 1. Objetivo

Que la **pestaña del navegador** deje de decir «Panel de Ventas» (o cualquier
default) y muestre:

1. Como **icono** (favicon): el logo del negocio subido en Ajustes; si no
   hay, un SVG generado con las **iniciales** sobre el color de marca (mismo
   estilo del `.brand-tile`).
2. Como **título**: el `nombreNegocio` de `configuracion`, tal como ya
   aparece en el topbar.

Estado final: al abrir la app, la pestaña dice «Panel Leandro» (o el nombre
que puso el instalador) con el logo real como icono. Si el logo se cae
(bucket muerto, URL rota), el navegador cae al fallback SVG y sigue viéndose
tuyo, no roto.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| El `layout.tsx` ya define `<title>` desde `configuracion.nombreNegocio` (Fase B pasada), pero NO define `icons`. El navegador muestra un favicon default (o el globo terráqueo), lo que rompe la sensación de «este panel es mío» que Fase B intentó construir. | `generateMetadata` devuelve `icons.icon = [logoUrl, '/api/favicon.svg']`; el navegador prefiere el primero y cae al segundo si falla. |
| El logo sube a Supabase Storage como PNG/JPG/SVG/WebP arbitrario. Los navegadores aceptan casi todo como favicon, pero un SVG con transparencia sobre pestaña oscura se pierde. | El favicon fallback SVG lleva `background = color de marca` (mismo `.brand-tile`), siempre contrastado. |
| El instalador crea la app sin logo. Sin fallback, el favicon queda default y la pestaña se ve genérica desde el primer minuto. | El fallback (`/api/favicon.svg?ini=LP&color=00D97E`) es dinámico: sirve un SVG basado en `configuracion.iniciales` + `configuracion.marca`. |

---

## 3. Criterios de éxito (medibles)

- [ ] `layout.tsx` (`generateMetadata`) devuelve:
  ```ts
  {
    title: nombreNegocio,
    description: 'Panel de métricas de ventas',
    icons: {
      icon: [
        // ...si hay logo, el logo primero
        ...(logoUrl ? [{ url: logoUrl }] : []),
        // ...siempre el fallback SVG como último recurso
        { url: '/api/favicon.svg', type: 'image/svg+xml' },
      ],
    },
  }
  ```
- [ ] `GET /api/favicon.svg` responde con un SVG cuadrado (192×192 o similar):
  - Fondo pintado con `configuracion.marca`.
  - Iniciales (`configuracion.iniciales`) en el centro, en el color de
    contraste (misma lógica que `shared/chasis/marca.ts` usa para el texto
    sobre marca).
  - `Cache-Control: public, max-age=60, s-maxage=60` — se puede cachear
    porque cambia raramente, pero corto para que un cambio de iniciales o
    color aparezca en el próximo refresh.
- [ ] Si el `<img>` del logo carga → la pestaña muestra ese icono. Si la URL
  falla (bucket caído) → el navegador cae automáticamente al SVG (spec de
  `<link rel="icon">` con múltiples fuentes).
- [ ] El `<title>` sigue mostrando `nombreNegocio`. Sin cambios respecto de hoy.
- [ ] En la pestaña del navegador (Chrome, Safari, Firefox): se ve el logo
  o las iniciales, según corresponda. Foto: capturar pestaña.
- [ ] `sin-cliente.py` sigue verde: el fallback SVG no lleva ningún string
  hardcodeado del negocio.
- [ ] Sin `.env.local` (dev sin BD): `generateMetadata` cae al `catch`
  actual (`title: 'Panel de Ventas'`) y el favicon queda default sin romper
  el layout. **NO se llama a `/api/favicon.svg` si no hay config**.
- [ ] `npm run gate` verde. `npm run verificar` sin cambios.

---

## 4. Comportamiento esperado

```
Admin instala el panel:
  - configuracion.nombreNegocio = "Panel Leandro"
  - configuracion.iniciales = "LP"
  - configuracion.marca = "#00D97E"
  - configuracion.logoUrl = null

Abre panel-de-ventas-kappa.vercel.app:
  - Pestaña dice: [SVG "LP" verde]  Panel Leandro
  - El SVG viene de /api/favicon.svg (fallback)

Admin sube logo.png:
  - configuracion.logoUrl = "https://.../logos/logo-1731234567.png"

Recarga la app:
  - Pestaña dice: [logo.png]  Panel Leandro
  - El SVG queda declarado como segunda fuente pero no se pide.

Se cae el bucket de Storage:
  - Navegador intenta cargar logo.png → 404 o timeout
  - Cae al SVG automáticamente
  - Pestaña sigue viéndose con "LP" verde sin flash

Dev sin BD:
  - generateMetadata cae al catch, title: 'Panel de Ventas', icons: undefined
  - Pestaña queda con el favicon default del browser (aceptable)
```

---

## 5. Investigación y contexto

Referencias absolutas:

- **Layout raíz** (donde se declara metadata):
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/layout.tsx`
  — 37 líneas. Ya tiene `generateMetadata` con `title`. Falta `icons`.
- **Configuración**:
  - Tipo `Configuracion.logoUrl` en `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/tipos/index.ts` línea 120.
  - Tipo `Configuracion.iniciales`, `.marca`, `.nombreNegocio` en el mismo archivo, líneas 108-124.
- **Marca (derivación de color)**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/marca.ts`
  — deriva `--m1..--m7`, neutros y texto sobre marca a partir del hex.
  Ya expone (verificar en el archivo) una función para calcular el color de
  texto contrastado.
- **Topbar (referencia visual)**:
  `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/topbar.tsx`
  líneas 29-49 — muestra cómo se pinta el `.brand-tile` con las iniciales.
- **API existente (ejemplos)**:
  - `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/logo/route.ts` — cómo se lee `configuracion.logo_url`.
  - `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/ajustes/route.ts` — cómo se lee la configuración.

**Cómo se comportan los navegadores con múltiples `<link rel="icon">`**
(background):

- El navegador escanea todos los `<link rel="icon">` declarados y elige el
  «mejor» — por tamaño y por `sizes`/`type` — para cada slot (pestaña,
  bookmark, apple-touch-icon).
- Si el elegido falla al cargar, algunos navegadores caen al siguiente,
  otros muestran default. **No es un fallback garantizado.**
- **La forma robusta** es que el favicon primario **siempre exista** y sea
  el SVG dinámico. El logo del bucket queda como opcional o solo para
  Apple Touch Icon (que sí acepta URL externa sin fallback).

**🔴 Consecuencia**: se recomienda invertir la prioridad de §3 — el favicon
principal es siempre el SVG dinámico (`/api/favicon.svg`), y el logo del
bucket va como `apple-touch-icon` u opcional. **El hijo decide y documenta**.

---

## 6. Decisión clave: ¿logo primero o SVG primero?

**Opción A · Logo del bucket primero, SVG fallback declarado.**
- Ventaja: si el bucket anda, se ve el logo real.
- Riesgo: si el bucket falla, algunos navegadores muestran el ícono roto.

**Opción B · SVG dinámico siempre primero, logo del bucket como Apple Touch Icon o segundo.**
- Ventaja: siempre hay un favicon que carga (sale de un endpoint interno).
- Desventaja: el logo del negocio no aparece en la pestaña del navegador,
  solo en pantallas de home/iOS.

**Opción C · Solo SVG dinámico. Sin usar el logo del bucket como favicon.**
- El logo del bucket sigue apareciendo en el topbar (Fase B); el favicon es
  siempre el SVG. Menos superficie de fallo.
- Justificación: el logo del negocio puede ser un rectángulo horizontal (un
  wordmark), que como cuadrado de 16×16 se ve fatal. Un SVG con iniciales
  optimizado para tamaño chico se ve mucho mejor.

**Recomendación del PRP**: **Opción C**. Es el fallback más simple, más
robusto, y no arriesga a que el favicon aparezca roto. El logo del bucket
sigue vivo en el topbar, que es donde se lo aprovecha en tamaño natural.
Los alumnos pueden preferir una A/B, pero como default entrega la mejor
experiencia visual.

**El hijo puede argumentar A si Jack lo prefiere** (por ejemplo, si Leandro
tiene un logo cuadrado que quiere ver en la pestaña). Documenta en la
bitácora.

---

## 7. Modelo de implementación

### 7.1 Endpoint `src/app/api/favicon.svg/route.ts` (nuevo)

**GET** — devuelve SVG dinámico:

```ts
import { NextResponse } from 'next/server'
import { datos } from '@/shared/datos/indice'
// import { textoSobreMarca } from '@/shared/chasis/marca'  // verificar nombre exacto

export async function GET() {
  let iniciales = 'LP'
  let marca = '#00D97E'
  try {
    const c = await datos().leerConfiguracion()
    iniciales = c.iniciales
    marca = c.marca
  } catch {
    // sin BD, usa el default
  }
  const texto = /* color contrastado, mismo helper que .brand-tile */ '#0B0F14'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
    <rect width="192" height="192" rx="42" fill="${marca}"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-family="system-ui,-apple-system,sans-serif" font-size="88" font-weight="800"
      fill="${texto}">${iniciales}</text>
  </svg>`
  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      // corto para que el cambio de iniciales/color se vea pronto
      'cache-control': 'public, max-age=60, s-maxage=60',
    },
  })
}
```

**🔴 Decisiones**:

- **`viewBox="0 0 192 192"`** — favicon estándar «grande». El browser lo
  escala a 16, 32, 128… según necesite.
- **`rx="42"`** — mismo redondeo relativo que `.brand-tile` (que hoy vive
  con `border-radius:9px` sobre 31×31 → ~29%).
- **`font-size="88"`** para que las iniciales quepan cómodas en el cuadrado
  con margen.
- **Cache 60 s** — un cambio de iniciales o marca desde Ajustes se ve al
  siguiente refresh. Más largo confundiría al admin.
- **Sin caracteres XML raros** — `iniciales` viene de un `<input maxLength=2>`
  ya sanitizado por Zod al guardar, pero el hijo debe escapar `<`, `>`, `&`
  por si acaso.

### 7.2 Layout raíz — `src/app/layout.tsx`

```ts
export async function generateMetadata(): Promise<Metadata> {
  try {
    const { nombreNegocio, logoUrl } = await datos().leerConfiguracion()
    return {
      title: nombreNegocio,
      description: 'Panel de métricas de ventas',
      // 🔴 Opción C (recomendada): SVG dinámico siempre.
      icons: {
        icon: [{ url: '/api/favicon.svg', type: 'image/svg+xml' }],
        // opcional: el logo del bucket como apple-touch-icon si existe
        ...(logoUrl ? { apple: logoUrl } : {}),
      },
    }
  } catch {
    return { title: 'Panel de Ventas' }
  }
}
```

**🔴 Decisión Opción A**: si el hijo elige A en §6, la lista `icon`
prioriza `logoUrl` (con `sizes` explícitos si es posible) y deja el SVG
como último.

### 7.3 Helper del color de contraste

Si `shared/chasis/marca.ts` no exporta ya una función `textoSobreMarca(hex)`,
el hijo la crea o la reusa desde donde ya viva (`.brand-tile` la usa: buscar
en `globals.css` la variable `--m-texto` o similar).

**Test unitario** (`marca.test.ts`): agregar caso «favicon con hex claro y
oscuro devuelve texto contrastado».

---

## 8. Fases internas (para el Bucle Agéntico)

| # | Fase | Qué entrega |
|---|---|---|
| B.1 | **Endpoint SVG** | `src/app/api/favicon.svg/route.ts` con SVG dinámico. Cache 60 s. Escape de caracteres XML. |
| B.2 | **Layout** | `src/app/layout.tsx` con `icons` en `generateMetadata` (según opción elegida en §6). |
| B.3 | **Tests** | Test unitario del endpoint (opcional pero recomendado): fetch al `/api/favicon.svg` en dev devuelve XML válido con las iniciales de la config. |
| B.4 | **Verificación manual** | Abrir el panel en Chrome, Safari y Firefox; verificar pestaña. Cambiar iniciales en Ajustes → refrescar → nueva pestaña. Simular bucket caído (o Opción C: no aplica). |
| B.5 | **Gate + foto** | `npm run gate` verde. Foto de la pestaña del navegador en 3 estados: sin logo, con logo (si A), tras cambiar iniciales. |

---

## 9. Referencias explícitas al repo (paths absolutos)

- **Layout raíz**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/layout.tsx` — reemplazar el `generateMetadata`.
- **Endpoint nuevo**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/favicon.svg/route.ts` — nuevo archivo.
- **Tipos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/tipos/index.ts` — `Configuracion.logoUrl`, `.iniciales`, `.marca`, `.nombreNegocio` (sin cambios de tipo).
- **Capa datos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/indice.ts` — `datos().leerConfiguracion()` sin cambios.
- **Marca**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/marca.ts` — reusar `textoSobreMarca` o similar.
- **Topbar (referencia visual, sin cambios)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/chasis/topbar.tsx`.

---

## 10. Números / criterios de "listo"

**No hay números de oro nuevos.**

Chequeos manuales:

- [ ] Abrir `/panel` → pestaña con favicon dinámico y título del negocio.
- [ ] Cambiar iniciales en Ajustes → guardar → refrescar → nueva pestaña con
  nuevas iniciales (dentro de 60 s por cache).
- [ ] Cambiar marca a un color muy claro (`#F0F0F0`) → el texto del favicon
  sigue leíble (contrastado).
- [ ] `curl -sI http://localhost:3110/api/favicon.svg` devuelve
  `content-type: image/svg+xml` y `cache-control: public, max-age=60`.
- [ ] `curl -s http://localhost:3110/api/favicon.svg` devuelve un SVG
  válido con las iniciales actuales.
- [ ] En Safari (que es más estricto con favicons): la pestaña muestra el SVG.

---

## 11. Contraprueba

- Comentar la línea `icons: {...}` en `layout.tsx` → refrescar → pestaña con
  favicon default del navegador. Reactivar → pestaña con SVG.
- Cambiar el `cache-control` a `max-age=86400` (24 h), cambiar iniciales →
  la pestaña sigue mostrando las viejas hasta que se venza el cache o se
  hard-refresh. Deshacer.
- (Opción A) Meter una URL rota como `logoUrl` en la BD → refrescar → el
  navegador debería caer al SVG. Documentar qué navegadores lo hacen bien.

---

## 12. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar
```

**Foto** — pestañas del navegador:

- Chrome 1440 con logo (si Opción A): pestaña con el logo.
- Chrome 1440 sin logo (o siempre, si Opción C): pestaña con SVG «LP» verde.
- Chrome tras cambiar iniciales a «AB»: pestaña con «AB» verde.
- Chrome tras cambiar marca a otro color: pestaña con «AB» del nuevo color.
- Opcional: Safari y Firefox para confirmar cross-browser.

Total: ~4-6 fotos. Agrupables por navegador.

---

## 13. Anti-patrones

- ❌ Poner un `favicon.ico` estático en `public/` — sería un logo hardcodeado
  y `sin-cliente.py` no lo caza pero la plantilla no puede tener ese archivo
  con el logo de nadie.
- ❌ Depender solo del `logoUrl` del bucket como favicon sin fallback — si
  el bucket se cae, el navegador muestra un ícono roto por horas (favicons
  se cachean agresivamente).
- ❌ Cachear el SVG dinámico por más de unos minutos — un cambio de
  iniciales o color desde Ajustes tiene que verse pronto.
- ❌ Generar el SVG en un `useEffect` en el cliente y guardarlo como
  data-URL en el `<head>` — Next 16 App Router lo declara en
  `generateMetadata` server-side, sin hidratación.
- ❌ Usar `<Head>` de `next/head` — está deprecado en App Router. Se hace
  con `Metadata`.
- ❌ Meter el título del negocio en un `<title>` inline del componente —
  duplica lo que hace `generateMetadata` y puede desincronizarse.

---

## 14. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-11 | PRP generado. Estado: PENDIENTE de aprobación de Jack. |
