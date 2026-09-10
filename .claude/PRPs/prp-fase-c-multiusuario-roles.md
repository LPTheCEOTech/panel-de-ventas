# PRP-FASE-C · Multiusuario, roles e invitar equipo

> **Padre**: [`prp-maestro-evolucion-leandro.md`](./prp-maestro-evolucion-leandro.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 3 de 4 · **Depende de**: Fase B cerrada.
> **Bloquea**: Fase D. Ver §2 del maestro: si D va antes, el formulario del closer se rehace dos veces.

---

## 1. Objetivo

Que el panel deje de ser mono-usuario. Cada persona del equipo se loguea con
su propio correo, la app sabe **quién es** (a qué fila de `personas` está
ligado) y **qué rol** tiene (`admin` o `miembro`), y:

- El admin ve todo (como hoy).
- Un miembro con `rol_persona = closer` ve solo sus propios reportes y su
  propio ranking (o el ranking se le oculta — decisión abajo).
- Un miembro con `rol_persona = setter` ídem, filtrado a lo suyo.
- Los formularios ya no muestran el `<select>` de persona cuando el que carga
  es un miembro: ya sabemos quién es.
- El admin puede **invitar por correo** desde Equipo: se crea el usuario en
  Auth, se lo liga a la persona nueva o existente, y le llega el correo de
  invitación de Supabase.

Estado final: dos correos pueden loguearse. El del admin ve el panel entero,
el del closer ve su propio panel filtrado, y ninguno de los dos ve nada más
de lo que le toca.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| Hoy hay **un solo usuario** (el que crea `instalar.mjs`) y toda persona del equipo carga con el mismo login. En la práctica, Leandro tiene que darle su contraseña a cada closer. | Cada miembro tiene su propio login, ligado a su fila de `personas`. La contraseña se elige en el correo de invitación. |
| Un closer, al abrir el panel, ve los números de todos: los suyos, los de sus compañeros, y los del negocio (dinero, gastos). Es información que no le corresponde. | Filtro por `persona_id` en la lectura de reportes cuando el rol es `miembro`. El admin sigue viendo todo. |
| El formulario del closer tiene un `<select>` de personas. Un closer legítimo que se loguea con su propio correo no debería poder cargar reportes «por» otro. | El `<select>` desaparece si el que carga es un miembro; solo aparece si es admin. |
| No hay forma de dar de alta a alguien sin que Jack (o quien administre) meta manualmente correo + contraseña. | Botón «Invitar por correo» en Equipo → `sb.auth.admin.inviteUserByEmail`. |
| Ajustes es del negocio, no de un vendedor. Un miembro que entra y cambia el color de la marca es un caos. | Ajustes visible **solo para admin**. Nav filtrado por rol. |

---

## 3. Criterios de éxito (medibles)

- [ ] Migración `005_usuarios.sql` aplica. Crea tabla `usuarios` con FK a `auth.users` y FK opcional a `personas`. Idempotente.
- [ ] `sesion.ts` (o un nuevo helper) devuelve `{ userId, personaId?, rol }` desde el `auth.users` del proxy.
- [ ] El proxy (o el layout `(app)`) redirige a `/pendiente` si el usuario está logueado pero **no tiene fila en `usuarios`** o no tiene `persona_id` siendo `miembro`. **Nunca** al panel con datos ajenos.
- [ ] El admin creado por `instalar.mjs` queda con `rol = admin` y `persona_id = null` (no es un vendedor).
- [ ] En `/equipo`:
  - Botón **«Invitar por correo»** al lado o dentro de «Agregar a alguien». Pide correo + rol.
  - Flow: `sb.auth.admin.inviteUserByEmail(correo)` → crea persona (si el nombre no existe) → crea fila `usuarios (auth_user_id, persona_id, rol='miembro')`.
  - En la lista de personas, cada activa muestra si tiene login vinculado y qué correo.
- [ ] En `/panel`, con miembro logueado:
  - Solo aparecen **sus** reportes en tasas, embudo, cash-por-día y ranking.
  - El ranking: se **oculta** (recomendado, ver §4). Alternativa: se muestra pero solo con la fila propia — decisión del hijo, argumentada.
  - Gasto y CAC se ocultan (son datos del negocio).
- [ ] En `/reporte-setter` y `/reporte-closer`, con miembro logueado:
  - Sin `<select>` de persona. Nombre en un `<div>` como confirmación («Cargás como: **Juan Pérez**»).
  - El endpoint valida que `personaId` del body coincide con el `personaId` de la sesión — o mejor, **ignora el `personaId` del body** y usa el de la sesión.
- [ ] `/ajustes` y `/gasto` **redirigen a `/panel` si no sos admin**. El nav no las muestra a miembros.
- [ ] `npm run gate` verde. `npm run verificar` verde (los números de oro se corren con la capa admin, no cambian).
- [ ] Contraprueba: forjar un POST `/api/reportes/closer` con `personaId` ajeno desde una sesión miembro → 403 (o se ignora y se guarda con el `personaId` correcto — el hijo elige, pero el ajeno **no** se guarda).

---

## 4. Decisión clave: ¿qué ve un miembro del panel?

**Opciones**:

- **(a) Panel filtrado sin ranking.** El miembro ve **sus** tasas, **su**
  embudo, **su** cash-por-día. El ranking no aparece. Gasto/CAC ocultos.
- **(b) Panel filtrado con ranking recortado.** El miembro ve lo suyo y un
  ranking donde solo aparece él (fila única). Feo y sin sentido.
- **(c) Panel filtrado con ranking completo.** Peligroso: expone cash de
  compañeros. Se descarta.

**Recomendación del PRP**: **(a)**. El ranking existe para que el jefe compare;
para el miembro no aporta. La pieza «Ranking» se renderiza solo si `rol === 'admin'`
o si `config.rankingVisible` sigue como está y además el rol es admin.

**El hijo la puede cambiar si Jack la revierte.** Se documenta en la bitácora.

---

## 5. Modelo de datos

### 5.1 Migración `supabase/migraciones/005_usuarios.sql`

```sql
create table if not exists usuarios (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  persona_id   uuid null references personas(id) on delete restrict,
  rol          text not null check (rol in ('admin', 'miembro')),
  creado_en    timestamptz not null default now()
);

-- Un miembro está ligado a UNA persona; el admin puede no tener persona.
create unique index if not exists usuarios_persona_unica on usuarios (persona_id)
  where persona_id is not null;

alter table usuarios enable row level security;
grant select, insert, update, delete on usuarios to service_role;
revoke all on usuarios from anon, authenticated;
```

**🔴 Decisiones**:

1. **`auth_user_id` es la PK.** No hay una segunda superficie donde
   identificar a un usuario. `auth.users` ya es autoridad.
2. **`persona_id` es NULL para el admin.** El admin no es un vendedor; no
   figura en `personas`. Si algún día quiere aparecer también como closer,
   se le crea una `Persona` y se le pone `persona_id`.
3. **Unique parcial** (`where persona_id is not null`): una persona no puede
   tener dos logins. Dos admins con `null` sí — Leandro puede sumar un
   segundo admin sin quemarse.
4. **`on delete restrict`** en `persona_id`: la persona no se puede borrar
   (ya es baja lógica), pero además la app no puede borrar usuarios ligados
   por error.
5. **`on delete cascade`** en `auth_user_id`: si se borra el usuario de auth,
   la fila de `usuarios` se va también (para no dejar huérfanos que apunten
   a nadie).

### 5.2 Tipos — `src/shared/tipos/index.ts`

```ts
export type RolUsuario = 'admin' | 'miembro'

export interface Usuario {
  authUserId: string
  personaId: string | null
  rol: RolUsuario
}

/** El usuario actual, resuelto desde el proxy o el layout. */
export interface Sesion {
  authUserId: string
  correo: string
  usuario: Usuario   // fila de `usuarios`; si no existe, la app manda a /pendiente
  persona: Persona | null   // resuelta desde personas si usuario.personaId, si no null
}
```

### 5.3 Capa de datos — extender `CapaDeDatos`

En `src/shared/datos/interfaz.ts` agregar:

```ts
/** Busca la fila de `usuarios` del auth_user_id logueado. Null si no existe. */
buscarUsuario(authUserId: string): Promise<Usuario | null>

/** Alta de un usuario nuevo (después de la invitación de auth). Devuelve la fila. */
crearUsuario(authUserId: string, personaId: string | null, rol: RolUsuario): Promise<Usuario>

/** Baja de un usuario (por si el admin quiere revocar acceso). */
borrarUsuario(authUserId: string): Promise<void>
```

Y **todos los métodos de lectura de reportes** ganan un `personaId?` opcional:

```ts
leerReportesSetter(v: Ventana, personaId?: string): Promise<ReporteSetter[]>
leerReportesCloser(v: Ventana, personaId?: string): Promise<ReporteCloser[]>
```

Implementación Supabase: `.eq('persona_id', personaId)` cuando llega, si no
no se agrega el filtro. Implementación demo: `.filter(r => !personaId || r.personaId === personaId)`.

### 5.4 `src/shared/datos/sesion.ts` (o nuevo `sesion-usuario.ts`)

Hoy el archivo hace login/cookies. Se agrega una función que **desde el
Server Component** resuelve el `Sesion` completo:

```ts
export async function sesionActual(): Promise<Sesion | null> {
  // usa createServerClient con la anon key y la cookie de la petición
  // llama a supabase.auth.getUser()  🔴 getUser, no getSession
  // busca en `usuarios` la fila por auth_user_id
  // si no existe: devuelve null → el caller redirige a /pendiente
  // si existe y tiene personaId: lee la persona
}
```

Esta función corre **con service_role** para leer `usuarios` y `personas`
(no se puede leer con anon porque RLS está prendido sin políticas).

---

## 6. Login e invitación

### 6.1 Instalador — `scripts/instalar.mjs`

Cambia el paso 4:

- El correo que se pide en el instalador ahora es el del **admin**.
- Después de crear el usuario en `auth.users`, inserta:
  ```
  INSERT INTO usuarios(auth_user_id, persona_id, rol) VALUES ($1, NULL, 'admin');
  ```
- Si ya había un usuario (el caso «re-instalar»), le da rol admin si no la
  tiene o mensaje «Ya existe X con rol Y — no se toca.»

### 6.2 Nuevo endpoint `src/app/api/equipo/invitar/route.ts`

- `POST { correo, nombre, rol }` — donde `rol` es el rol de la **persona**
  (setter, closer, ambos). El **rol de la app** siempre es `miembro`.
- Flow:
  1. Valida con Zod.
  2. `sb.auth.admin.inviteUserByEmail(correo)` — Supabase manda el correo
     con el link para elegir contraseña. Devuelve el `authUserId`.
  3. Busca o crea la fila `personas` con ese nombre. Si existe con otro rol,
     el hijo decide: (a) actualizar a `ambos`, o (b) rechazar y pedir usar
     la persona existente. Recomendación: **(b)**.
  4. `crearUsuario(authUserId, personaId, 'miembro')`.
  5. Devuelve `{ ok, correo }`.
- Errores:
  - Ya existe un usuario con ese correo → 409, mensaje: «Ya invitaste a este correo. Chequeá en Supabase Auth si aceptó.»
  - Falla `inviteUserByEmail` porque no hay SMTP configurado → 500 con mensaje que dice **exactamente** eso, y linkea a la guía de Supabase.

### 6.3 Login — `src/app/api/auth/login/route.ts`

**No cambia mucho.** Después del login exitoso, en vez de mandar directo a
`/panel`, se hace un chequeo:

- Se llama a `sesionActual()`.
- Si no hay fila en `usuarios` → 303 a `/pendiente`.
- Si es admin → 303 a `/panel` (o `?next=...`).
- Si es miembro → 303 a `/panel` (filtrado).

### 6.4 Nueva pantalla `/pendiente`

`src/app/(app)/pendiente/page.tsx` — server component, sin filtros por rol:

- Muestra: «Tu correo está en la base pero **no está vinculado a nadie del equipo**. Pedile al admin que te vincule desde Equipo.»
- Botón «Salir».
- El proxy tiene que dejar pasar `/pendiente` para cualquier usuario logueado.

---

## 7. Fases internas

| # | Fase | Qué entrega |
|---|---|---|
| C.1 | **BD** | Migración 005, tabla `usuarios`, tipos `RolUsuario`, `Usuario`, `Sesion`. |
| C.2 | **Sesión y capa** | `sesionActual()` en `sesion.ts`, extender `CapaDeDatos` con `personaId?` en los leers y con `buscarUsuario`/`crearUsuario`/`borrarUsuario`. Adaptar capa demo (el `EstadoDemo` gana `usuarios: Usuario[]`, y `demo.ts` acepta un ENV `DEMO_ROL=admin|miembro` para poder pisarlo). |
| C.3 | **Instalador** | `scripts/instalar.mjs` inserta la fila `usuarios` del admin. |
| C.4 | **Invitación** | Endpoint `/api/equipo/invitar` + UI en `src/features/equipo/lista.tsx` (botón, modal simple). |
| C.5 | **Nav filtrado** | `Nav` recibe `rol` y filtra `Ajustes` y `Gasto` cuando `rol === 'miembro'`. `Topbar` recibe `sesion`, muestra correo + rol en `.quien`. |
| C.6 | **Panel filtrado** | `panel/page.tsx` pasa `personaId` a `leerReportesSetter/Closer` cuando `rol === 'miembro'`. Ocultar `<RankingClosers>`, `<RankingSetters>`, «Gasto» y CAC/Costo-asistida. AOV puede quedar si aplica al miembro (decide el hijo argumentando). |
| C.7 | **Formularios filtrados** | `FormSetter`/`FormCloser` sin `<select>` para miembro; endpoints ignoran el `personaId` del body y usan el de la sesión cuando rol = miembro. |
| C.8 | **Pantalla `/pendiente`** | Ruta pública dentro de `(app)` (o fuera). Proxy actualizado. |
| C.9 | **Gate + foto** | 3 sesiones distintas: sin login, admin logueado, miembro logueado. Foto en 4 modos por sesión. |

---

## 8. Referencias explícitas al repo

- **Tipos**: `src/shared/tipos/index.ts` — agregar `RolUsuario`, `Usuario`, `Sesion`. Considerar sacar `usuario_nombre` y `usuario_rol` de `Configuracion` (§10).
- **Interfaz**: `src/shared/datos/interfaz.ts` — extender `CapaDeDatos` con 3 nuevos + `personaId?` en 2 leers.
- **Capa Supabase**: `src/shared/datos/supabase/capa.ts` — implementar los nuevos y agregar el filtro `.eq('persona_id', ...)`.
- **Capa demo**: `src/shared/datos/demo.ts` — `usuarios: Usuario[]` en `EstadoDemo`, filtro por persona en `leerReportes*`.
- **Sesión**: `src/shared/datos/sesion.ts` — agregar `sesionActual()`. Considerar mover a `sesion-usuario.ts`.
- **Sesión reglas**: `src/shared/datos/sesion-reglas.ts` — agregar `/pendiente` a `RUTAS_PUBLICAS` (o crear una nueva categoría «logueado sin vincular»).
- **Proxy**: `src/proxy.ts` — después de `getUser`, si el usuario está logueado y **no** es `/pendiente` ni `/login`, verificar `buscarUsuario(user.id)`. Si null → redirect a `/pendiente`.
- **Instalador**: `scripts/instalar.mjs` — insertar en `usuarios` tras crear el usuario en auth.
- **Migración**: `supabase/migraciones/005_usuarios.sql`.
- **Endpoint invitar**: `src/app/api/equipo/invitar/route.ts` (nuevo).
- **API reportes**: `src/app/api/reportes/setter/route.ts` y `.../closer/route.ts` — ignorar `personaId` del body si rol = miembro y usar sesión.
- **Nav**: `src/shared/chasis/nav.tsx` — recibir rol, filtrar `/gasto` y `/ajustes` cuando miembro.
- **Topbar**: `src/shared/chasis/topbar.tsx` — mostrar correo + rol en `.quien`; opcional: badge «Admin» / «Miembro».
- **Panel**: `src/app/(app)/panel/page.tsx` — pasar `personaId` y `rol` a las lecturas y a las piezas.
- **Piezas panel**: `src/features/panel/piezas.tsx` — `RankingClosers`, `RankingSetters` opcionalmente aceptan `rol` y no se renderizan si `miembro`.
- **FormSetter**: `src/features/reportes/form-setter.tsx` — condicional del `<select>`.
- **FormCloser**: `src/features/reportes/form-closer.tsx` — condicional del `<select>`.
- **Equipo**: `src/features/equipo/lista.tsx` — modal / sección «Invitar por correo» y columna nueva con el correo vinculado.
- **Ajustes page**: `src/app/(app)/ajustes/page.tsx` — redirect a `/panel` si `rol !== 'admin'`.
- **Gasto page**: `src/app/(app)/gasto/page.tsx` — redirect a `/panel` si `rol !== 'admin'`.
- **Pendiente page**: `src/app/(app)/pendiente/page.tsx` (nuevo).

---

## 9. Sobre `configuracion.usuario_nombre` y `usuario_rol`

Hoy la tabla `configuracion` tiene `usuario_nombre` y `usuario_rol` (ver
`supabase/migraciones/001_esquema.sql` líneas 21-22). En mono-usuario servía
para pintar el `.quien` del topbar.

**Con multi-usuario, esto ya no tiene sentido.** Opciones:

- **(a) Quitarlas.** Migración 005 hace `alter table configuracion drop column usuario_nombre, drop column usuario_rol`. El topbar toma el nombre y el rol del usuario logueado.
- **(b) Renombrarlas a «quién administra».** Se muestran como texto informativo en Ajustes: «Administrado por: Leandro P. (Dueño)». Pero es doblemente sospechoso: si hay 3 admins, ¿cuál se pone?

**Recomendación**: **(a)**. Cortar por lo sano. El `.quien` del topbar sale
de `sesion.correo` (y de la fila `personas` si el usuario está ligado). El
mockup se ajusta para reflejarlo — «Juan Pérez · Closer» sale de
`sesion.persona.nombre` y `sesion.persona.rol`.

**El hijo puede argumentar (b) si Jack lo prefiere.**

---

## 10. Números / criterios de "listo"

**Sin números nuevos.** `verificar.mjs` sigue con 24+4 y va a correr como
antes: el gate lo lanza como admin (con service_role) y los números cierran.

Sí hay chequeos manuales:

- [ ] Logueo con el admin → veo Panel completo, Gasto, Ajustes en el nav.
- [ ] Logueo con un miembro closer → veo Panel filtrado (sin ranking, sin gasto), no veo Gasto ni Ajustes en el nav. Si voy a `/ajustes` a mano → redirect a `/panel`.
- [ ] Logueo con un correo sin fila en `usuarios` → `/pendiente`.
- [ ] Desde el admin, invito por correo → llega el correo (probar en local con Supabase, ver logs de auth), el usuario invitado puede elegir contraseña y loguearse, y ya aparece como miembro.
- [ ] Curl con sesión de miembro:
  ```
  curl -H "cookie: ..." -X POST /api/reportes/closer \
    -d '{"fecha":"2026-07-24","personaId":"<otro>","llamadas":10,...}'
  ```
  → 403 o guardado con el `personaId` propio del miembro (nunca el ajeno).

---

## 11. Contraprueba

- Deshabilitar el filtro por `personaId` en `leerReportesCloser` (comentar
  la línea del `.eq`), refrescar el panel como miembro → aparecen datos
  ajenos. **Reactivar** → vuelve a filtrar.
- Comentar la redirección de `/ajustes` para no-admin → un miembro entra a
  Ajustes. **Reactivar** → 303 a `/panel`.
- Comentar la redirección a `/pendiente` en el proxy → un usuario nuevo
  invitado entra al panel sin vinculación → ve datos ajenos. **Reactivar**
  → va a `/pendiente`.

---

## 12. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar   # va con service_role, sigue verde
```

**Foto** — la más grande de las 4 fases:

- Sin login: pantalla de login (ya cubierta)
- Admin en panel, gasto, equipo (con invitar abierto), ajustes — 4 pantallas × 4 modos = 16 fotos
- Miembro en panel filtrado, reporte closer sin `<select>`, `/pendiente` — 3 pantallas × 4 modos = 12 fotos
- Total: ~28 fotos. El hijo puede agrupar (por ejemplo, 1440 claro y 390 oscuro por pantalla) pero deja **al menos una** por pantalla × combinación.

---

## 13. Anti-patrones

- ❌ Confiar en el `personaId` del body del POST cuando rol = miembro.
- ❌ Redirigir a `/panel` en el proxy antes de haber chequeado `usuarios` — un correo nuevo terminaría viendo la vista filtrada del último miembro que estuvo en la sesión.
- ❌ Meter `rol` en un JWT custom y no en la base — la sesión de Supabase no es el lugar para agregar claims a mano.
- ❌ Hacer las políticas RLS en vez del filtro server-side — RLS con service_role no aplica; la barrera tiene que estar en el `.eq('persona_id', ...)` de la consulta, en el servidor.
- ❌ Dejar `usuario_nombre` en `configuracion` como decorativo — dos verdades sobre quién es el dueño.
- ❌ Un botón «invitar» que crea el auth user pero no la fila en `usuarios` — el invitado logea y va a `/pendiente` sin saber por qué.
- ❌ Cambiar el copy o el layout del panel de manera que cuando volvés a admin **no** vuelve a verse igual que antes. La app tiene que ser reversible al modo admin actual.

---

## 14. Bitácora

*(vacía)*
