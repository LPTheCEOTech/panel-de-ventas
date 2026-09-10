# PRP-FASE-D · Reporte Post Llamada (solo closer, granular)

> **Padre**: [`prp-maestro-evolucion-leandro.md`](./prp-maestro-evolucion-leandro.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 4 de 4 · **Depende de**: Fase C cerrada.
> **Por qué al final**: cambia el modelo de datos del closer y toca el kernel. Todo lo anterior tiene que seguir cuadrando.

---

## 1. Objetivo

Reemplazar el «Reporte del día del closer» (agregado diario) por un **Reporte
Post Llamada**: **una fila por llamada**. Los agregados que hoy alimentan al
panel (llamadas, asistidos, cierres, revenue, cash) se **derivan sumando
llamadas**. Los setters **no se tocan**.

Estado final: el closer, cuando termina una llamada, entra a `/llamada`,
completa un formulario chico (tres switches y dos montos), y ve la lista de
sus llamadas del día. El panel sigue mostrando los mismos números que hoy,
pero ahora vienen de sumar `llamadas`, no de una tabla agregada.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| El agregado diario oculta lo que pasa entre llamadas. «Asistieron 4 de 6» no distingue quiénes reagendaron ni cuáles cerraron; a fin de mes, el closer no puede volver a mirar «esa» llamada. | Una fila por llamada, editable/borrable (lógico), con un renglón por cada evento del día. |
| Un cierre de una llamada de ayer, cobrado hoy, hoy se anota como «revenue de hoy». La granularidad hace visible ese desfasaje. | Cada llamada lleva su propio revenue/cash. Se ordena por creación. |
| Bryan (el modelo de LP) ya tiene el patrón por llamada. El agregado fue una simplificación. | Alinear con Bryan sin dejar de servir el panel — el kernel suma. |

---

## 3. Criterios de éxito (medibles)

- [ ] Migración `006_llamadas.sql`: crea tabla `llamadas`. **NO borra `reportes_closer`** en esta migración (se decide en §5.3 qué hacer con ella).
- [ ] Cada fila representa **una** llamada: `id, persona_id, fecha, asistio, reagendada, cerro, revenue_cents, cash_cents, nota?`. Sin `unique (fecha, persona_id)`.
- [ ] Pantalla `/llamada` (closer):
  - Formulario **chico**: switches para `Asistió`, `Reagendada`, `Cerró`, más `Revenue contratado` (`CampoDinero`) y `Cash collected` (`CampoDinero` hero). Nota opcional.
  - Botón «Guardar llamada» → `POST /api/llamadas`.
  - **Lista del día abajo**, ordenada por `creado_en desc`, con editable y baja lógica (icono papelera → marca `activa = false`).
  - Contador vivo al pie: «Hoy: 4 llamadas · 3 asistieron · 2 cerraron · $3.500 de $6.000».
- [ ] La ruta `/reporte-closer` se **redirige a `/llamada`** (`redirect(...)`) durante 1-2 semanas, después se elimina.
- [ ] Kernel:
  - `totales(setters, closers)` **cambia**: recibe `llamadas` en el lugar de `closers`. Los agregados salen de sumar `llamadas` filtradas por ventana y persona.
  - Alternativa (menos intrusiva): crear `totalesDeLlamadas(setters, llamadas)` y dejar `totales` viejo por si hay que revertir. Recomendación: **cambiar la firma** — el modelo viejo no va a volver.
  - Regla: **una llamada cuenta como 1 llamada en agenda**, sume o no `asistio/cerro`. El closer registra igual las que no asistieron (para no perder la agenda del día).
- [ ] Panel:
  - Los mismos números de hoy con la semilla equivalente (rehecha).
  - Cash-por-día y ranking siguen andando (suman `cashCents` de llamadas de ese día / persona).
- [ ] Setters intactos: `reportes_setter`, `/reporte-setter`, `form-setter.tsx`, endpoint — sin cambios de comportamiento.
- [ ] Semilla rehecha: en vez de 21 filas agregadas de closer, ahora hay **96 filas de `llamadas`** (una por llamada de la semana de oro). Los totales dan exactamente los mismos números de oro (leads 342 · agendas 104 · **llamadas 96** · asistieron 63 · cierres 23 · revenue $69.000 · cash $41.400).
- [ ] `npm run verificar` verde. Los 24 números de oro cuadran. **`verificar.mjs` cambia**: en vez de leer `reportes_closer`, lee `llamadas` y las suma; el resto queda igual.
- [ ] Contraprueba: se marca `activa = false` a una llamada — el panel resta ese cash de la semana.
- [ ] Foto en 4 modos: `/llamada` con lista del día, contador vivo, aviso al borrar; `/panel` con los mismos números.

---

## 4. Comportamiento esperado

```
Un closer entra a /llamada
  → ve el formulario chico arriba: [Asistió] [Reagendada] [Cerró]
                                    [Revenue $ ___] [Cash $ ___]
                                    [nota opcional]  [Guardar llamada]
  → completa: Asistió=sí, Reagendada=no, Cerró=sí, Revenue=$3000, Cash=$1500
  → click "Guardar llamada"
  → abajo aparece: "Llamada #4 · hace 12s · asistió · cerró · $1,500 cobrados · [editar] [borrar]"
  → contador al pie: "Hoy: 4 llamadas · 3 asistieron · 2 cerraron · $3,500 de $6,000"

Se equivocó
  → click "borrar" en la llamada #3
  → confirmación inline "Borrar llamada de las 15:23 (asistió, cerró, $2,000)?"
  → confirma → la llamada se marca activa = false, desaparece de la lista
  → contador se recalcula: "Hoy: 3 llamadas · 2 asistieron · 1 cerró · $1,500 de $3,000"
  → el panel al instante refleja el cambio

Un admin entra a /llamada  (según lo que Jack decida en §7)
  → o bien puede seleccionar por qué closer está cargando (le vuelve el <select>)
  → o bien /llamada solo la ve el closer; el admin ve la agregación en /panel
```

---

## 5. Modelo de datos

### 5.1 Migración `supabase/migraciones/006_llamadas.sql`

```sql
create table if not exists llamadas (
  id             uuid        primary key default gen_random_uuid(),
  persona_id     uuid        not null references personas(id) on delete restrict,
  fecha          date        not null,
  asistio        boolean     not null,
  reagendada     boolean     not null default false,
  cerro          boolean     not null,
  revenue_cents  bigint      not null default 0 check (revenue_cents >= 0),
  cash_cents     bigint      not null default 0 check (cash_cents >= 0),
  nota           text        null,
  activa         boolean     not null default true,  -- baja lógica
  es_demo        boolean     not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists llamadas_fecha_persona on llamadas (fecha, persona_id) where activa;
create index if not exists llamadas_fecha on llamadas (fecha) where activa;

alter table llamadas enable row level security;
grant select, insert, update, delete on llamadas to service_role;
revoke all on llamadas from anon, authenticated;
```

**🔴 Decisiones**:

1. **SIN `unique (fecha, persona_id)`.** Un closer tiene varias llamadas por
   día. Ese es exactamente el cambio.
2. **`activa` en vez de DELETE.** Baja lógica, igual que `personas`. El
   closer se puede equivocar; el histórico no se toca.
3. **Índice parcial `where activa`.** El panel siempre filtra activas; el
   índice sirve al 100%. Las inactivas van al histórico o al audit.
4. **`revenue_cents` y `cash_cents` con default 0** — una llamada sin cierre
   no obliga a tipear ceros. En el kernel se suma igual.
5. **`reagendada` con default false.** Es un caso menos frecuente que
   `asistió` o `cerró`, no lo obligo.

### 5.2 Qué hacer con `reportes_closer`

**Opciones**:

- **(a) Dejarla como está, marcada como legacy.** Sin escrituras nuevas. El
  panel deja de leerla. Vive 30 días y en la migración 007 se dropea.
- **(b) Dropearla en la migración 006.** Simple, pero irreversible en el
  minuto que Leandro cambia de opinión.
- **(c) Vista de compatibilidad** — `create view reportes_closer_v as select
  ... from llamadas group by fecha, persona_id`. Mantiene compatibilidad si
  alguien consulta la BD desde afuera.

**Recomendación**: **(a)**. La tabla queda como está, `capa.ts` deja de
leerla y la semilla la deja intacta (ya cargada). En 30 días o cuando Jack
diga, migración 007 la borra.

### 5.3 Tipos — `src/shared/tipos/index.ts`

```ts
/** Una llamada del closer. Baja lógica: `activa=false` la saca del panel. */
export interface Llamada {
  id: string
  personaId: string
  fecha: string        // ISO
  asistio: boolean
  reagendada: boolean
  cerro: boolean
  revenueCents: number
  cashCents: number
  nota?: string | null
  activa: boolean
}
```

**Se sacan** `ReporteCloser` del uso corriente (queda declarado por si algo
externo lo necesita, pero el kernel y el panel dejan de importarlo).

### 5.4 Kernel — `src/shared/calculo/metricas.ts`

Cambio grande pero focalizado:

```ts
// Nuevas funciones que reemplazan al par (totales, metricas) para el lado closer.
export function totalesDeLlamadas(
  setters: readonly ReporteSetter[],
  llamadas: readonly Llamada[]
): Totales {
  const t = { ...CERO }
  for (const r of setters) {
    t.leads += r.conversaciones
    t.agendas += r.agendas
  }
  for (const l of llamadas) {
    if (!l.activa) continue
    t.llamadas   += 1              // 🔴 UNA llamada = 1 en el conteo, asista o no
    if (l.asistio)   t.asistieron  += 1
    if (l.reagendada) t.reagendadas += 1
    if (l.cerro)     t.cierres     += 1
    t.revenueCents += l.revenueCents
    t.cashCents    += l.cashCents
  }
  return t
}

export function metricasDeLlamadas(
  setters: readonly ReporteSetter[],
  llamadas: readonly Llamada[]
): Metricas {
  const t = totalesDeLlamadas(setters, llamadas)
  return {
    ...t,
    tasaAgenda: tasa(t.agendas, t.leads),
    tasaAsistencia: tasa(t.asistieron, t.llamadas),
    tasaCierre: tasa(t.cierres, t.asistieron),
    llamadasSobreAgendas: tasa(t.llamadas, t.agendas),
    porcentajeCobro: tasa(t.cashCents, t.revenueCents),
    ticketPromedioCents: t.cierres > 0 ? Math.round(t.revenueCents / t.cierres) : null,
  }
}
```

`rankingClosers` cambia su parámetro de `readonly ReporteCloser[]` a
`readonly Llamada[]` (o se crea `rankingClosersLlamadas` y se migra el
consumo). Recomendación: **cambiar** la firma. La suma es idéntica al viejo
por-fecha.

`barrasPorDia` y `barrasPorSemana`: cambian su parámetro a `readonly
Llamada[]`; ya no hay una fila por fecha sino N, pero el agrupamiento es el
mismo (por `l.fecha`).

### 5.5 Capa de datos — `src/shared/datos/interfaz.ts`

Agregar (y el hijo decide si **remueve** los viejos `leerReportesCloser`,
`buscarReporteCloser`, `guardarReporteCloser`):

```ts
leerLlamadas(v: Ventana, personaId?: string): Promise<Llamada[]>
crearLlamada(l: Omit<Llamada, 'id' | 'activa'>): Promise<Llamada>
actualizarLlamada(id: string, cambios: Partial<Omit<Llamada, 'id' | 'personaId' | 'fecha'>>): Promise<void>
bajaLogicaLlamada(id: string): Promise<void>
```

**Los viejos no se borran en esta fase.** El panel deja de llamarlos, la ruta
`/reporte-closer` desaparece o redirige, y quedan como código legacy hasta la
migración 007.

### 5.6 Semilla — `src/shared/datos/semilla.ts`

Se rehace la parte del closer. En vez de:

```
REPORTES_CLOSER_DEMO: 21 filas (3 closers × 7 días)
```

se genera:

```
LLAMADAS_DEMO: 96 filas (una por llamada de la semana)
```

**🔴 Aritmética obligatoria**:

- Total llamadas = 96 (Andrea 39 + Diego 34 + Carlos 23).
- Total asistidos = 63 (Andrea 26 + Diego 23 + Carlos 14).
- Total cierres = 23 (Andrea 11 + Diego 8 + Carlos 4).
- Total cash = $41.400.
- Total revenue = $69.000 (los cierres a $3.000 c/u).

El hijo genera las 96 filas con un algoritmo determinístico:

```ts
// pseudo-pseudo
for cada closer:
  for cada día de la semana:
    for i = 1 hasta llamadasDelDia[closer][día]:
      const asistio = i <= asistidosDelDia[closer][día]
      const cerro   = asistio && i <= cierresDelDia[closer][día]
      const cash    = cerro ? cashPorLlamada(closer, día, i) : 0
      const revenue = cerro ? 300_000 : 0  // $3000
      push({ personaId, fecha, asistio, reagendada: false, cerro, revenueCents: revenue, cashCents: cash })
```

Con `cashPorLlamada` calculado para que **la suma por día por closer** dé
exactamente lo que hoy dice `CLOSERS[...][4]` (el arreglo de cash por día).

**El hijo prueba a mano** que `LLAMADAS_DEMO.reduce(...)` cuadra con `ORO`
antes de correr `verificar`.

### 5.7 `verificar.mjs`

Cambia:

- La consulta de `reportes_closer` desaparece. Se lee `llamadas`:
  ```
  const { data: llCrudas } = await sb.from('llamadas')
    .select('id, persona_id, fecha, asistio, reagendada, cerro, revenue_cents, cash_cents, activa')
    .gte('fecha', V.desde).lte('fecha', V.hasta).eq('activa', true)
  ```
- Se llama `metricasDeLlamadas` en vez de `metricas`.
- Se llama `rankingClosersLlamadas` (o el nuevo nombre) para los rankings.
- **Se cuenta las filas**: `llCrudas.length === 96`. Nuevo número de oro.
- Se ajusta `ORO.filas` de 42 → **117** (21 setter + 96 llamadas). O se
  divide en dos comprobaciones: `filas setter = 21`, `filas llamadas = 96`.

---

## 6. Pantalla y endpoints

### 6.1 `/llamada` — `src/app/(app)/llamada/page.tsx`

- Server Component.
- Solo accesible por miembros con `persona.rol in ('closer','ambos')` o por admin (§7).
- Lee las llamadas del día (`leerLlamadas({desde: hoy, hasta: hoy}, personaIdDelClose)`).
- Renderiza `<FormLlamada>` + `<ListaLlamadasHoy>`.

### 6.2 `src/features/llamadas/form.tsx` + `src/features/llamadas/lista.tsx`

- Form: switches + dos `CampoDinero` (reusar `src/features/reportes/piezas.tsx`) + textarea `Nota` (opcional).
- Lista: cada fila con hora (`hh:mm` de `creado_en`), badges de asistió/cerró/reagendada, cash. Botones editar/borrar.
- Contador vivo al pie: `SumatoriaHoy` que suma la lista visible.

### 6.3 Endpoint `src/app/api/llamadas/route.ts` (nuevo)

- `POST { fecha, asistio, reagendada, cerro, revenueCents, cashCents, nota? }` — crea. `personaId` sale de la sesión (Fase C ya lo obliga).
- `PATCH { id, cambios }` — edita.
- `DELETE { id }` — baja lógica (`bajaLogicaLlamada`).
- Validación con Zod: `zLlamada`, `zEdicionLlamada`, `zBaja`.

### 6.4 Redirect `/reporte-closer`

Reemplazar `src/app/(app)/reporte-closer/page.tsx` por un archivo que hace:

```ts
import { redirect } from 'next/navigation'
export default function ReporteCloser() {
  redirect('/llamada')
}
```

En **la migración 007** (fase futura), la carpeta se elimina.

### 6.5 Nav

`src/shared/chasis/nav.tsx` — cambiar `Reporte Closer` por `Post Llamada` con
`href: '/llamada'`. **Reporte Setter no cambia.**

### 6.6 Mockup + porteo

Nueva pantalla `?s=llamada` en `MOCKUP-APROBADO.html` con formulario chico y
lista del día. Correr `gemelas.py` + `portar-css.py`. Verificar que
`globals.css` solo cambia por el porteo.

---

## 7. Interacción entre Fase D y Fase C

D **asume que C ya está**. Concretamente:

- Un closer logueado carga en `/llamada` **sin `<select>` de persona** (el
  `personaId` sale de la sesión).
- Un admin abriendo `/llamada` — dos opciones:
  - **(a)** Redirect a `/panel` (el admin no carga llamadas por otros; lo
    hacen ellos con su login).
  - **(b)** Muestra `<select>` de closers para cargar «como» alguien
    (backfill, útil el primer mes).
  - **Recomendación**: **(b)**, con el `<select>` visible solo si rol =
    admin, misma lógica que en Fase C.

Si Fase C aún no está cerrada, D **no arranca**. El maestro lo pone en la
sección 2 como dependencia dura.

---

## 8. Fases internas

| # | Fase | Qué entrega |
|---|---|---|
| D.1 | **Semilla y verificador** | Rehacer `LLAMADAS_DEMO`, ampliar `ORO`, actualizar `verificar.mjs` a leer `llamadas`. Correr sin la BD: los totales calculados a mano cierran. |
| D.2 | **BD** | Migración 006, tabla `llamadas`, permisos, índices parciales. Semilla real cargada; `verificar.mjs` verde. |
| D.3 | **Kernel** | `totalesDeLlamadas`, `metricasDeLlamadas`, adaptar `rankingClosers*` y `barras*`. Tests unitarios nuevos. |
| D.4 | **Capa de datos** | `leerLlamadas` / `crearLlamada` / `actualizarLlamada` / `bajaLogicaLlamada` en Supabase y demo. |
| D.5 | **Panel** | Reemplazar la lectura de `reportes_closer` por `llamadas` en `src/app/(app)/panel/page.tsx`. Verificar que los números son idénticos. |
| D.6 | **Mockup + porteo** | Pantalla `?s=llamada`, `gemelas.py`, `portar-css.py`. |
| D.7 | **Pantalla y endpoint** | `/llamada`, `/api/llamadas`, `FormLlamada`, `ListaLlamadasHoy`, contador vivo. |
| D.8 | **Redirect** | `/reporte-closer` redirige a `/llamada`. Nav actualizado. |
| D.9 | **Gate + foto + contraprueba** | Borrar una llamada y ver el panel bajar; forzar `verificar` en rojo cambiando la suma; foto en 4 modos. |

---

## 9. Referencias explícitas al repo

- **Tipos**: `src/shared/tipos/index.ts` — agregar `Llamada`. `ReporteCloser` **queda declarado** (legacy).
- **Kernel**: `src/shared/calculo/metricas.ts` — nuevas funciones `totalesDeLlamadas`, `metricasDeLlamadas`; ajustar `rankingClosers`, `barrasPorDia`, `barrasPorSemana` para consumir `Llamada[]`.
- **Tests**: `src/shared/calculo/metricas.test.ts` — nuevos casos para llamadas (activa/inactiva, sin cash sin cierre, etc.).
- **Interfaz**: `src/shared/datos/interfaz.ts` — 4 métodos nuevos. Los viejos `leerReportesCloser*` quedan (deprecados internamente).
- **Capa Supabase**: `src/shared/datos/supabase/capa.ts` — 4 métodos nuevos sobre `.from('llamadas')`.
- **Capa demo**: `src/shared/datos/demo.ts` — `llamadas: Llamada[]` en `EstadoDemo`, los 4 métodos.
- **Semilla**: `src/shared/datos/semilla.ts` — nuevo `LLAMADAS_DEMO` (96 filas); ampliar `ORO` con `filasLlamadas: 96`; los antiguos `REPORTES_CLOSER_DEMO` quedan **para compatibilidad de tests viejos**, o se borran si no hay consumidores.
- **Migración**: `supabase/migraciones/006_llamadas.sql`.
- **Endpoint**: `src/app/api/llamadas/route.ts` (nuevo), `POST/PATCH/DELETE`.
- **Pantalla**: `src/app/(app)/llamada/page.tsx` (nueva).
- **Feature**: `src/features/llamadas/form.tsx`, `src/features/llamadas/lista.tsx` (nuevas).
- **Redirect**: `src/app/(app)/reporte-closer/page.tsx` — `redirect('/llamada')`.
- **Panel**: `src/app/(app)/panel/page.tsx` — cambiar `leerReportesCloser` por `leerLlamadas`; usar `metricasDeLlamadas`.
- **Nav**: `src/shared/chasis/nav.tsx` — `Reporte Closer` → `Post Llamada`, `/reporte-closer` → `/llamada`.
- **Mockup**: `MOCKUP-APROBADO.html` — pantalla `?s=llamada`.
- **Verificador**: `scripts/verificar.mjs` — leer `llamadas` en vez de `reportes_closer`; contar 96; usar `metricasDeLlamadas`.
- **Semilla script**: `scripts/semilla.mjs` — cargar `LLAMADAS_DEMO` en `llamadas` (upsert con `onConflict: 'id'` o insert simple; decidir).

---

## 10. Números de oro (los mismos, otra semilla)

Con `LLAMADAS_DEMO` cargado (y `REPORTES_SETTER_DEMO` intacto), `npm run
verificar` tiene que decir:

| Métrica | Esperado |
|---|---|
| Filas setter | 21 |
| **Filas llamadas** | **96** (nuevo) |
| Leads / Agendas / Llamadas / Asistieron / Cierres | 342 · 104 · 96 · 63 · 23 |
| Revenue / Cash | $69.000 · $41.400 |
| Tasas | 30.4% · 65.6% · 36.5% |
| Cobro / Ticket | 60% · $3.000 |
| Ranking closers | Andrea $19.800 (11 · 42%) · Diego $14.400 (8 · 35%) · Carlos $7.200 (4 · 29%) |
| Barras cash/día | idéntico al array actual |

**Si cambia un solo número, es porque la semilla nueva no cuadra**. El hijo
arregla la semilla, no el verificador.

Y de la Fase A siguen los 4 números de gasto/CAC/costo/AOV, sin cambios.

---

## 11. Contraprueba

- Marcar `activa = false` a UNA llamada de Andrea del jueves (la del cash
  más alto) → correr `verificar` → tiene que ponerse rojo (cash bajó,
  cierres bajaron, ranking cambió).
- Volver a marcarla `activa = true` → verificar verde.

---

## 12. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar   # 24 números anteriores + 4 de gasto + 1 nuevo (filas llamadas)
```

**Foto** — cubrir los estados nuevos:

- `/llamada` vacía (primera llamada del día) — 4 modos
- `/llamada` con 4-5 filas cargadas y contador vivo — 4 modos
- `/llamada` durante la confirmación de borrado — 2 fotos (1440 claro/oscuro)
- `/llamada` en modo edición de una fila — 2 fotos
- `/panel` con la semilla nueva → tiene que verse **idéntico** al panel actual — 4 modos (esto es lo que prueba que el kernel suma bien)
- `/reporte-closer` → verifica que redirige a `/llamada` (curl)

---

## 13. Anti-patrones

- ❌ Contar `t.llamadas += 1` solo si `l.asistio` — la agenda existe aunque no asista.
- ❌ Guardar el agregado por día como caché en una tabla — todo se deriva.
- ❌ Borrar `reportes_closer` en la 006 antes de que Jack lo apruebe.
- ❌ Cambiar el modelo del setter «de paso» — está fuera de alcance de esta fase.
- ❌ Dejar la pantalla `/reporte-closer` accesible aunque sea desde el nav — o redirige o desaparece.
- ❌ Que `verificar.mjs` derive los números de oro de la semilla (comparación circular). Los literales siguen en `ORO`.
- ❌ Modificar el algoritmo de `rankingClosers` para que ordene por «cierres» en vez de «cash» — es un cambio de UX que no pidió Leandro.
- ❌ Aceptar cash > 0 con cerro = false. **En la BD** está permitido (default 0), pero el formulario tiene que avisar «Cargaste cash sin marcar cierre — ¿es cash de una llamada anterior?». Copiar el patrón de `form-closer.tsx` líneas 52-56.

---

## 14. Bitácora

*(vacía)*
