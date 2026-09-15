# Guía de instalación — versión larga con contexto

> **Si sos alumno**: NO leas este archivo primero. Mirá el video de Loom (link en el README) y seguí `docs/setup-checklist.md`. Esa es la ruta rápida, 20 minutos.
>
> **Este archivo** existe para: (1) entender **por qué** cada paso, (2) el gotcha de Supabase durmiéndose, (3) troubleshoot cuando algo raro pasa.

## Panorama

Vas a necesitar dos cuentas gratuitas: **Supabase** (donde viven tus datos + los logins) y **Vercel** (donde vive la app deployada). Además una cuenta de **GitHub** (gratis) para poder autorizar a Vercel a leer el repo público del código.

**No vas a crear tu propia copia del código**. Vas a decirle a Vercel «leé del repo público de Leandro» y Vercel se encarga. Cuando Leandro publique una mejora al código, tu Vercel la detecta y la despliega automáticamente. Vos no hacés nada.

> 💡 **Usá el mismo correo para las tres cuentas.** El día que necesites ayuda, tener todo bajo un correo evita media hora de «¿con cuál me registré?».

## Los pasos, con el porqué

### Paso 1 — Base de datos + Auth (Supabase)

Creá un proyecto en Supabase. Elegí la región **más cercana a vos** (Argentina/Chile/Uruguay → São Paulo; México → US East N. Virginia; España → Ireland). La contraseña de la base, guardala en un gestor.

En **Project Settings → API** copiá tres cosas:

| Qué | Dónde dice |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (tapada: apretá *Reveal*) |

> 🔴 **La `service_role` es lo que más problemas da, y no lo parece.**
> Está tapada con puntitos. Si la seleccionás con el mouse, te llevás los puntitos y no la clave. La app queda rota de una forma que no se entiende: el login dice «error de servidor» aunque la contraseña esté bien. **Usá siempre el botón de copiar** (apretá *Reveal* primero, después el rectangulito).

**Crear tu usuario admin**: **Authentication → Users → «Add user» → «Create new user»**. Correo + contraseña de mínimo 12 caracteres. **«Auto Confirm User» prendido** — importante, si no queda pendiente de confirmar el mail y el login no anda.

**Correr el SQL «Todo en Uno»**: **SQL Editor → New query**, pegás el contenido de `docs/todo-en-uno.sql` (desde el repo público de Leandro), buscás `TU_CORREO_AQUI` y lo reemplazás por tu correo (el que usaste arriba), **Run**.

El SQL hace todo esto de una:
- Las 4 tablas base (configuracion, personas, reportes_setter, reportes_closer).
- Las 3 tablas nuevas (gastos, usuarios para multiusuario, llamadas para Post Llamada).
- La columna `logo_url` en configuracion.
- La columna `lead_nombre` en llamadas.
- Todos los permisos: solo `service_role` puede tocar (RLS prendido para el cinturón).
- El bucket `logos` público en Storage (para subir el logo desde Ajustes).
- Una fila mínima en `configuracion` para que la app arranque.
- Te marca como `admin` en `usuarios`.

La última consulta te devuelve una tabla con 9 números. Todos tienen que dar **1** (o más). Si alguno da 0, algo no se aplicó — mirá el mensaje de error rojo arriba.

---

### Paso 2 — Deploy en Vercel apuntando al repo de Leandro

En Vercel: **Add New → Project → Import Git Repository**. En el buscador, pegás `LPTheCEOTech/panel-de-ventas` (el repo público de Leandro).

Si es la primera vez que usás Vercel, te pide autorizar acceso al repo. Como es público, GitHub te deja hacerlo sin necesidad de permisos del dueño. Apretás **«Adjust GitHub App Permissions»**, agregás el repo `LPTheCEOTech/panel-de-ventas`, y volvés.

Antes de apretar Deploy, cargás las **3 environment variables** que copiaste en el Paso 1:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Deploy**. Tarda 2-3 minutos. Al terminar, tenés tu URL: algo tipo `mi-panel.vercel.app`.

**¿Por qué importar directo y no forkear?** Porque cuando Leandro suba una mejora al repo, tu Vercel la detecta como un push nuevo a `main` y hace deploy automático. Si en cambio hubieras hecho fork, tu fork queda «atrás» y tenés que sincronizarlo a mano. Este esquema es **cero mantenimiento** para vos.

**Trade-off**: no podés modificar el código para tu caso particular. Si querés algo custom, mirá `docs/actualizar.md` para las alternativas.

> 🔴 **El primer deploy sale verde y no prueba nada.**
> Ése lo dispara Vercel al importar el proyecto. **El que importa es el segundo** — el que sale cuando Leandro pushee algo al repo o cuando cambies una env var. Si notás que el primer deploy salió pero después nada pasa aunque haya updates en el repo original: chequeá **Settings → Git** que la conexión con `LPTheCEOTech/panel-de-ventas` esté activa. Ahí también podés ver los últimos commits que Vercel detectó.

---

### Paso 3 — Primer login y configurar tu panel

Abrí la URL → login con el correo + contraseña del Paso 1 → entrás al panel (todo en cero).

**Ajustes**:
- Nombre del panel, iniciales, tu nombre.
- **Color de tu marca**: click en el cuadradito → picker visual (gradient sat/brillo + hue). Enter para cerrar.
- **Logo** (opcional): PNG/SVG chica (< 256 KB).
- **Moneda, zona horaria, inicio de semana** (Lunes o Domingo).
- **Guardar ajustes**.

**Equipo**: card «Agregar al equipo» → Nombre + Rol + Correo → «Agregar e invitar». A cada uno le llega un mail de Supabase con un link para elegir contraseña. Cuando lo aceptan, entran a **su panel filtrado** (solo lo suyo).

---

## Cosas para saber a largo plazo

### Supabase se duerme si nadie usa el proyecto

**El plan gratuito PAUSA tu proyecto tras 7 días sin consultas a la base.** Y no avisa.

**Síntoma**: entrás al panel y dice **«error de servidor»**. Parece que se rompió la app. No se rompió: la base está dormida.

**Cómo despertarla**: entrá a supabase.com → tu proyecto → botón **Restore** / **Resume**. Tarda 2 min y vuelve todo, sin perder nada.

**Cómo evitarlo**: que alguien del equipo cargue un reporte al menos una vez por semana. Es lo mismo que ya tiene que pasar para que el panel sirva.

**Cómo confirmar que es eso y no otra cosa** (si tenés terminal):
```bash
dig +short TU-REF.supabase.co @1.1.1.1
```
Si no devuelve nada, está pausado. Si devuelve una IP, está despierto y el problema es otro.

### Los favicons se cachean fuerte

El favicon dinámico (`/api/favicon`) tiene cache de 60 segundos. Si cambiás las iniciales en Ajustes y no ves el cambio en la pestaña, refrescá con `Cmd+Shift+R` / `Ctrl+Shift+R` para saltar el cache.

### El bucket del logo

Si por algún motivo desaparece el bucket `logos` de Supabase Storage (raro, pero pasó), subir un logo desde Ajustes tira «El bucket "logos" no existe». Solución: **Supabase → Storage → New bucket → nombre `logos`, Public ON, Create**.

Mientras tanto, el topbar y el favicon caen al fallback con las iniciales sobre el color de marca. Nada se rompe.

### Los updates son automáticos, pero las migraciones no

Cuando Leandro sube una **mejora de código** al repo, tu Vercel lo detecta y deploya solo. Vos no hacés nada.

Cuando la mejora trae **una migración de base de datos nueva** (una tabla o columna que no existía), Leandro te avisa y **vos corrés ese archivo SQL** en tu Supabase → SQL Editor. Es exactamente igual a lo que hiciste en el Paso 1.4, pero un archivo chico. Detalles en `docs/actualizar.md`.

---

## Cuando algo no anda

| Lo que ves | Casi siempre es |
|---|---|
| «error de servidor» al entrar | Supabase pausado (paso «se duerme»), o una clave copiada con los puntitos (Paso 1). |
| «Correo o contraseña incorrectos» | Eso mismo. Podés resetearlo desde Supabase → Authentication → Users → tres puntitos → «Send password recovery». |
| Después del login te tira a **/pendiente** | El SQL «Todo en Uno» no te marcó como admin (escribiste mal el correo en la línea `WHERE email`). Corregí y correlo de nuevo. |
| Vercel no importa el repo de Leandro | Apretá «Adjust GitHub App Permissions» → agregá acceso a `LPTheCEOTech/panel-de-ventas`. GitHub te deja porque el repo es público. |
| El panel está todo en `—` | No hay reportes cargados. No es un error. |
| Un formulario dice que no hay nadie | Falta cargar el equipo (menú Equipo). |
| Un vendedor invitado no puede entrar | El link del correo puede haber expirado (24 hs). Andá a Supabase → Authentication → Users → tres puntitos al lado del correo → «Send magic link». |
| Cambié las iniciales en Ajustes y la pestaña sigue igual | Cache del favicon (60 s). Refrescá con Cmd+Shift+R. |
| Leandro publicó un update y mi app no cambia | Andá a tu proyecto en Vercel → Deployments → mirá si aparece el deploy nuevo con estado «Ready». Si no aparece, Settings → Git → verificá que el repo conectado sea `LPTheCEOTech/panel-de-ventas`. Si la conexión se rompió, «Reconnect». |
