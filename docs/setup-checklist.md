# Checklist de despliegue

> Este documento es la guía que sigue **el video** (link a Loom cuando esté grabado).
> El alumno mira el video, hace clic donde se le dice, y termina con la app funcionando. Total: ~20 minutos.
>
> Si te pierdes a la mitad, este archivo es exactamente lo mismo que dice el video, escrito.

**El objetivo**: tu propia URL tipo `mi-panel.vercel.app` con login funcionando, base de datos vacía lista para cargar a tu equipo.

**Lo que necesitas antes de empezar**:

- Un correo electrónico (usa el mismo para las tres cuentas)
- 20 minutos sin interrupciones
- Un navegador (Chrome, Safari, Edge, cualquiera)
- Un gestor de contraseñas (o un papel) para anotar 3 cosas puntuales

**Lo que NO necesitas**:

- Terminal, consola, línea de comandos
- Instalar Node.js, git, ni nada
- Saber programar
- **Tu propia copia del código**. Vas a desplegar directo del repo original — así cuando salga una mejora, tu app se actualiza sola.

---

## Etapa 0 · Preparar las cuentas (5 min)

Vas a necesitar tres cuentas gratuitas. Si ya tienes alguna, sáltala.

- [ ] **GitHub** → [https://github.com/signup](https://github.com/signup) — usa tu correo, elige una contraseña.
- [ ] **Supabase** → [https://supabase.com](https://supabase.com) → «Start your project» → «Continue with GitHub» → autorizas.
- [ ] **Vercel** → [https://vercel.com/signup](https://vercel.com/signup) → «Continue with GitHub» → autorizas.

> 💡 **Continúa con GitHub en las tres cuentas.** Así no tienes que recordar tres contraseñas y todo queda vinculado por si algún día pides ayuda.

Anota en algún lado:

- Tu correo
- Tu contraseña de GitHub

Nada más. Las otras dos (Supabase y Vercel) usan el mismo correo de GitHub.

---

## Etapa 1 · Base de datos en Supabase (10 min)

### 1.1 · Nuevo proyecto

- [ ] En [https://supabase.com/dashboard](https://supabase.com/dashboard), botón verde arriba a la derecha: **«New project»**.
- [ ] Completa:
  - **Name**: `panel-de-ventas` (o cualquier nombre)
  - **Database Password**: haz clic en **«Generate a password»** → **cópiala** al gestor de contraseñas.
  - **Region**: la más cercana a ti (Argentina/Chile/Uruguay → `São Paulo`; México → `East US North Virginia`; España → `EU West Ireland`).
  - **Pricing Plan**: Free (viene marcado).
- [ ] **Create new project**.
- [ ] Espera 2 minutos hasta que el punto verde aparezca al lado del nombre.

### 1.2 · Copiar las 3 claves

Cuando termine de crearse:

- [ ] Menú izquierdo (engranaje abajo): **Project Settings** → **API**.
- [ ] Vas a ver tres cosas para copiar. **Cópialas al gestor de contraseñas**, ahora no las uses:


| En la pantalla dice                    | Anótalo como  | Se ve así (formato)                                         |
| -------------------------------------- | ------------- | ----------------------------------------------------------- |
| **Project URL**                        | `URL`         | `https://xxxxx.supabase.co` (nada más, sin barra al final) |
| **anon / public**                      | `ANON_KEY`    | JWT largo, empieza con `eyJhbGciOi…`                       |
| **service_role** (tapada con puntitos) | `SERVICE_KEY` | JWT largo, arranca igual que el anon pero **es distinto**  |


> 🔴 **Regla de oro para copiar las 3.** Usa el **rectangulito de copiar** que está al lado de cada campo. **NO selecciones con el mouse.** Si arrastras el cursor sobre la clave, te llevas los puntitos censurados en el medio y no la clave real — la app queda rota y no da un error claro. Este es el bug #1 que traba a los alumnos.
>
> 🔴 **Cuidado especial con la `service_role`.** Además de lo anterior, esa clave viene tapada con puntitos por seguridad. **Haz clic primero en el botón «Reveal»** para destaparla y **después** en el rectangulito de copiar.
>
> ✅ **Chequeo rápido**: pega las 3 en un bloc de notas para verlas. `URL` debe empezar con `https://` y terminar en `.supabase.co`. `ANON_KEY` y `SERVICE_KEY` son ambos JWTs (arrancan con `eyJ`, tienen 2 puntos que separan 3 bloques de texto). **`ANON_KEY` y `SERVICE_KEY` NO son iguales** — compáralos hasta el final. Si son idénticas, copiaste dos veces la misma; vuelve al dashboard de Supabase y toma la otra.

### 1.3 · Crear tu usuario admin (el que va a entrar al panel)

- [ ] Menú izquierdo: **Authentication** → **Users** → botón verde **«Add user» → «Create new user»**.
- [ ] Completa:
  - **Email**: tu correo (el mismo o cualquier otro que quieras usar para entrar al panel).
  - **Password**: elige una contraseña de mínimo 12 caracteres. **Anótala.**
  - **Auto Confirm User**: **prendido** (importante, si no queda pendiente de confirmar el mail).
- [ ] **Create user**.
- [ ] Verifica que aparece en la lista con el punto verde a la izquierda (email confirmado).

### 1.4 · Correr el SQL «Todo en Uno»

Este SQL crea todas las tablas, permisos, el bucket del logo, la configuración inicial, y te marca como admin.

- [ ] Menú izquierdo: **SQL Editor** → botón **«New query»** (arriba a la derecha).
- [ ] Abre este archivo desde el repo público de Leandro:
  **`https://github.com/LPTheCEOTech/panel-de-ventas/blob/main/docs/todo-en-uno.sql`** → botón **«Copy raw file»** (arriba a la derecha) → pega en el editor SQL de Supabase.
- [ ] **Antes de correrlo**: busca la línea que dice `TU_CORREO_AQUI` (`Ctrl+F` o `Cmd+F`, busca esas letras). Reemplaza `TU_CORREO_AQUI` por el correo que usaste en el paso 1.3, entre las comillas simples. Ejemplo:
  ```
  where email = 'juan@ejemplo.com'
  ```
- [ ] Botón verde **«Run»** abajo a la derecha (o `Ctrl+Enter` / `Cmd+Enter`).
- [ ] Abajo debería aparecer una tabla con 9 columnas y una fila con todos **1** (o el último `bucket_logos_ok` en `1`, y `admins_registrados` en `1`).

Si alguno de los números da **0**:

- Los primeros 7 en 0 → el SQL falló en esa parte. Fíjate en el mensaje de error rojo y dímelo.
- `admins_registrados` en 0 → escribiste mal el correo en la línea del `WHERE email`. Corrige y vuelve a ejecutar solo esa línea.
- `bucket_logos_ok` en 0 → la fila del bucket no se creó (raro). Ejecútalo de nuevo, o crea el bucket a mano: **Storage → New bucket → nombre `logos`, Public ON, Create**.

---

## Etapa 2 · App en internet con Vercel (5 min)

**Aquí está la magia**: no vas a crear tu propia copia del código. Vercel de tu cuenta va a leer directo del repo original de Leandro. Cuando Leandro publique una mejora, tu app se actualiza sola sin que hagas nada.

### 2.1 · Importar el repo de Leandro

- [ ] En [https://vercel.com/dashboard](https://vercel.com/dashboard), arriba a la derecha: **«Add New» → «Project»**.
- [ ] En la sección **«Import Git Repository»**, en el buscador de la derecha, pega:
  ```
  LPTheCEOTech/panel-de-ventas
  ```
  o directamente la URL completa: `https://github.com/LPTheCEOTech/panel-de-ventas`.
- [ ] Si Vercel te dice que no tiene acceso al repo, haz clic en **«Adjust GitHub App Permissions»** → agrega acceso al repo `LPTheCEOTech/panel-de-ventas` (es público, GitHub te deja) → vuelve.
- [ ] Al lado del nombre del repo, haz clic en **«Import»**.

> 💡 **NO uses «Fork»** ni **«Use this template»**. Con esos, tienes tu propia copia y los updates no te llegan solos. Con **Import directo**, tu Vercel apunta al repo original y actualiza automáticamente.

### 2.2 · Cargar las 3 claves

En la pantalla de configuración del proyecto:

- [ ] Puedes cambiar el **Project Name** por lo que quieras (`mi-panel`, por ejemplo). Va a ser parte de tu URL: `mi-panel.vercel.app`.
- [ ] Sección **«Environment Variables»** (más abajo, la despliegas si está colapsada).
- [ ] Vas a agregar tres variables, una por una:


| Key (nombre exacto)             | Value (lo que copiaste en 1.2) | Formato esperado                  |
| ------------------------------- | ------------------------------ | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | tu `URL`                       | `https://xxxxx.supabase.co`       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu `ANON_KEY`                  | JWT que arranca con `eyJ…`        |
| `SUPABASE_SERVICE_ROLE_KEY`     | tu `SERVICE_KEY`               | JWT **distinto** del `ANON_KEY`   |


> 💡 Copia los nombres **EXACTOS** desde la tabla de arriba (mayúsculas, guiones bajos). Un typo aquí y la app dice «error de servidor» sin explicar por qué.
>
> 🔴 **Chequeos antes de hacer clic en Save en cada una**:
>
> 1. `NEXT_PUBLIC_SUPABASE_URL` — pega solo la URL de Supabase (tipo `https://xxxxx.supabase.co`). **NO pegues** la URL del artifact de Claude, ni la de este checklist en GitHub, ni la de tu propio Vercel. Solo la de tu proyecto de **Supabase**.
> 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` — verifica que no aparezca ningún `•`, `·` ni `…` en el medio. Si ves puntitos, es porque la copiaste con el mouse en vez del botoncito de copiar — vuelve al paso 1.2 y cópiala bien.
> 3. `SUPABASE_SERVICE_ROLE_KEY` — mismo chequeo de puntitos. **Y además**: compárala con el `ANON_KEY` de arriba. Si son idénticas, copiaste dos veces la misma clave. La `service_role` es una **clave distinta** de la `anon` en Supabase → Project Settings → API.

- [ ] Después de cada una, haces clic en **«Save»** o pasas a la siguiente.

### 2.3 · Deploy

- [ ] Botón grande **«Deploy»** al final de la página.
- [ ] Espera 2-3 minutos. La pantalla muestra el log del build.
- [ ] Cuando ves «Congratulations» con confeti → listo.
- [ ] Click en la imagen de preview o en el botón **«Continue to Dashboard»**.
- [ ] En el dashboard vas a ver tu URL: algo tipo `mi-panel.vercel.app` — **cópiala, la usas en el paso siguiente**.

### 2.4 · Avisarle a Supabase cuál es tu URL de Vercel

Sin este paso, las invitaciones por correo que le mandes a tu equipo van a llegar con links rotos que apuntan a `localhost`. Es corto y va una sola vez.

- [ ] Vuelve a Supabase → menú izquierdo **Authentication** → **URL Configuration**.
- [ ] **Site URL**: borra lo que hay (`http://localhost:3000`) y pega tu URL de Vercel del paso 2.3.
  - Ejemplo bien: `https://mi-panel.vercel.app`
  - Ejemplo mal: `https://mi-panel.vercel.app/` (con barra al final) — quítala.
- [ ] Más abajo, **Redirect URLs** → botón **«Add URL»** → pega tu URL de Vercel con `/**` al final.
  - Ejemplo: `https://mi-panel.vercel.app/**`
- [ ] Botón **«Save»** abajo.

---

## Etapa 3 · Primer login + configurar tu panel (3 min)

- [ ] Abre tu URL en el navegador. Te tira a `/login`.
- [ ] Correo y contraseña son los que usaste en la Etapa 1.3.
- [ ] **Entras al panel**.

Los números están en cero (todavía no cargaste nada, es esperado). Vamos a personalizar antes de invitar al equipo.

### 3.1 · Ajustes

- [ ] Menú de arriba: **Ajustes**.
- [ ] Card **«Tu negocio»**:
  - **Nombre del panel**: el nombre de tu negocio (aparece en la barra de arriba y en la pestaña del navegador).
  - **Iniciales**: dos letras que aparecen si no cargas logo.
  - **Tu nombre**: cómo se te muestra a ti como usuario.
  - **Color de tu marca**: click en el cuadradito de color → se abre el picker → elige un color → Enter para cerrar.
  - **Logo** (opcional): click en «Elegir archivo» → sube una PNG/SVG chica (menos de 256 KB).
- [ ] Card **«Cómo cuenta»**:
  - **Moneda**: elige la tuya.
  - **Zona horaria**: elige la tuya.
  - **La semana empieza el**: Lunes o Domingo (según cómo piensas las semanas).
  - **Mostrar el ranking**: déjalo prendido salvo que no quieras rankings.
- [ ] Botón abajo a la derecha: **«Guardar ajustes»**.
- [ ] El panel se repinta con tu color y tu nombre al instante.

### 3.2 · Invitar al equipo

- [ ] Menú de arriba: **Equipo**.
- [ ] Card lateral **«Agregar al equipo»**:
  - **Nombre**: el nombre completo del vendedor.
  - **Rol**: Setter, Closer, o Setter y closer (si hace las dos cosas).
  - **Correo**: el correo del vendedor.
- [ ] **«Agregar e invitar»**.
- [ ] Al vendedor le llega un correo de Supabase con un link para elegir contraseña. Cuando lo acepte, va a entrar a **su propio panel filtrado** — ve solo sus números.
- [ ] Repite por cada persona del equipo.

**Listo. La app está funcionando. El equipo puede empezar a cargar sus reportes de fin de día y el panel se llena solo.**

---

## Si algo no funciona

| Lo que ves | Qué pasa |
|---|---|
| «error de servidor» en el login | Casi siempre es una env var mal en Vercel. Ve a Settings → Environment Variables, abre cada una con el ojito y revisa: (1) `NEXT_PUBLIC_SUPABASE_URL` tiene que ser tipo `https://xxxxx.supabase.co` — **no la URL del artifact, ni la de este checklist, ni la de tu Vercel**; (2) las 2 keys arrancan con `eyJ`, no tienen `•` en el medio, y `ANON_KEY` ≠ `SERVICE_KEY`. Si tocas algo, después ve a Deployments → último → tres puntitos → **Redeploy**. |
| Vercel te muestra **«Needs Attention»** al lado de `SUPABASE_SERVICE_ROLE_KEY` | Casi seguro copiaste la misma clave que en `ANON_KEY`. Vuelve al paso 1.2 y toma la `service_role` de Supabase (Project Settings → API → botón «Reveal» + rectangulito de copiar). Reemplaza el valor en Vercel y haz Redeploy. |
| «This page couldn't load — A server error occurred» al entrar | Mismo caso de arriba: env vars mal o el SQL «Todo en Uno» no se corrió. Revisa las envs primero, después ve a Supabase → SQL Editor → History y verifica que aparezca una corrida reciente del «Todo en Uno». |
| «Correo o contraseña incorrectos» | Correo o contraseña incorrectos. Puedes resetearlo desde Supabase → Authentication → Users → tres puntitos → «Send password recovery». |
| Después del login te tira a **/pendiente** | El SQL «Todo en Uno» no te marcó como admin — casi seguro te olvidaste de reemplazar `TU_CORREO_AQUI` por tu correo real. Vuelve al SQL Editor y ejecuta solo la parte del bootstrap (últimas 5 líneas antes de la comprobación), con tu correo entre las comillas. |
| Invitaste a alguien y el link del correo no funciona (o abre `localhost`) | Te saltaste el paso 2.4. Ve a Supabase → Authentication → URL Configuration y configura **Site URL** con tu URL de Vercel y **Redirect URLs** con esa URL + `/**`. |
| Vercel dice «no tengo acceso al repo» al importar | Haz clic en «Adjust GitHub App Permissions» → agrega acceso a `LPTheCEOTech/panel-de-ventas`. GitHub te deja porque el repo es público. |
| El panel está todo en `—` | No hay reportes cargados todavía. No es un error. |
| Después de una semana sin usar el panel, «error de servidor» | Supabase pausa proyectos gratuitos tras 7 días sin actividad. Ve a supabase.com → tu proyecto → botón **«Restore»** o **«Resume»**. Tarda 2 min y vuelve todo. Para evitarlo: que alguien cargue algo al menos una vez por semana. |

---

## ¿Y después?

- **Uso diario**: [`docs/uso-diario.md`](uso-diario.md) — cómo se carga un reporte, cómo se lee el panel.
- **Cuando salga una mejora**: no haces nada. Tu Vercel se actualiza sola. Los detalles en [`docs/actualizar.md`](actualizar.md).
