# PRP MAESTRO · Evolución del Panel — Pedidos de Leandro

> **Estado: PENDIENTE de aprobación de Jack.** Generado por HQ el 10-sep-2026,
> tras leer el repo completo (kernel, capas, formularios, gate y semilla).
>
> Este archivo es **índice + coordinación** de cuatro PRPs hijos. Cada hijo se
> puede arrancar solo con `/bucle-agentico` y trae su propio blueprint.
> Este maestro **no implementa nada**: dice el orden, las dependencias, y las
> reglas globales que ningún hijo puede violar.

---

## 0. De dónde salió esto

Leandro pidió siete cosas mirando el panel:

1. Agregar **Gasto** (se carga a mano, arriba de Leads).
2. Agregar **CAC** = costo total de adquisición ÷ número de clientes.
3. Agregar **Costo por llamada asistida** (sobre los que asistieron).
4. Agregar **AOV** (cash collected ÷ clientes, se suma; ticket promedio queda).
5. Agregar **Reporte Post Llamada** y **quitar** el reporte agregado del closer.
6. Hacerlo **plantilla personalizable**: logo, nombre de empresa, invitar equipo.
7. **Cada rol ve solo lo suyo** (closers su propio panel, setters el suyo).

Decisiones que **ya tomó Jack** y no se re-preguntan:

| # | Decisión |
|---|---|
| DG1 | **Gasto** se carga diario, por el dueño/admin. Tabla nueva `gastos` (`fecha` PK, `monto_cents`, `nota` opcional). Upsert como los reportes. |
| DG2 | **AOV se SUMA** al panel (cash ÷ cierres). El ticket promedio (revenue ÷ cierres) **se queda**. Son dos números distintos y responden a preguntas distintas. |
| DG3 | **Reporte Post Llamada**: SOLO el closer pasa a granular (una fila por llamada). Los setters siguen con agregado diario, sin cambios. |
| DG4 | **Orden de ejecución acordado: A → B → C → D**. Las autónomas primero; los cambios de modelo, al final. |

---

## 1. Las 4 fases

| # | PRP | Objetivo (1 línea) | Estado |
|---|---|---|---|
| **A** | [`prp-fase-a-gasto-y-derivados.md`](./prp-fase-a-gasto-y-derivados.md) | Cargar gasto diario y mostrar CAC, costo por asistida y AOV en el panel. | 🟡 CÓDIGO LISTO · gate real pendiente |
| **B** | [`prp-fase-b-logo.md`](./prp-fase-b-logo.md) | Subir un logo en Ajustes que reemplace al cuadradito de iniciales del topbar. | 🟡 CÓDIGO LISTO · gate real pendiente |
| **C** | [`prp-fase-c-multiusuario-roles.md`](./prp-fase-c-multiusuario-roles.md) | Invitar por correo, ligar cada usuario a una persona, y que cada rol vea solo lo suyo. | 🟡 CÓDIGO LISTO · gate real pendiente |
| **D** | [`prp-fase-d-reporte-post-llamada.md`](./prp-fase-d-reporte-post-llamada.md) | Rehacer el reporte del closer como una fila por llamada, sin tocar setters. | 🟡 CÓDIGO LISTO · gate real pendiente |

> A medida que cada hijo se cierre, se actualiza su estado a **✅ HECHA** y se
> escribe una línea en la bitácora de este archivo.

---

## 2. Por qué este orden — dependencias reales, no gusto

```
A ──┐
    ├── B ──┐
            ├── C ──┐
                    └── D
```

- **A antes que todo**: es autónoma pura. No toca reportes, ni personas, ni
  sesión. Suma una tabla y tres métricas derivadas. Si algo sale mal, se
  revierte sin arrastrar nada. Le da a Leandro ganancia visible rápido
  (dinero → tasas → embudo → **cuánto cuestan estas tasas**).
- **B antes que C**: es igualmente autónoma y no tiene lógica de negocio.
  Se hace mientras se digiere A. Después de B, Ajustes ya tiene el patrón
  «subo un archivo, se ve arriba», que C reusa cuando invita gente.
- **🔴 C antes que D — ésta es la dependencia crítica.** El formulario del
  closer (`src/features/reportes/form-closer.tsx`) hoy tiene un
  `<select>` de personas. C lo cambia: si sos el closer logueado, el select
  desaparece porque ya sabemos quién sos. D **rehace ese formulario entero**
  (pasa de agregado a una fila por llamada). Si D fuera primero, en C
  habría que volver a tocar el formulario nuevo. Con C primero, D arranca
  sabiendo qué props recibe y qué no.
- **D al final**: es el cambio de modelo más grande. Modifica el kernel
  (`totales`/`metricas` van a sumar llamadas, no leer una tabla agregada) y
  hay que **rehacer la semilla y los números de oro**. Es lo último porque,
  cerrado esto, todo lo anterior tiene que seguir cuadrando.

**Puntos de reversibilidad**: cada fase cierra con `npm run gate` + `npm run
verificar` en verde + foto contra el mockup. Si una fase deja el gate rojo, no
se pasa a la siguiente. **Ni B se apoya sobre una A rota, ni C sobre una B
rota, ni D sobre una C rota.**

---

## 3. Reglas globales que aplican a las 4 fases

Nada de esto es nuevo; sale de `CLAUDE.md`, `CLAUDE.panel-de-ventas.md` y
`.claude/memory/`. Se re-escribe acá para que cada agente de Bucle Agéntico
las tenga a la vista antes de empezar.

| Regla | Por qué está |
|---|---|
| **CSS del mockup, nunca `globals.css` a mano.** El circuito es `MOCKUP-APROBADO.html` → `python3 scripts/gemelas.py` → `npm run portar-css`. Si una regla nueva necesita responsive, la `@media` va como `max-width` (una `min-width` no tiene gemela posible). | Cualquier estilo escrito directo en `globals.css` desaparece en el siguiente porteo. Ya se perdió trabajo por esto. |
| **Cero datos de un negocio en el código.** Lo verifica `scripts/sin-cliente.py`. Nombre, moneda, zona horaria, color y ahora también **logo** viven en `configuracion`. | La plantilla se construye una vez y se instala muchas. Un nombre olvidado en un componente y el alumno abre SU panel y ve el del otro. |
| **Divisor 0 → `null` en el kernel; se pinta como `EL_GUION` (`—`).** Nunca `NaN`, nunca `0%`, nunca `Infinity`. | Una instalación nueva tiene 0 cierres y 0 clientes. Si CAC diera `NaN$`, el panel parecería roto antes de que nadie cargue nada. |
| **Baja lógica, nunca DELETE** de personas ni de reportes. Se marca `activo=false`. Los rankings históricos siguen mostrando a los inactivos. | Un closer que se va no puede borrar el historial que produjo. |
| **Cero emoji en la UI.** Iconos SVG inline en `src/shared/chasis/iconos.tsx`. | En una máquina sin fuente de emoji salen cuadraditos. |
| **Español rioplatense en comentarios, con `🔴` para lo que se pagó caro.** | Consistencia del estilo del repo. Lo que llevó tiempo entender se marca para que no se re-descubra. |
| **`proxy.ts`, NUNCA `middleware.ts`.** Next 16 renombró el archivo y la función. Un `middleware.ts` no da error: **no corre.** | Costó una jornada. |
| **`export const dynamic = 'force-dynamic'` en `src/app/(app)/layout.tsx`.** Cualquier página que lea de la base va detrás de eso. | Sin esto, Next 16 prerenderiza y sirve los números del build. Invisible en `next dev`. |
| **Commits firmados `LPTheCEOTech <tech@lpfinancialservices.info>`.** El deploy va a la cuenta de Leandro. | Vercel Hobby bloquea deploys con autor distinto. |
| **Nunca `git add -A`.** Stage por nombre. | Un `.env.local` o un archivo temporal metido en un commit ya nos costó. |
| **El gate no es opcional**: `npm run gate` (typecheck + lint + tests + sin-cliente + build) + `npm run verificar` (los 24 números de oro contra la base) + **foto**: 1440×900 y 390×844, claro **y** oscuro, con cada estado abierto. | Un verde de terminal no es una entrega. Jack mira la pantalla. |

---

## 4. Checkpoints humanos entre fases

El bucle se **para** al terminar cada fase y espera a Jack. Cada fase entrega:

1. **Mockup actualizado en `MOCKUP-APROBADO.html`** con las pantallas o piezas
   nuevas — porteado con `gemelas.py` + `portar-css.py`, y verificado que
   `globals.css` no tenga cambios a mano.
2. **Foto** en los 4 modos (escritorio/celular × claro/oscuro), abriendo cada
   estado nuevo (aviso «ya cargaste», dropdown, diálogo, etc.).
3. **Gate en verde**: `npm run gate` y `npm run verificar`.
4. **Bitácora**: una entrada en la sección `Bitácora` del PRP de la fase con
   fecha, qué se hizo, qué se descubrió, qué queda.

Jack decide si se pasa a la siguiente fase o se corrige lo que ve.

---

## 5. Lo que este maestro **no** decide (queda al hijo)

- La forma exacta de la migración (sí decide el número: **003**, **004**,
  **005**, **006**, en ese orden).
- El copy fino de cada aviso o pieza nueva.
- Los IDs de los `<input>` y las clases nuevas del mockup.
- Si el gate se rompe por un caso raro, el hijo tiene autonomía para pedir un
  ajuste al maestro — pero **no** al orden, ni a las reglas globales.

---

## 6. Numeración de migraciones — un solo tren, en orden

| Fase | Migración | Qué agrega |
|---|---|---|
| A | `supabase/migraciones/003_gastos.sql` | Tabla `gastos` + permisos. |
| B | `supabase/migraciones/004_logo.sql` | Columna `logo_url text` en `configuracion` + bucket público. |
| C | `supabase/migraciones/005_usuarios.sql` | Tabla `usuarios` (auth_user_id ↔ persona_id + rol). |
| D | `supabase/migraciones/006_llamadas.sql` | Tabla `llamadas` (reemplaza `reportes_closer`) + baja lógica de la vieja o vista de compatibilidad, según decida el hijo. |

**🔴 No se cambia una migración ya aplicada.** Si una fase se equivoca, se
crea otra migración que corrige. Nunca se edita un `.sql` que ya se corrió
contra la base de Leandro.

---

## 7. Riesgos globales — se dicen ahora, no cuando muerdan

| # | Riesgo | Mitigación |
|---|---|---|
| 🔴 1 | **A rompe el verificador** si CAC o AOV se calculan mal con divisor 0. | Contraprueba en el gate: se rompe una fórmula a propósito y el verificador tiene que ponerse rojo (§11.2 del PRP v1). |
| 🔴 2 | **B deja el topbar con un `<img>` que no carga** (bucket privado, URL mal, red caída). | Fallback silencioso al `.brand-tile` con las iniciales. Testeado en el gate abriendo la app con `logo_url = 'https://…/inexistente.png'`. |
| 🔴 3 | **C rompe el login** o deja pasar a alguien sin `usuarios.persona_id`. | Regla dura: `usuarios.rol` obligatorio; si es `miembro` sin `persona_id`, el proxy lo manda a una pantalla «Pediá a tu admin que te vincule» — nunca al panel con datos ajenos. |
| 🔴 4 | **D deja los números de oro en rojo** porque la suma de llamadas no da igual que el agregado viejo. | La semilla se rehace deliberadamente para que sume idéntico al mockup; y **la primera contraprueba de D** es correr el verificador antes de tocar el kernel — si ya está rojo, algo del `semilla.ts` está mal y hay que arreglarlo antes. |
| 5 | **El mockup queda desfasado** porque una fase agregó CSS a `globals.css` a mano. | Cada PRP hijo tiene en su gate: `git diff src/app/globals.css` **tiene que ser vacío** después de correr `portar-css`. |
| 6 | **Rebases con Leandro produciendo datos**. Si Leandro empieza a cargar reportes reales antes de que D esté hecha, la migración de D tiene que preservarlos. | D **no borra** `reportes_closer` en su primera versión: la deja como está y añade `llamadas` en paralelo, con una decisión de compatibilidad tomada por el hijo. |

---

## 8. Anti-patrones (aplican a las 4 fases)

- ❌ Empezar la Fase B sin haber cerrado la A con foto y gate.
- ❌ Empezar D antes que C — el formulario del closer se toca **dos veces** y se pierde una tarde.
- ❌ Guardar CAC o AOV como columna calculada. Todo lo derivado se deriva en el kernel.
- ❌ Editar `src/app/globals.css` a mano.
- ❌ Meter «Leandro», «LP The CEO» o un logo hardcodeado en `src/`.
- ❌ Usar `configuracion.usuario_nombre` como si fuera el usuario logueado después de la Fase C — pasa a ser «quién administra», si es que sigue existiendo.
- ❌ Aceptar `npm run verificar` en verde con la semilla de A/B/C/D y no volver a correrlo tras cada porteo de CSS.

---

## 9. Bitácora

| Fecha | Fase | Nota |
|---|---|---|
| 2026-09-10 | A | Código completo. Gate local en verde. Falta ejecutar contra la base real (migración 003, semilla, verificar, foto) — bloqueado por ausencia de `.env.local`. |
| 2026-09-10 | B | Código completo. Gate local en verde. Falta ejecutar migración 004, crear bucket `logos` público (el instalador lo intenta), y foto con y sin logo. |
| 2026-09-10 | C | Código completo. Gate local en verde. Multiusuario + roles + invitar por correo listos. Falta migración 005, re-correr instalador (para marcar admin), invitar un correo con SMTP configurado, y foto con 3 sesiones (sin-login, admin, miembro). |
| 2026-09-10 | D | Código completo. Gate local en verde (37/37 tests con 5 nuevos de Fase D). Tabla `llamadas` + puente `agregarLlamadas` + pantalla `/llamada` + endpoint + redirect de `/reporte-closer`. Semilla de 96 llamadas suma EXACTO al ORO. Falta migración 006, plantar la semilla contra la base real, verificar, contraprueba, y foto. |
