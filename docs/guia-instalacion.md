# Guía de instalación — versión larga con contexto

> **Si sos alumno**: NO leas este archivo primero. Mirá el video de Loom (link en el README) y seguí `docs/setup-checklist.md`. Esa es la ruta rápida, 25 minutos.
>
> **Este archivo** existe para: (1) entender **por qué** cada paso, (2) el gotcha de Supabase durmiéndose, (3) troubleshoot cuando algo raro pasa.

## Panorama

Vas a necesitar tres cuentas gratuitas: **GitHub** (donde vive el código), **Supabase** (donde viven tus datos + los logins) y **Vercel** (donde vive la app deployada). Las tres tienen plan gratis que alcanza de sobra para un negocio con un equipo chico.

> 💡 **Usá el mismo correo para las tres.** El día que necesites ayuda, tener todo bajo un correo evita media hora de «¿con cuál me registré?».

## Los pasos, con el porqué

### Paso 1 — Tu copia del código (GitHub)

Andá al repo de la plantilla (`LPTheCEOTech/panel-de-ventas`) y apretá **«Use this template» → «Create a new repository»**. Nombre libre, dejalo **Private**, y creá.

Es una copia. Nadie más la ve. Lo que cambies no afecta la plantilla. Y cuando Leandro publique mejoras, las traés vos (mirá `docs/actualizar.md`).

**Por qué template y no fork**: un fork queda «encadenado» al original y es más incómodo para hacer commits privados. «Use this template» copia una foto del código y listo, es tuyo.

---

### Paso 2 — Base de datos + Auth (Supabase)

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

**Correr el SQL «Todo en Uno»**: **SQL Editor → New query**, pegás el contenido de `docs/todo-en-uno.sql`, buscás `TU_CORREO_AQUI` y lo reemplazás por tu correo (el que usaste arriba), **Run**.

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

### Paso 3 — La app en internet (Vercel)

En Vercel: **Add New → Project → Import** el repo del Paso 1.

Antes de apretar Deploy, cargá las **3 environment variables** que copiaste en el Paso 2:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Deploy**. Tarda 2-3 minutos. Al terminar, tenés tu URL: algo tipo `panel-de-ventas-xxx.vercel.app`.

> 🔴 **El primer deploy sale verde y no prueba nada.**
> Ése lo dispara Vercel al importar el proyecto. **El que importa es el segundo** — el que sale cuando cambiás algo. Si el segundo falla y el primero no, casi siempre es porque los commits están firmados con un correo que no es el dueño de la cuenta de Vercel. Se arregla en Git (config del autor), no en Vercel.

---

### Paso 4 — Primer login y configurar tu panel

Abrí la URL → login con el correo + contraseña del Paso 2. Entrás al panel (todo en cero).

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

---

## Cuando algo no anda

| Lo que ves | Casi siempre es |
|---|---|
| «error de servidor» al entrar | Supabase pausado (paso «se duerme»), o una clave copiada con los puntitos (Paso 2). |
| «Correo o contraseña incorrectos» | Eso mismo. Podés resetearlo desde Supabase → Authentication → Users → tres puntitos → «Send password recovery». |
| Después del login te tira a **/pendiente** | El SQL «Todo en Uno» no te marcó como admin (escribiste mal el correo en la línea `WHERE email`). Corregí y correlo de nuevo. |
| Deploy nuevo de Vercel falla y el primero había salido bien | El correo del autor de los commits. Se arregla con `git config user.email` (que coincida con el correo de la cuenta de Vercel). |
| El panel está todo en `—` | No hay reportes cargados. No es un error. |
| Un formulario dice que no hay nadie | Falta cargar el equipo (menú Equipo). |
| Un vendedor invitado no puede entrar | El link del correo puede haber expirado (24 hs). Andá a Supabase → Authentication → Users → tres puntitos al lado del correo → «Send magic link». |
| Cambié las iniciales en Ajustes y la pestaña sigue igual | Cache del favicon (60 s). Refrescá con Cmd+Shift+R. |
