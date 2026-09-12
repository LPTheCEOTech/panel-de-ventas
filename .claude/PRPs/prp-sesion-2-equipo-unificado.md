# PRP-A · Equipo — Alta e invitación en un solo flujo

> **Padre**: [`prp-maestro-sesion-2-feedback.md`](./prp-maestro-sesion-2-feedback.md)
> **Estado**: ⏳ PENDIENTE · **Orden**: 2 de 5 · **Depende de**: Fase E cerrada (por checkpoint, no técnicamente).
> **Autónoma**: no toca BD. Se puede arrancar sola con `/bucle-agentico`.

---

## 1. Objetivo

Unificar «Agregar a alguien» e «Invitar por correo» en **un solo formulario**:
Nombre + Rol + Correo → siempre se crea la persona **y** se manda la
invitación por correo. La persona nunca queda sin login vinculado desde
Equipo.

Estado final: en `/equipo` hay UNA sola card lateral «Agregar al equipo» con
tres campos (Nombre, Rol, Correo) y un solo botón «Agregar e invitar». Al
guardar, se crea la persona, se manda el correo con el link para elegir
contraseña, y aparece en la lista con la etiqueta de correo vinculado.

---

## 2. Por qué

| Problema | Solución |
|---|---|
| Hoy hay **dos cards** en Equipo: «Agregar a alguien» (crea persona sin login) e «Invitar por correo» (crea persona + auth user + fila usuarios). Confunde: son dos caminos para lo mismo, uno rompe el modelo de Fase C (persona sin usuario). | Una sola card, un solo camino: siempre se agrega Y se invita. |
| Una persona creada sin login queda «huérfana»: no puede loguearse, no aparece como usuario en Supabase Auth, y el admin no sabe si le mandó el correo. | El correo se vuelve OBLIGATORIO al dar de alta. La invitación es parte del alta, no un paso opcional. |
| El «usuario admin único» (persona=null) hoy solo se crea desde el instalador. Al haber dos flows separados en Equipo, alguien podía intentar crearlo desde ahí. | Confirmar: el admin único NO se crea desde Equipo. Sigue viviendo en `scripts/instalar.mjs`. |

---

## 3. Criterios de éxito (medibles)

- [ ] En `/equipo` hay **UNA sola card** lateral llamada «Agregar al equipo»
  (o el copy que decida el hijo). La card «Invitar por correo» **desaparece**.
- [ ] La card tiene tres campos:
  - `Nombre` (input text, mín 2, máx 80).
  - `Rol` (select: setter / closer / ambos).
  - `Correo` (input email, requerido, máx 254).
  Y un solo botón: **«Agregar e invitar»**.
- [ ] Al enviar:
  - `POST /api/equipo` con `{ nombre, rol, correo }`.
  - Backend: valida con Zod (correo requerido), llama a
    `sb.auth.admin.inviteUserByEmail(correo)`, crea (o reusa) la persona,
    crea la fila `usuarios(auth_user_id, persona_id, rol='miembro')`.
  - Devuelve `{ persona, invitado: true }`.
  - Front: mensaje «Invitación enviada a `<correo>`. Cuando acepte queda
    vinculada a `<nombre>`.», limpia los tres campos, `router.refresh()`.
- [ ] `POST /api/equipo/invitar` **se elimina** (o queda como redirect a
  `/api/equipo` — decisión del hijo, ver §5).
- [ ] En la lista de personas, cada activa muestra el correo vinculado si lo
  tiene (columna nueva o subtítulo debajo del nombre — decide el hijo, ver
  mockup).
- [ ] Errores manejados con mensajes accionables:
  - Correo inválido → 400 con «El correo no parece válido».
  - Persona con ese nombre ya existe → 409 con «Ya hay alguien con ese nombre. Cambialo o dale de baja al viejo.» (mismo copy que hoy).
  - Correo ya invitado (Supabase: «already been registered») → 409 con «Ya invitaste a este correo. Chequealo en Supabase Auth.».
  - SMTP no configurado → 500 con «Supabase no pudo mandar el correo. ¿Está SMTP configurado en Auth → SMTP Settings?».
  - Sin credenciales de Supabase (dev sin `.env.local`) → 501 con «Invitar por correo requiere Supabase configurado. Corré contra la base real.» (mismo comportamiento que hoy en `/api/equipo/invitar`).
- [ ] Contraprueba: en modo dev sin Supabase, la card muestra un aviso «Este
  flow requiere Supabase; corré contra la base real» y el botón queda
  disabled — o el hijo decide si mostrar la card igual y devolver el 501 con
  el mensaje amigable.
- [ ] El **instalador** (`scripts/instalar.mjs`) sigue funcionando idéntico:
  crea el admin (persona=null, rol='admin') sin pasar por `/api/equipo`. Ver
  §5.4.
- [ ] `npm run gate` verde. `npm run verificar` sin cambios (no hay números
  nuevos, no cambia el modelo).

---

## 4. Comportamiento esperado (happy path)

```
Admin entra a /equipo
  ↓
  Card lateral única: «Agregar al equipo»
    [ Nombre: Juan Pérez           ]
    [ Rol:    Closer            ▾ ]
    [ Correo: juan@ejemplo.com     ]
    [ Agregar e invitar ]
  ↓ click
  ↓ POST /api/equipo { nombre, rol, correo }
  ↓ backend: inviteUserByEmail + crearPersona + crearUsuario
  ↓
  Aviso verde: «Invitación enviada a juan@ejemplo.com.
                Cuando acepte, queda vinculado a Juan Pérez.»
  ↓
  Lista de personas se refresca; Juan aparece con:
    [ JP ] Juan Pérez · Closer · juan@ejemplo.com

Admin edita Juan (dar de baja): NO cambia. Sigue funcionando el PATCH actual.

Modo dev sin Supabase:
  Aviso en la card: «Requiere Supabase configurado.»
  Botón disabled.
```

---

## 5. Modelo de datos y endpoints

### 5.1 Endpoint `src/app/api/equipo/route.ts` — refactor

**Comportamiento nuevo del `POST`**:

- Recibe `{ nombre, rol, correo }` (correo ahora **requerido**).
- Valida con Zod nuevo:
  ```ts
  const zAlta = z.object({
    nombre: z.string().trim().min(2, 'El nombre necesita al menos 2 letras').max(80),
    rol: z.enum(['setter', 'closer', 'ambos']),
    correo: z.string().trim().email('El correo no parece válido').max(254),
  })
  ```
- Guardia: `soloAdmin()` (ya está).
- Si `!hayCredenciales()` → 501 con el mensaje amigable.
- Flow (idéntico al que hoy vive en `/api/equipo/invitar/route.ts`):
  1. `sb.auth.admin.inviteUserByEmail(correo)` → obtiene `authUserId`.
     Manejo de errores: 409 si ya existe, 500 si SMTP falla, 500 genérico si
     otro error.
  2. Buscar persona por nombre (case-insensitive). Si existe:
     - Si el rol coincide o la persona es «ambos» → reusar.
     - Si el rol NO coincide → 409 «Ya hay una persona X con rol Y…».
     Si no existe: `crearPersona(nombre, rol)`.
  3. `crearUsuario(authUserId, personaId, 'miembro')`.
  4. Devolver `{ persona, invitado: true, correo }`.

**PATCH** (baja/reactivación): sin cambios. Sigue con `{ id, activo }`.

### 5.2 Endpoint `src/app/api/equipo/invitar/route.ts` — eliminar

**Decisiones**:

- **Opción A · Borrar el archivo.** El front nuevo llama a `/api/equipo`
  siempre. Nadie más consume `/api/equipo/invitar` (grep confirma que solo
  `src/features/equipo/lista.tsx` lo llama).
- **Opción B · Dejarlo como redirect 308 a `/api/equipo`.** Por si un tab
  antiguo o un curl externo sigue apuntando ahí.

**Recomendación**: **Opción A**. El endpoint es interno del panel, no hay
consumidores externos. Menos superficie, menos rutas duplicadas.

El hijo decide y documenta.

### 5.3 Front — `src/features/equipo/lista.tsx`

Cambios:

- Borrar el bloque **«Invitar por correo»** (líneas 165-198 aprox).
- La card «Agregar a alguien» pasa a llamarse **«Agregar al equipo»** (o el
  copy que decida el hijo). Copy debajo: «se envía un correo con el link
  para elegir contraseña».
- Agregar el input `Correo` (tipo email, requerido) entre `Rol` y el botón.
- El botón «Agregar» pasa a **«Agregar e invitar»**.
- La función `agregar()` ahora manda `{ nombre, rol, correo }`. La función
  `invitar()` se elimina.
- El estado `correoInv` se elimina; se agrega `correo` en su lugar.
- El aviso de éxito (`invOk`) pasa a mostrarse dentro de la card unificada.
- El botón `disabled` cuando: `ocupado || nombre.trim().length < 2 || !correoValido(correo)`.
- Nuevo helper `correoValido(c: string): boolean` (regex simple `^[^\s@]+@[^\s@]+\.[^\s@]+$`).
- En la lista de personas (line 82+), agregar debajo del nombre (o al lado
  de los pills) un subtítulo o pill con el correo vinculado. Requiere que
  `datos().leerPersonas()` (o una nueva query) devuelva el correo — ver
  §5.5.

### 5.4 Instalador — `scripts/instalar.mjs`

**Sin cambios de comportamiento.** El admin único sigue creándose así:

1. `sb.auth.admin.createUser({ email, password, email_confirm: true })`.
2. `INSERT INTO usuarios(auth_user_id, persona_id, rol) VALUES ($1, NULL, 'admin')`.

**El PRP-A NO agrega una llamada a `/api/equipo` desde el instalador.** El
admin único vive fuera de Equipo, por diseño.

### 5.5 Mostrar el correo vinculado en la lista

Hoy `leerPersonas()` devuelve `Persona[]` sin correo. Para mostrarlo:

**Opción A · Nueva capa `leerPersonasConCorreo()`** que hace un LEFT JOIN
`personas ← usuarios ← auth.users` y devuelve `PersonaConCorreo[]`.

**Opción B · Endpoint aparte `GET /api/equipo/correos`** que devuelve un
mapa `{ personaId: correo }` y el front lo merge.

**Opción C · Ampliar `leerPersonas()`** para incluir `correo?: string | null`.

**Recomendación**: **Opción C**. Es una columna más en el retorno, sin
romper consumidores existentes (agregando propiedad opcional). El JOIN vive
en `capa.leerPersonas()` y la capa demo simplemente devuelve `correo: null`.

**Impacto**:

- `src/shared/tipos/index.ts`: `Persona` gana `correo?: string | null`.
- `src/shared/datos/interfaz.ts`: sin cambios de firma (solo el tipo).
- `src/shared/datos/supabase/capa.ts`: `leerPersonas()` hace JOIN con
  `usuarios` y `auth.users` (o con la vista que exponga el correo).
- `src/shared/datos/demo.ts`: `leerPersonas()` mapea `correo: null` (o toma
  el `correo` de `EstadoDemo.usuarios` si el hijo lo agrega).

**El hijo decide si vale la pena la Opción C ahora o difiere a un PRP futuro**.
Si difiere: la card unificada funciona, pero la lista no muestra el correo
por persona (solo el aviso de éxito lo menciona). Es aceptable como MVP.

---

## 6. Fases internas (para el Bucle Agéntico)

| # | Fase | Qué entrega |
|---|---|---|
| A.1 | **Backend** | `src/app/api/equipo/route.ts` acepta `correo` en el POST y hace el flow completo (invita + crea persona + crea usuario). Copia la lógica desde `/api/equipo/invitar/route.ts`. |
| A.2 | **Cleanup backend** | `src/app/api/equipo/invitar/route.ts` eliminado (o convertido a redirect, según §5.2). |
| A.3 | **Front** | `src/features/equipo/lista.tsx` con card unificada, sin la card duplicada. |
| A.4 | **(opcional) Correo en lista** | Si el hijo elige Opción C de §5.5: `Persona.correo`, capa Supabase con JOIN, subtítulo en la lista. |
| A.5 | **Mockup + porteo** | `MOCKUP-APROBADO.html`: pantalla `?s=equipo` refleja el nuevo layout. Correr `gemelas.py` + `portar-css.py`. |
| A.6 | **Gate + foto** | 4 modos: card unificada con y sin correo cargado, aviso de éxito, aviso de error (correo ya invitado). |

---

## 7. Referencias explícitas al repo (paths absolutos)

- **Front (a refactorizar)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/features/equipo/lista.tsx` — líneas 47-63 (funciones agregar/invitar), 126-198 (dos cards laterales).
- **Endpoint (a extender)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/equipo/route.ts` — 49 líneas hoy.
- **Endpoint (a eliminar)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/app/api/equipo/invitar/route.ts` — 96 líneas hoy. Copia la lógica al de arriba antes de borrar.
- **Guardias**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/guardias.ts` — `soloAdmin()`.
- **Sesión**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/sesion.ts` — `hayCredenciales()`.
- **Cliente Supabase**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/supabase/cliente.ts`.
- **Tipos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/tipos/index.ts` — `Persona` (línea 5) si se opta por Opción C de §5.5.
- **Capa datos**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/src/shared/datos/interfaz.ts`, `.../supabase/capa.ts`, `.../demo.ts`.
- **Instalador (NO cambia)**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/scripts/instalar.mjs`.
- **Mockup**: `/Users/jack/orca/workspaces/LP PANEL DE VENTAS/LP-THE-CEO/MOCKUP-APROBADO.html` — pantalla `?s=equipo`.

---

## 8. Números / criterios de "listo"

**No hay números de oro nuevos.** `verificar.mjs` sigue con 24 + 4 + filas.

Chequeos manuales:

- [ ] Con Supabase configurado, invitar un correo real → llega el mail (probar en Supabase Auth logs), aceptarlo, elegir contraseña, loguearse → aparece como miembro filtrado.
- [ ] Sin correo (input vacío) → botón disabled. Con correo inválido → validación Zod devuelve 400.
- [ ] Con correo ya invitado → 409 con mensaje amigable.
- [ ] Sin SMTP → 500 con mensaje que menciona SMTP Settings.
- [ ] En dev sin `.env.local` → 501 con mensaje amigable.
- [ ] En Supabase Auth Dashboard, el usuario aparece con status «Invited», con `email_confirmed_at = null` hasta que acepta.

---

## 9. Contraprueba

- Cortar el `crearUsuario()` (comentar la llamada) → el correo se envía pero
  la fila `usuarios` no se crea → el invitado logueado va a `/pendiente`.
  Reactivar → la fila se crea y logueado va a `/panel`.
- Mandar un correo con formato inválido desde curl (sorteando la validación
  del front) → Zod devuelve 400.

---

## 10. Recordatorio del gate

```bash
npm run typecheck && npm run lint && npm test && npm run sin-cliente && npm run build
npm run verificar
```

**Foto** — la card unificada en 4 modos + estados:

- Escritorio 1440 + celular 390, claro y oscuro (8 fotos base).
- Con la card vacía, con la card llena, con el aviso de éxito, con el aviso
  de error (correo ya invitado) → 4 estados × 4 modos = 16 fotos, agrupables
  a discreción del hijo.

---

## 11. Anti-patrones

- ❌ Dejar el endpoint `/api/equipo/invitar` como stub vacío — si nadie lo
  llama, se borra.
- ❌ Mantener las dos cards con un toggle «también invitar» — es lo mismo que
  hoy con otra UI.
- ❌ Hacer el correo opcional en el POST — el objetivo es exactamente
  obligarlo.
- ❌ Crear el admin único desde `/api/equipo` — el admin vive en el
  instalador, punto.
- ❌ Confiar en el `personaId` del body al crear el usuario — la persona se
  resuelve en el backend por nombre + rol.
- ❌ Bloquear el flow si el correo tiene mayúsculas o espacios al principio
  — el Zod `.trim().email()` lo normaliza. No pidas al admin que lo escriba
  «perfecto».

---

## 12. Bitácora

| Fecha | Nota |
|---|---|
| 2026-09-11 | PRP generado. Estado: PENDIENTE de aprobación de Jack. |
| 2026-09-11 | **Ejecutado.** `POST /api/equipo` refactor completo: acepta `{nombre, rol, correo}`, hace `inviteUserByEmail` + reusar/crear persona + `crearUsuario(miembro)`. Endpoint `/api/equipo/invitar` **eliminado** (Opción A del §5.2). `lista.tsx` con card única «Agregar al equipo» (Nombre + Rol + Correo + botón «Agregar e invitar»), sin la segunda card. Mockup actualizado. Se **difirió** mostrar correo por persona en la lista (Opción C de §5.5 queda para otro PRP) — el aviso post-alta ya lo menciona. **Aprendizaje**: al borrar una API route hay que limpiar `.next/` (Next 16 mantiene tipos generados en `.next/types/validator.ts` apuntando al archivo viejo → typecheck falla con TS2307). Gate local: typecheck, 37/37 tests, lint, sin-cliente (64), build (11/11) — verde tras `rm -rf .next`. |
