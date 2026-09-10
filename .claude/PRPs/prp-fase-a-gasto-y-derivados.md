# PRP-FASE-A · Gasto diario + CAC + Costo por asistida + AOV

> **Padre**: [`prp-maestro-evolucion-leandro.md`](./prp-maestro-evolucion-leandro.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 1 de 4 · **Depende de**: nada.
> **Autónoma**: no toca reportes, ni personas, ni sesión. Se puede arrancar sola con `/bucle-agentico`.

---

## 1. Objetivo

Que el dueño pueda cargar **cuánto gastó cada día** en captación, y que el
panel muestre **tres números derivados** que hoy no están: **CAC**, **costo por
llamada asistida** y **AOV**.

Estado final: al abrir el panel semanal con la semilla de oro cargada + un
gasto de `$14.400` en la misma semana, Leandro ve tres piezas nuevas cuyo
número da exactamente lo que la aritmética manda, y el resto del panel sigue
igual que hoy.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| El panel muestra cuánto **entró** y cuánto se **contrató**, pero no cuánto **costó** producirlo. Sin costo, «tasa de cierre 36%» no dice si el negocio da o no. | Una tabla `gastos` chiquita, tres derivados en el kernel, y tres piezas en la banda del panel. |
| Leandro no tiene cómo probar sus propios números contra los del panel. Corre la cuenta a mano en un WhatsApp. | Cargarlo en el panel deja el registro versionado y visible. |
| Ticket promedio (revenue ÷ cierres) contesta «cuánto vale una venta firmada». AOV (cash ÷ cierres) contesta «cuánto entra por cliente ganado». Son **dos preguntas** distintas y hoy solo hay una. | Se suma AOV al bloque de la plata, **sin sacar** ticket promedio. |

---

## 3. Criterios de éxito (medibles)

- [ ] Migración `003_gastos.sql` aplica limpio contra la base actual (idempotente: correrla dos veces no rompe).
- [ ] `POST /api/gasto` con `{fecha, montoCents, nota?}` upsertea por `fecha` PK; `GET /api/gasto?fecha=...` devuelve `{gasto: {...} | null}`.
- [ ] La pantalla `/gasto` está en el nav después de «Panel» y antes de «Reporte Setter». Layout `.hoja`. Un `CampoDinero` + un `<input type=date>` + un aviso «ya cargaste $X para el 24 de julio».
- [ ] En el panel:
  - Una pieza **Gasto** (dinero) **arriba de Leads** en el embudo (queda como paso 0 del funnel).
  - Tres piezas derivadas nuevas: **CAC**, **Costo por asistida**, **AOV**.
- [ ] Fórmulas: `cac = gastoDelPeriodo / cierres` (null si `cierres == 0`), `costoPorLlamadaAsistida = gastoDelPeriodo / asistieron` (null si `asistieron == 0`), `aov = cashCents / cierres` (null si `cierres == 0`). Todo en centavos, todo con `null` cuando divide por cero.
- [ ] `npm run verificar` sigue en verde con la semilla actual, y suma **4 comprobaciones nuevas** con la semilla + `$14.400` de gasto en la semana:
  - `gasto de la semana = $14.400`
  - `CAC = $626` (14.400 / 23 = 626.08 → se redondea a centavos)
  - `costo por asistida = $228` (14.400 / 63 = 228.57)
  - `AOV = $1.800` (41.400 / 23 = 1.800)
- [ ] La foto en 1440 y 390, claro y oscuro, muestra las cuatro piezas nuevas y no rompe ninguna existente.
- [ ] `npm run sin-cliente` en verde (nada de Leandro se coló en el código).

---

## 4. Comportamiento esperado (happy path)

```
Leandro entra a /gasto
  → ve la pantalla con el CampoDinero en foco, fecha = hoy en su zona
  → escribe "14400" en el campo (se ve como "$14,400")
  → aprieta "Guardar"
  → GET/POST hace upsert por fecha; aparece aviso "Guardado. Gasto del 10 de septiembre: $14,400."
  → si vuelve mañana y cambia la fecha a un día ya cargado, el campo se rellena
    y el botón dice "Reemplazar" (mismo patrón que setter/closer)

Leandro entra a /panel
  → arriba del embudo, en la fila 0, ve "Gasto · $14,400"
  → en la banda de tasas, ve tres piezas nuevas: CAC $626, Costo/asistida $228, AOV $1,800
  → cambia a "Mes" → el gasto se suma en la ventana del mes; los tres derivados recalculan
  → si el mes no tiene gastos cargados: gasto = $0, CAC y costo/asistida = "—",
    AOV se calcula igual (no depende del gasto)
```

---

## 5. Modelo de datos

### 5.1 Migración `supabase/migraciones/003_gastos.sql`

```sql
create table if not exists gastos (
  fecha          date         primary key,
  monto_cents    bigint       not null check (monto_cents >= 0),
  nota           text         null,
  es_demo        boolean      not null default false,
  creado_en      timestamptz  not null default now(),
  actualizado_en timestamptz  not null default now()
);

alter table gastos enable row level security;

-- permisos: mismo patrón que 002_permisos.sql, solo service_role toca
grant select, insert, update, delete on gastos to service_role;
revoke all on gastos from anon, authenticated;
```

**Decisiones y por qué**:

1. **`fecha` es la PK.** Un solo gasto por día. Si el dueño gastó en dos
   plataformas en el mismo día, la app pide **la suma**, con la nota como
   ayuda-memoria («$8k Meta, $6k Google»). Meter varias filas por día
   convertiría al gasto en un mini-libro contable, y no es lo que Leandro
   pidió.
2. **`monto_cents bigint`.** Igual que `revenue_cents` y `cash_cents`. Nunca
   `numeric`, nunca `float`.
3. **`es_demo`**. La semilla usa esto para que `--limpiar` borre solo lo suyo.
4. **Sin `persona_id`.** El gasto es del **negocio**, no de nadie del equipo.
   En Fase C solo el admin va a poder tocar esta tabla.

### 5.2 Tipos — `src/shared/tipos/index.ts`

Agregar:

```ts
/** Un gasto diario, en centavos. Uno por fecha. */
export interface Gasto {
  fecha: string       // ISO YYYY-MM-DD
  montoCents: number
  nota?: string | null
}

/** Métricas del panel + los tres derivados de la Fase A. */
export interface MetricasConCosto extends Metricas {
  /** Cost per acquired customer. `null` si no hubo cierres. */
  cac: number | null
  /** Costo por llamada asistida. `null` si no hubo asistidos. */
  costoPorLlamadaAsistida: number | null
  /** Average Order Value. `null` si no hubo cierres. Distinto del ticket promedio: ese usa revenue, este usa cash. */
  aov: number | null
  gastoCents: number
}
```

> Nota: `Metricas` vive en `src/shared/calculo/metricas.ts`. `MetricasConCosto`
> puede vivir ahí también, o en `tipos/index.ts` re-exportado — decide el
> hijo, con la única regla de que **una sola verdad**.

### 5.3 Kernel — `src/shared/calculo/metricas.ts`

Agregar (sin tocar las funciones existentes):

```ts
export function cac(gastoCents: number, cierres: number): number | null {
  return cierres > 0 ? Math.round(gastoCents / cierres) : null
}

export function costoPorLlamadaAsistida(gastoCents: number, asistieron: number): number | null {
  return asistieron > 0 ? Math.round(gastoCents / asistieron) : null
}

export function aov(cashCents: number, cierres: number): number | null {
  return cierres > 0 ? Math.round(cashCents / cierres) : null
}

export function metricasConCosto(
  setters: readonly ReporteSetter[],
  closers: readonly ReporteCloser[],
  gastoCents: number
): MetricasConCosto {
  const m = metricas(setters, closers)
  return {
    ...m,
    gastoCents,
    cac: cac(gastoCents, m.cierres),
    costoPorLlamadaAsistida: costoPorLlamadaAsistida(gastoCents, m.asistieron),
    aov: aov(m.cashCents, m.cierres),
  }
}
```

**🔴 Reglas del kernel para esta fase**:

- **Nunca se guarda un derivado.** CAC, costo/asistida y AOV se calculan al
  leer, en cada render.
- **Divisor 0 → `null`.** Un mes sin cierres, o una semana sin datos, deja
  los tres en `null`. Se pintan como `—` (usar `EL_GUION` de
  `src/shared/formato/index.ts`).
- **Redondeo a centavos entero** con `Math.round`. Es consistente con
  `ticketPromedioCents` que ya hace exactamente esto (línea 80 de
  `metricas.ts`).

### 5.4 Capa de datos — `src/shared/datos/interfaz.ts`

Agregar al puerto `CapaDeDatos`:

```ts
/** El gasto de un día, o null. */
buscarGasto(fecha: string): Promise<Gasto | null>

/** La suma de gastos entre dos fechas inclusive. Devuelve 0 si no hay. */
sumaGastos(v: Ventana): Promise<number>

/** UPSERT por fecha. */
guardarGasto(g: Gasto): Promise<void>
```

Implementación:

- `src/shared/datos/supabase/capa.ts`: tres métodos nuevos con `.from('gastos')`, siguiendo el patrón de `guardarReporteSetter` (upsert con `onConflict: 'fecha'`).
- `src/shared/datos/demo.ts`: agregar `gastos: Gasto[]` al `EstadoDemo` y hacer los tres métodos sobre esa lista. Sembrar `$14.400` para la semana de oro **solo en la variante no vacía** (`inicial(false)`).

### 5.5 Semilla — `src/shared/datos/semilla.ts`

Agregar al final:

```ts
/** Un gasto por día en la semana de oro. Suma $14.400 en la semana. */
export const GASTOS_DEMO: Gasto[] = SEMANA_ORO.map((fecha, i) => ({
  fecha,
  montoCents: [200_000, 220_000, 210_000, 230_000, 220_000, 190_000, 170_000][i], // 20+22+21+23+22+19+17 = 144
  nota: null,
}))

// Ampliar ORO:
export const ORO = {
  ...OROexistente,
  gastoSemana:   14_400_00,
  cacSemana:       626_09,   // 1_440_000 / 23 = 62608.69… → 62609 centavos → $626.09
  costoAsistida:   228_57,   // 1_440_000 / 63 = 22857.14…
  aovSemana:     1_800_00,   //   4_140_000 / 23 = 180000 centavos exactos
} as const
```

**🔴 Verificar la aritmética antes de escribirla:**

- `14.400 / 23 = 626.086…` → si se muestra sin decimales: `$626`. Con dos: `$626.09`. El hijo decide según `dinero()` (que hoy redondea con `Math.round(cents/100)`, o sea: **sin decimales**). Ver §6.
- `14.400 / 63 = 228.571…` → `$229` con `Math.round` o `$228` con truncado. `dinero()` hace `Math.round` — así que los centavos deben calcularse consistentes con eso. Anotar en la semilla lo que salga y comparar contra eso.
- `41.400 / 23 = 1.800` exacto.

---

## 6. Pantalla y piezas

### 6.1 Ruta `src/app/(app)/gasto/page.tsx` (nueva)

- Server Component. Lee `configuracion` y busca el gasto de hoy (`buscarGasto(hoyEn(config.zonaHoraria))`).
- Layout `.hoja` (1080 px), igual que `/reporte-setter`.
- Renderiza `<FormGasto ... />`.

### 6.2 `src/features/gasto/form.tsx` (nuevo)

Sigue el molde de `src/features/reportes/form-setter.tsx`:

- Fecha (`<input type=date>`), `CampoDinero` (reusar la pieza de
  `src/features/reportes/piezas.tsx`), textarea opcional para la nota.
- `useEffect` que hace `GET /api/gasto?fecha=...` y setea `existente`.
- Aviso «Ya cargaste $X para el 24 de julio. Si enviás de nuevo se
  **reemplaza**.» — copia el patrón de `form-setter.tsx` líneas 121-142.
- Botón: `Guardar` o `Reemplazar` según haya existente.
- Al enviar: `POST /api/gasto`, luego `router.push('/panel')` + `refresh`.

### 6.3 Endpoint `src/app/api/gasto/route.ts` (nuevo)

- `GET`: query `?fecha=...` → `zConsulta.pick({ fecha: true })` — reusar `esquemas.ts`.
- `POST`: valida con un `zGasto` nuevo:
  ```ts
  export const zGasto = z.object({
    fecha,                              // el mismo regex que ya existe
    montoCents: z.number().int().min(0).max(1_000_000_000),
    nota: z.string().trim().max(500).nullable().optional(),
  })
  ```
- Sigue el patrón exacto de `src/app/api/reportes/setter/route.ts`.

### 6.4 Panel — `src/features/panel/piezas.tsx` y `src/app/(app)/panel/page.tsx`

- `page.tsx`: leer el gasto del período: `const gastoCents = await capa.sumaGastos(v)`. Calcular `metricasConCosto`.
- **Pieza «Gasto»** (dinero) arriba de Leads en el embudo. En el kernel,
  `embudo()` devuelve `PasoEmbudo[]`. Agregar un paso al principio con
  `nombre: 'Gasto', valor: m.gastoCents, esDinero: true, conversion: null`.
  El ancho de este paso es una decisión del hijo (opciones: (a) no dibujar
  barra, mostrar solo el número; (b) escala independiente al 100% siempre).
  Recomendación: (a) — el gasto **no es un conteo** y no comparte escala con
  los leads, igual que el cash. Se dibuja con `.fnr` pero con clase
  `.fnr.spend` (que el mockup **ya** define, ver `.spend` en §5.3 del PRP v1).
- **Tres piezas nuevas** debajo del bloque `.tasas` (o dentro, según decida
  el hijo mirando el mockup PAPEL): CAC, Costo/asistida, AOV. Formato dinero,
  con `—` cuando `null`. Copy: «Costo de adquisición», «Costo por asistida»,
  «Valor promedio por cliente».
- **AOV va en la tarjeta `.plata`** al lado de «Ticket promedio», como cuarto
  peldaño del pie. `Ticket promedio` sigue donde está.

### 6.5 CSS y mockup

**🔴 No editar `src/app/globals.css` directo.**

Trabajar en `MOCKUP-APROBADO.html`:

1. Agregar la pantalla `?s=gasto` con el mismo layout que setter/closer.
2. Agregar las tres piezas nuevas al panel (o cuatro, si se separa la del gasto).
3. Correr `python3 scripts/gemelas.py` y `npm run portar-css` — el
   `portar-css.py` **falla ruidoso** si falta una gemela. Ver
   `.claude/memory/reference/pintar-el-mockup.md`.
4. `git diff src/app/globals.css` **tiene que ser** solo lo generado por el script.

### 6.6 Navegación

- `src/shared/chasis/nav.tsx` — agregar `{ href: '/gasto', texto: 'Gasto' }` **antes** de «Reporte Setter».

---

## 7. Fases internas (para el Bucle Agéntico)

Cada fase cierra con typecheck + lint verdes y el estado consistente.

| # | Fase | Qué entrega |
|---|---|---|
| A.1 | **Kernel + tipos** | `tipos/index.ts`, `metricas.ts` con `cac`, `costoPorLlamadaAsistida`, `aov`, `metricasConCosto`; tests en `metricas.test.ts` para los 6 casos (divisor 0 y no cero). |
| A.2 | **BD y capa** | Migración 003 + interfaz `CapaDeDatos` extendida + implementación Supabase + implementación Demo con `GASTOS_DEMO` en `semilla.ts`. |
| A.3 | **Endpoint y pantalla** | `/api/gasto` + `/gasto` con formulario, aviso de reemplazo, y nav actualizado. |
| A.4 | **Mockup + porteo de CSS** | Editar `MOCKUP-APROBADO.html` con la pantalla y las piezas nuevas, correr `gemelas.py` + `portar-css.py`, verificar que `globals.css` no tiene ediciones a mano. |
| A.5 | **Panel** | `page.tsx` lee gasto y llama `metricasConCosto`; `piezas.tsx` renderiza Gasto en embudo, CAC/Costo/AOV en su lugar. |
| A.6 | **Gate** | `npm run gate` verde, `verificar.mjs` con 4 números nuevos, contraprueba en rojo (romper CAC), foto en los 4 modos. |

---

## 8. Referencias explícitas al repo (paths reales)

- **Tipos**: `src/shared/tipos/index.ts` — agregar `Gasto`, `MetricasConCosto`.
- **Kernel**: `src/shared/calculo/metricas.ts` — agregar 4 funciones nuevas al final.
- **Tests**: `src/shared/calculo/metricas.test.ts` — agregar 6 casos.
- **Interfaz de datos**: `src/shared/datos/interfaz.ts` — 3 métodos nuevos, `CONFIGURACION_POR_DEFECTO` no cambia.
- **Capa Supabase**: `src/shared/datos/supabase/capa.ts` — patrón de `guardarReporteSetter` (upsert con `onConflict: 'fecha'`).
- **Capa demo**: `src/shared/datos/demo.ts` — agregar `gastos: Gasto[]` a `EstadoDemo` y a `inicial(false)`.
- **Semilla**: `src/shared/datos/semilla.ts` — agregar `GASTOS_DEMO` y ampliar `ORO`.
- **Migración**: `supabase/migraciones/003_gastos.sql` — nueva.
- **Endpoint**: `src/app/api/gasto/route.ts` — nuevo, siguiendo `src/app/api/reportes/setter/route.ts`.
- **Esquemas Zod**: nuevo `zGasto` en `src/app/api/reportes/esquemas.ts` (o mover a un archivo compartido `src/app/api/esquemas.ts` si crece).
- **Pantalla**: `src/app/(app)/gasto/page.tsx` — nueva.
- **Feature**: `src/features/gasto/form.tsx` — nuevo, modelo `form-setter.tsx`.
- **Panel**: `src/app/(app)/panel/page.tsx` (leer gasto) y `src/features/panel/piezas.tsx` (renderizar).
- **Nav**: `src/shared/chasis/nav.tsx` — insertar `/gasto`.
- **Mockup**: `MOCKUP-APROBADO.html` — pantalla `?s=gasto` y piezas nuevas del panel.
- **Verificador**: `scripts/verificar.mjs` — 4 comprobaciones nuevas después de las líneas 62-63.

---

## 9. Números de oro para esta fase

Después de `npm run semilla -- cargar` + los gastos de `GASTOS_DEMO`, el
verificador tiene que decir:

| # | Métrica | Esperado |
|---|---|---|
| 1 | Gasto de la semana (`sumaGastos` sobre `SEMANA_ORO`) | `$14,400` |
| 2 | CAC (`14.400 / 23`) | `$626` (o `$626.09` según decida el hijo cuando escriba el número) |
| 3 | Costo por asistida (`14.400 / 63`) | `$229` (redondeado con `Math.round`) |
| 4 | AOV (`41.400 / 23`) | `$1,800` |

**🔴 La aritmética final se comprueba a mano antes de escribir el literal.**
El mockup no tiene estos números — se derivan del banco de prueba.

---

## 10. Contraprueba (el gate tiene que poder ponerse rojo)

Antes de aceptar la fase, romper **a propósito** una fórmula y comprobar que
`verificar.mjs` se pone rojo:

```
// en metricas.ts, cambiar temporalmente:
export function cac(gastoCents: number, cierres: number): number | null {
  return cierres > 0 ? Math.round(gastoCents / cierres) + 1 : null   // +1 a propósito
}
```

Si el verificador sigue verde, la comprobación no está mirando ahí.

---

## 11. Recordatorio del gate — antes de decir "listo"

```bash
npm run typecheck     # sin errores
npm run lint          # sin warnings nuevos
npm test              # tests unitarios verdes
npm run sin-cliente   # sin datos de un negocio en el código
npm run build         # build verde por exit code
npm run verificar     # 24 + 4 = 28 números de oro contra la base
```

Y **la foto**:

- Escritorio 1440×900 y celular 390×844
- Tema claro **y** oscuro
- Con la semilla cargada: pantalla `/gasto` con aviso de reemplazo, pantalla `/panel` con las cuatro piezas nuevas visibles y sin scroll horizontal
- Sin semilla (`DEMO_VACIA=1`): las tres piezas nuevas muestran `—` sin romper el layout

---

## 12. Anti-patrones

- ❌ Guardar CAC/AOV/costo como columnas — todo se deriva.
- ❌ Un endpoint `PATCH` cuando `POST` con upsert alcanza (patrón del repo).
- ❌ `select * from gastos` en la capa — declarar columnas.
- ❌ Meter la nueva pantalla en `.wrap` sin `.hoja` — la banda ancha del panel no aplica a un formulario.
- ❌ Escribir CSS a mano en `globals.css`.
- ❌ Sumar gastos como número entero de dólares — todo en centavos.

---

## 13. Bitácora

*(vacía)*
