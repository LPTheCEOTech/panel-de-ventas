# PRP-D · Post Llamada — Nombre del lead + lógica condicional del cierre

> **Padre**: [`prp-maestro-sesion-2-feedback.md`](./prp-maestro-sesion-2-feedback.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 5 de 5 (última). **Depende de**: Fase C cerrada (por checkpoint).
> **Al final por**: única fase con migración de BD. Cambia el modelo de datos.

---

## 1. Objetivo

Agregar a `/llamada`:

1. **Campo «Nombre del lead»** (texto libre, obligatorio) que el closer
   completa a mano por cada llamada. Sin nombre no se guarda: la lista del
   día sin contexto no sirve.
2. **Lógica condicional del cierre**: si «Cerró» está OFF, los campos
   «Revenue contratado» y «Cash collected» **desaparecen o quedan
   deshabilitados** (no pedidos, sin asterisco). Excepción: si el closer
   está cargando un cash de una venta vieja (cobro anterior sin cierre nuevo),
   un checkbox explícito «cobro anterior» revela SOLO el Cash.
3. **Migración 007**: `alter table llamadas add column lead_nombre text` con
   default `''` o `null`. Ver §5.

Estado final: al abrir `/llamada`, el closer ve el campo «Nombre del lead»
arriba (obligatorio), los tres switches, el checkbox «cobro anterior» (o
similar), y los campos de dinero condicionales al estado de cerro/cobro
anterior. La lista del día muestra el nombre del lead en cada renglón.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| La lista del día del closer muestra `#1`, `#2`, `#3`… sin decir CON QUIÉN fue la llamada. A las 6 de la tarde, con 8 filas cargadas, el closer no distingue una de otra si quiere editarla. | Campo `lead_nombre` obligatorio. Se muestra en la lista y sirve para reconocer «esa» llamada. |
| Hoy Revenue y Cash tienen asterisco de «required» aunque «Cerró» esté OFF. Es confuso: si no cerré, ¿por qué me piden el revenue? | Cuando `cerró === false`: los campos se ocultan (o quedan disabled con placeholder «no cerró»). Sin asterisco. |
| El caso legítimo «cobré una cuota de una venta vieja» no calza con «cerró» (no cerró en esta llamada). Hoy el form lo permite con un aviso; el closer se acostumbra a ignorar avisos. | Un checkbox explícito «cobro de venta anterior» que revela SOLO el Cash cuando `cerró === false`. Sin ambigüedad. |
| Migración 007: la columna nueva no puede romper las 96 filas de semilla ni las filas reales que Leandro haya cargado. | `add column ... default ''` (o nullable + backfill). Ver §5.1. |

---

## 3. Criterios de éxito (medibles)

- [ ] Migración `007_lead_nombre.sql` aplica limpio contra la base actual
  (idempotente: correrla dos veces no rompe).
- [ ] Tipo `Llamada` gana `leadNombre: string` (o `string | null` si el hijo
  elige nullable — ver §5.1).
- [ ] Endpoint `POST /api/llamadas` valida `leadNombre` con Zod:
  ```ts
  leadNombre: z.string().trim().min(2, 'Escribí el nombre del lead').max(80)
  ```
  Sin ese campo, 400 con el mensaje.
- [ ] Endpoint `PATCH /api/llamadas` acepta `leadNombre` como opcional (para editar).
- [ ] En `/llamada`:
  - Nuevo campo «Nombre del lead» **arriba** del formulario (antes de los
    switches). Input text, obligatorio, con asterisco. Placeholder
    «Nombre y apellido del lead».
  - Nuevo checkbox «Cobro de venta anterior» (o el copy que decida el hijo)
    junto a los switches o debajo. Solo aparece cuando `cerró === false`.
  - Cuando `cerró === true`: ambos campos de dinero se muestran normal, con
    asterisco (obligatorio o al menos «esperado»). Copy actual.
  - Cuando `cerró === false && cobroAnterior === false`: los campos
    Revenue y Cash **se ocultan** (no `disabled`, se ocultan). Sin
    asterisco, sin espacio en la grilla. El aviso «cargaste cash sin
    cierre» **desaparece** (ya no es un aviso: es imposible cargar cash).
  - Cuando `cerró === false && cobroAnterior === true`: se muestra SOLO el
    campo Cash. Revenue queda oculto (o disabled con cero). Aviso: «Cash
    de venta anterior; no cuenta como cierre nuevo.»
- [ ] La lista del día muestra el `leadNombre` en cada renglón, entre `#N`
  y los badges de asistió/cerró.
- [ ] Al **editar** una llamada: si el `leadNombre` viejo está vacío
  (fila cargada antes de la migración), se muestra placeholder «(sin
  nombre)» y el campo pide llenarlo al guardar la edición.
- [ ] Semilla `LLAMADAS_DEMO` (96 filas) gana un `leadNombre` determinista:
  «Lead demo 1/96», «Lead demo 2/96», … o el hijo decide un patrón más
  legible (p. ej. nombres típicos rotando). **Deterministas**: dos corridas
  de la semilla producen los mismos nombres.
- [ ] `npm run verificar` verde. Si el hijo agrega un chequeo (p. ej.
  `todas las llamadas activas tienen leadNombre no vacío`), documentar el
  número nuevo.
- [ ] Contraprueba: intentar `POST /api/llamadas` sin `leadNombre` (o con
  string vacío) → 400.
- [ ] Contraprueba: crear una fila con `cerró = false && cash > 0` sin
  marcar «cobro anterior» → el form no lo permite (el campo Cash está
  oculto). Directamente por curl → el endpoint acepta (la BD no valida
  eso), pero el front nunca genera ese caso.
- [ ] Foto en 4 modos: `/llamada` con los 3 estados del cierre (cerró=true /
  cerró=false / cerró=false+cobro anterior).

---

## 4. Decisión clave: ¿nullable o NOT NULL con default?

**Opción A · `leadNombre text NULL`**.
- Las filas viejas quedan con `NULL`.
- El front muestra `(sin nombre)` cuando `null`.
- El tipo TS es `string | null`.
- Migración trivial: `alter table llamadas add column lead_nombre text`.

**Opción B · `leadNombre text NOT NULL DEFAULT ''`**.
- Las filas viejas se rellenan automáticamente con `''`.
- El tipo TS es `string`. Simplifica el código consumidor.
- Migración: `alter table llamadas add column lead_nombre text not null default ''`.
- Requiere backfill de la semilla si se quiere que las 96 filas de demo
  tengan un nombre real.

**Recomendación del PRP**: **Opción B con default `''`** + **semilla
actualizada con nombres deterministas**. Menos ramas condicionales en el
código; el `''` se pinta como `(sin nombre)` igual que un null pero sin
manejar dos casos.

**El hijo puede argumentar A si prefiere preservar el «nulo semántico»**
(nulo = «nunca se preguntó»; `''` = «se preguntó y quedó vacío»). Documenta
en la bitácora.

---

## 5. Modelo de datos

### 5.1 Migración `supabase/migraciones/007_lead_nombre.sql`

```sql
-- 🔴 Sesión 2 · nombre del lead por llamada. Obligatorio en el form; la BD
-- permite '' para las filas viejas sin romper. El front pinta '' como
-- «(sin nombre)» al editarlas.
alter table llamadas
  add column if not exists lead_nombre text not null default '';

-- (opcional) chequeo blando: el largo típico anda entre 2 y 80
alter table llamadas
  add constraint if not exists llamadas_lead_nombre_len
  check (char_length(lead_nombre) <= 200);
```

**🔴 No borrar el default después**. El default protege contra INSERTs
directos que se olviden del campo (por ejemplo, el instalador de otro
alumno con un script viejo).

### 5.2 Tipos — `src/shared/tipos/index.ts`

Extender `Llamada`:

```ts
export interface Llamada {
  id: string
  personaId: string
  fecha: string
  asistio: boolean
  reagendada: boolean
  cerro: boolean
  revenueCents: number
  cashCents: number
  nota?: string | null
  activa: boolean
  /** 🔴 Sesión 2 · nombre del lead que atendió la llamada. Obligatorio en el
   *  form; en filas viejas puede ser '' hasta que se editen. */
  leadNombre: string
}
```

### 5.3 Capa de datos

- **Interfaz** (`src/shared/datos/interfaz.ts`): `crearLlamada` acepta
  `leadNombre: string` en el `Omit`. Sin cambio de firma.
- **Capa Supabase** (`src/shared/datos/supabase/capa.ts`): mapear
  `lead_nombre` en `leerLlamadas`, `crearLlamada`, `actualizarLlamada`.
- **Capa demo** (`src/shared/datos/demo.ts`): agregar `leadNombre` a
  `crearLlamada`; en `EstadoDemo`, la lista de llamadas lleva el campo.

### 5.4 Semilla — `src/shared/datos/semilla.ts`

`LLAMADAS_DEMO` gana `leadNombre` determinista. Opciones:

**A · Nombres genéricos**: `Lead demo ${i + 1}/96` — anodino pero
consistente.

**B · Nombres típicos rotando**: array de 40-50 nombres reales rioplatenses
(sin datos personales de nadie del equipo real). `LEAD_NOMBRES[(i +
personaIdx * 7) % LEAD_NOMBRES.length]`. Se ve más natural en la lista y
en fotos de demo.

**Recomendación**: **B**. La demo es una herramienta de venta; que los
nombres se vean como una lista de leads reales cuenta. Ojo con
`sin-cliente.py`: no meter nombres que puedan confundirse con clientes de
Leandro (usar nombres claramente ficticios, tipo `Sofía Ramírez`, `Mateo
López`, etc.).

### 5.5 Verificador — `scripts/verificar.mjs`

**Chequeo nuevo** (opcional pero recomendado):

- Contar filas de `llamadas` con `lead_nombre = '' AND es_demo = true` → debe ser 0 (la semilla nueva rellena todos).
- Contar filas de `llamadas` con `lead_nombre <> '' AND activa = true` → debe ser 96 después de plantar la semilla.

O más simple: **no agregar nada al verificador** y confiar en la validación
de Zod en el POST. Decide el hijo.

---

## 6. UI

### 6.1 `src/features/llamadas/panel-llamada.tsx` — cambios

Estado nuevo:

```ts
const [leadNombre, setLeadNombre] = useState('')
const [cobroAnterior, setCobroAnterior] = useState(false)
```

Lógica derivada:

```ts
const mostrarRevenue = cerro
const mostrarCash = cerro || (!cerro && cobroAnterior)
const puedeGuardar =
  leadNombre.trim().length >= 2 &&
  personaId &&
  // si cerró: revenue y cash son esperados (>= 0 acepta 0)
  // si cobro anterior: cash > 0 esperado (no obligado a nivel Zod)
  true
```

Bloques del form (orden):

1. **Quién y cuándo** (fecha + closer) — sin cambios.
2. **Nombre del lead** (NUEVO, obligatorio) — input text arriba de los switches.
3. **Cómo fue esta llamada** — 3 switches: Asistió, Reagendada, Cerró.
4. **(condicional)** Checkbox «Cobro de venta anterior» — solo si `cerro === false`.
5. **Plata** — condicional:
   - `cerro === true`: Revenue + Cash.
   - `cerro === false && cobroAnterior === true`: solo Cash.
   - `cerro === false && cobroAnterior === false`: no aparece la sección.
6. **Nota** (opcional) — sin cambios.
7. Botón Guardar — disabled si `!puedeGuardar`.

El `avisos` actual (líneas 50-52 del archivo) se recorta:
- El «cargaste cash sin cierre» **ya no ocurre** desde el form (el campo
  está oculto sin cobro anterior). Se elimina el aviso.
- El «marcaste cerró sin asistió» se mantiene (edge case legítimo:
  «cerró por mensaje después»).

Lista del día (renglón `.llamada-row`, línea 210+):

```tsx
<div className="llamada-row" key={l.id}>
  <span className="ll-n">#{i + 1}</span>
  <span className="ll-lead">{l.leadNombre || '(sin nombre)'}</span>
  <div className="ll-badges">…</div>
  <span className="ll-cash num">…</span>
  <button className="del" …>…</button>
</div>
```

CSS nuevo (mockup): `.ll-lead{font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px}` — el hijo elige el ancho.

### 6.2 Endpoint `src/app/api/llamadas/route.ts` — cambios

Extender `zNueva`:

```ts
const zNueva = z.object({
  fecha,
  personaId: z.string().min(1).max(64).optional(),
  leadNombre: z.string().trim().min(2, 'Escribí el nombre del lead').max(80),
  asistio: z.boolean(),
  reagendada: z.boolean(),
  cerro: z.boolean(),
  revenueCents: dineroCents,
  cashCents: dineroCents,
  nota: z.string().trim().max(500).nullable().optional(),
})
```

Y `zCambios` agrega `leadNombre: z.string().trim().min(2).max(80).optional()`.

En el handler POST, pasar `leadNombre` a `crearLlamada`.

### 6.3 Mockup + porteo

**🔴 En el mockup, no en `globals.css`.**

- Pantalla `?s=llamada`: agregar el input «Nombre del lead» arriba de los
  switches.
- Agregar el checkbox «Cobro de venta anterior» (con la misma clase `sw`
  que los switches).
- Ajustar la lista del día para mostrar el nombre del lead entre `#N` y los
  badges: nueva clase `.ll-lead` con el estilo.
- Correr `python3 scripts/gemelas.py` + `npm run portar-css`.

### 6.4 Nav / navegación

Sin cambios. `/llamada` sigue accesible desde el nav.

---

## 7. Fases internas (para el Bucle Agéntico)

| # | Fase | Qué entrega |
|---|---|---|
| D.1 | **BD** | Migración 007. Tipos `Llamada.leadNombre`. Capa Supabase + Demo mapean el campo. |
| D.2 | **Semilla** | `LLAMADAS_DEMO` con `leadNombre` determinista (Opción A o B). Semilla replantada limpia y re-cargada; `verificar` verde. |
| D.3 | **Endpoint** | `zNueva` + `zCambios` con `leadNombre`. Contraprueba: POST sin nombre → 400. |
| D.4 | **UI Form** | `panel-llamada.tsx` con campo lead nombre, checkbox cobro anterior, lógica condicional de Revenue/Cash. Tests de estados. |
| D.5 | **UI Lista** | Renglón con el lead nombre entre `#N` y badges. |
| D.6 | **Mockup + porteo** | Pantalla `?s=llamada` actualizada. `gemelas.py` + `portar-css.py`. |
| D.7 | **Instalador** | `scripts/instalar.mjs` agrega `007_lead_nombre.sql` a `MIGRACIONES` (línea 23). |
| D.8 | **Gate + foto** | 4 modos × 3 estados del cierre. Contraprueba: POST curl sin lead_nombre → 400. |

---

## 8. Referencias explícitas al repo (paths absolutos)

- **Migración**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/supabase/migraciones/007_lead_nombre.sql` — nueva.
- **Tipos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/tipos/index.ts` — línea 50 (`Llamada`).
- **Capa Supabase**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/supabase/capa.ts` — buscar `leerLlamadas`, `crearLlamada`, `actualizarLlamada`.
- **Capa demo**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/demo.ts` — buscar `crearLlamada`.
- **Interfaz**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/interfaz.ts` — método `crearLlamada`.
- **Semilla**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/semilla.ts` — `LLAMADAS_DEMO`.
- **Endpoint**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/llamadas/route.ts` — `zNueva` (línea 21), `zCambios` (línea 32).
- **UI**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/llamadas/panel-llamada.tsx` — 250 líneas.
- **Mockup**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/MOCKUP-APROBADO.html` — pantalla `?s=llamada`.
- **Instalador**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/scripts/instalar.mjs` — línea 23 (`MIGRACIONES`).
- **Verificador**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/scripts/verificar.mjs` — chequeo opcional del campo.

---

## 9. Números / criterios de "listo"

Los 24 + 4 + `filasSetter` + `filasLlamadas` de siempre siguen verdes.

**Chequeo nuevo opcional** (recomendado):

- Todas las llamadas activas de la semilla (`es_demo=true`) tienen `lead_nombre <> ''` — 96 filas.

Chequeos manuales:

- [ ] Cargar una llamada con `cerró = true`: Revenue y Cash visibles y esperados.
- [ ] Cargar una llamada con `cerró = false` y sin cobro anterior: Revenue y Cash NO visibles. Guardar → llama a la API con revenue=0 y cash=0.
- [ ] Cargar con `cerró = false` y `cobro anterior = true`: solo Cash visible. Guardar → llama con revenue=0 y el cash tipeado. Aviso «cash de venta anterior» visible.
- [ ] Intentar guardar sin lead nombre: botón disabled. Con lead nombre < 2 chars: idem.
- [ ] Editar una llamada vieja (pre-migración) con `lead_nombre = ''`: se ve `(sin nombre)` en la lista, el form al editar lo pide.
- [ ] Contraprueba curl: `POST /api/llamadas` sin `leadNombre` → 400 con «Escribí el nombre del lead».

---

## 10. Contraprueba

- Cambiar temporalmente el Zod para hacer `leadNombre` opcional → el POST
  sin nombre pasa → la lista del día muestra `#1 (sin nombre) …` sin
  crashear. Reactivar → 400.
- En el form, forzar `cobroAnterior = true && cerro = true` (edge que
  puede coexistir): el hijo decide si es válido (se muestran ambos campos)
  o el checkbox se auto-desmarca al prender `cerro`. Recomendación:
  desmarcar al prender `cerro` — el «cobro anterior» solo tiene sentido
  cuando NO cerró.

---

## 11. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar   # 24 anteriores + 4 gasto + filasSetter + filasLlamadas (+opcional: filasLlamadasConNombre)
```

**Foto** — cubrir los estados nuevos:

- `/llamada` cerró=ON: form completo con Revenue y Cash — 4 modos.
- `/llamada` cerró=OFF y cobro anterior=OFF: sin campos de dinero — 4 modos.
- `/llamada` cerró=OFF y cobro anterior=ON: solo Cash + aviso — 2 modos (1440 claro/oscuro).
- `/llamada` con lista del día mostrando 3-4 leads con nombre — 2 modos.
- `/llamada` intentando guardar sin nombre (botón disabled visible) — 1 modo.

Total: ~12-15 fotos, agrupables.

---

## 12. Anti-patrones

- ❌ Poner `leadNombre` como `TEXT NOT NULL` sin default — bloquea el
  INSERT de las filas viejas al aplicar la migración contra una BD con
  datos reales.
- ❌ Validar `leadNombre >= 2` en la BD con un CHECK que rechace `''` —
  rompe las filas viejas de un solo golpe. La validación viva en Zod.
- ❌ Deshabilitar (`disabled`) los campos Revenue/Cash en vez de ocultarlos
  cuando no aplican — deshabilitados siguen ocupando espacio y confunden.
  Ocultar directamente.
- ❌ Dejar el asterisco de required en Revenue/Cash cuando el flow no los
  pide — el asterisco tiene que estar solo cuando el campo se pide.
- ❌ Mezclar el checkbox «cobro anterior» con los switches de asistió/
  cerró/reagendada — es una decisión distinta (dice qué caso de negocio
  cubre esta llamada), va aparte.
- ❌ Cargar la semilla con `leadNombre` inventado a partir de nombres
  reales de contactos de Leandro — usar nombres claramente ficticios,
  `sin-cliente.py` los revisa.
- ❌ Editar `src/app/globals.css` a mano para la lista del día — mockup +
  porteo.
- ❌ Cambiar el modelo de `Llamada` sin actualizar `agregarLlamadas()` en
  el kernel — la firma sigue igual porque `leadNombre` no participa del
  agregado, pero verificar.

---

## 13. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-11 | PRP generado. Estado: PENDIENTE de aprobación de Jack. |
| 2026-09-11 | **Ejecutado. Opción B (NOT NULL DEFAULT '').** Migración 007 aplicada contra la base real (`information_schema.columns` confirma `lead_nombre text NOT NULL default ''::text`), con `constraint llamadas_lead_nombre_len` (char_length <= 200) creado por bloque `DO $$` para ser idempotente. Tipo `Llamada.leadNombre: string`. Capa Supabase: mapeo en `leerLlamadas/crearLlamada/actualizarLlamada`. Semilla con nombres ficticios rioplatenses (30 nombres, hash determinista por fecha+persona+n) — `sin-cliente.py` verde. `demo-vivo.mjs` con 25 nombres deterministas propios. Endpoint `/api/llamadas`: `zNueva.leadNombre` con `.trim().min(2)`, `zCambios.leadNombre` opcional. Form `panel-llamada.tsx`: campo obligatorio arriba, checkbox «Cobro de venta anterior» (solo aparece si `!cerro`, se auto-apaga al prender «Cerró»), bloque Plata condicional (`mostrarRevenue = cerro`, `mostrarCash = cerro \|\| cobroAnterior`), aviso «cash sin cierre» ELIMINADO (ya no es posible), aviso nuevo «cash de venta anterior» cuando corresponde. Lista muestra `leadNombre \|\| '(sin nombre)'` entre `#N` y badges. Mockup con `.ll-lead` + grid ajustado a 5 columnas + gemela mobile con grid areas. **Aprendizaje**: el test viejo `Fase D · una llamada agenda cuenta aunque no asista` construía un literal `Llamada` sin `leadNombre` → typecheck rojo. Fix trivial. Ejecución contra base real: `semilla limpiar/cargar` → 96 llamadas nuevas con lead_nombre real. `verificar` → 27/27 ✅. `demo-vivo cargar` → 643 llamadas de 8 semanas con lead_nombre. Gate local: typecheck, **41/41 tests**, lint, sin-cliente (69), build (11/11). |
