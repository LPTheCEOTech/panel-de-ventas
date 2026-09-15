# Checklist de despliegue

> Este documento es la guía que sigue **el video** (link a Loom cuando esté grabado).
> El alumno mira el video, hace clic donde se le dice, y termina con la app funcionando. Total: ~25 minutos.
>
> Si te perdés a la mitad, este archivo es exactamente lo mismo que dice el video, escrito.

**El objetivo**: tu propia URL tipo `mi-panel.vercel.app` con login funcionando, base de datos vacía lista para cargar a tu equipo.

**Lo que necesitás antes de empezar**:

- Un correo electrónico (usá el mismo para las tres cuentas)
- 25 minutos sin interrupciones
- Un navegador (Chrome, Safari, Edge, cualquiera)
- Un gestor de contraseñas (o un papel) para anotar 3 cosas puntuales

**Lo que NO necesitás**:

- Terminal, consola, línea de comandos
- Instalar Node.js, git, ni nada
- Saber programar

---

## Etapa 0 · Preparar las cuentas (5 min)

Vas a necesitar tres cuentas gratuitas. Si ya tenés alguna, saltala.

- [ ] **GitHub** → [https://github.com/signup](https://github.com/signup) — usá tu correo, elegí una contraseña.
- [ ] **Supabase** → [https://supabase.com](https://supabase.com) → «Start your project» → «Continue with GitHub» → autorizás.
- [ ] **Vercel** → [https://vercel.com/signup](https://vercel.com/signup) → «Continue with GitHub» → autorizás.

> 💡 **Continuá con GitHub en las tres cuentas.** Así no tenés que recordar tres contraseñas y todo queda vinculado por si algún día pedís ayuda.

Anotá en algún lado:

- Tu correo
- Tu contraseña de GitHub

Nada más. Las otras dos (Supabase y Vercel) usan el mismo correo de GitHub.

---

## Etapa 1 · Copiar la plantilla (2 min)

- [ ] Andá al repo de Leandro: `**https://github.com/LPTheCEOTech/panel-de-ventas**` (te pasa el link él).
- [ ] Botón verde arriba a la derecha: **«Use this template» → «Create a new repository»**.
- [ ] En la pantalla nueva:
  - **Repository name**: `panel-de-ventas` (o el nombre que quieras)
  - **Private** (marcado)
  - **Create repository** (botón verde abajo)
- [ ] Esperá 5 segundos. Se abre tu copia.

Ya tenés tu propio repo. Todo lo que hagas es tuyo, nadie más lo ve.

---

## Etapa 2 · Base de datos en Supabase (10 min)

### 2.1 · Nuevo proyecto

- [ ] En [https://supabase.com/dashboard](https://supabase.com/dashboard), botón verde arriba a la derecha: **«New project»**.
- [ ] Completá:
  - **Name**: `panel-de-ventas` (o cualquier nombre)
  - **Database Password**: apretá **«Generate a password»** → **copiala** al gestor de contraseñas.
  - **Region**: la más cercana a vos (Argentina/Chile/Uruguay → `São Paulo`; México → `East US North Virginia`; España → `EU West Ireland`).
  - **Pricing Plan**: Free (viene marcado).
- [ ] **Create new project**.
- [ ] Esperá 2 minutos hasta que el punto verde aparezca al lado del nombre.

### 2.2 · Copiar las 3 claves

Cuando termine de crearse:

- [ ] Menú izquierdo (engranaje abajo): **Project Settings** → **API**.
- [ ] Vas a ver tres cosas para copiar. **Copialas al gestor de contraseñas**, ahora no las uses:


| En la pantalla dice                    | Anotalo como  |
| -------------------------------------- | ------------- |
| **Project URL**                        | `URL`         |
| **anon / public**                      | `ANON_KEY`    |
| **service_role** (tapada con puntitos) | `SERVICE_KEY` |


> 🔴 **Cuidado con la service_role.** Está tapada con puntitos por seguridad. **Apretá el botón «Reveal» primero** y después **el botón de copiar** (el rectangulito al lado). NO la seleccionés con el mouse — te llevás los puntitos y no la clave, y la app no funciona sin dar un error claro.

### 2.3 · Crear tu usuario admin (el que va a entrar al panel)

- [ ] Menú izquierdo: **Authentication** → **Users** → botón verde **«Add user» → «Create new user»**.
- [ ] Completá:
  - **Email**: tu correo (el mismo o cualquier otro que quieras usar para entrar al panel).
  - **Password**: elegí una contraseña de mínimo 12 caracteres. **Anotala.**
  - **Auto Confirm User**: **prendido** (importante, si no queda pendiente de confirmar el mail).
- [ ] **Create user**.
- [ ] Verificá que aparece en la lista con el punto verde a la izquierda (email confirmado).

### 2.4 · Correr el SQL «Todo en Uno»

Este SQL crea todas las tablas, permisos, el bucket del logo, la configuración inicial, y te marca como admin.

- [ ] Menú izquierdo: **SQL Editor** → botón **«New query»** (arriba a la derecha).
- [ ] En tu repo de GitHub abrí el archivo `**docs/todo-en-uno.sql**` → botón **«Copy raw file»** (arriba a la derecha) → pega en el editor SQL de Supabase.
- [ ] **Antes de correrlo**: busca la línea que dice `TU_CORREO_AQUI` (`Ctrl+F` o `Cmd+F`, buscá esas letras). Reemplazá `TU_CORREO_AQUI` por el correo que usaste en el paso 2.3, entre las comillas simples. Ejemplo:
  ```
  where email = 'juan@ejemplo.com'
  ```
- [ ] Botón verde **«Run»** abajo a la derecha (o `Ctrl+Enter` / `Cmd+Enter`).
- [ ] Abajo debería aparecer una tabla con 9 columnas y una fila con todos **1** (o el último `bucket_logos_ok` en `1`, y `admins_registrados` en `1`).

Si alguno de los números da **0**:

- Los primeros 7 en 0 → el SQL falló en esa parte. Fijate el mensaje de error rojo y decime.
- `admins_registrados` en 0 → escribiste mal el correo en la línea del `WHERE email`. Corregí y volvé a correr solo esa línea.
- `bucket_logos_ok` en 0 → la fila del bucket no se creó (raro). Correlo de nuevo.

---

## Etapa 3 · App en internet con Vercel (5 min)

### 3.1 · Importar el repo

- [ ] En [https://vercel.com/dashboard](https://vercel.com/dashboard), arriba a la derecha: **«Add New» → «Project»**.
- [ ] Si es la primera vez, te pide instalar la app de Vercel en GitHub: **«Configure GitHub App»** → autorizás **solo el repo** que creaste en Etapa 1 → **Install &amp; Authorize**.
- [ ] Buscás tu repo `panel-de-ventas` en la lista → **«Import»** (botón a la derecha del nombre).

### 3.2 · Cargar las 3 claves

En la pantalla de configuración del proyecto:

- [ ] Sección **«Environment Variables»** (más abajo, la desplegás si está colapsada).
- [ ] Vas a agregar tres variables, una por una:


| Key (nombre exacto)             | Value (lo que copiaste en 2.2) |
| ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | tu `URL`                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu `ANON_KEY`                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | tu `SERVICE_KEY`               |


> 💡 Copiá los nombres **EXACTOS** desde la tabla de arriba (mayúsculas, guiones bajos). Un typo acá y la app dice «error de servidor» sin explicar por qué.

- [ ] Después de cada una, apretás **«Save»** o pasas a la siguiente.

### 3.3 · Deploy

- [ ] Botón grande **«Deploy»** al final de la página.
- [ ] Esperá 2-3 minutos. La pantalla muestra el log del build.
- [ ] Cuando ves «Congratulations» con confeti → listo.
- [ ] Click en la imagen de preview o en el botón **«Continue to Dashboard»**.
- [ ] En el dashboard vas a ver tu URL: algo tipo `panel-de-ventas-xxx.vercel.app` — copiala.

---

## Etapa 4 · Primer login + configurar tu panel (3 min)

- [ ] Abrí tu URL en el navegador. Te tira a `/login`.
- [ ] Correo y contraseña son los que usaste en la Etapa 2.3.
- [ ] **Entrás al panel**.

Los números están en cero (todavía no cargaste nada, es esperado). Vamos a personalizar antes de invitar al equipo.

### 4.1 · Ajustes

- [ ] Menú de arriba: **Ajustes**.
- [ ] Card **«Tu negocio»**:
  - **Nombre del panel**: el nombre de tu negocio (aparece en la barra de arriba y en la pestaña del navegador).
  - **Iniciales**: dos letras que aparecen si no cargás logo.
  - **Tu nombre**: cómo se te muestra a vos como usuario.
  - **Color de tu marca**: click en el cuadradito de color → se abre el picker → elegí un color → Enter para cerrar.
  - **Logo** (opcional): click en «Elegir archivo» → subí una PNG/SVG chica (menos de 256 KB).
- [ ] Card **«Cómo cuenta»**:
  - **Moneda**: elegí la tuya.
  - **Zona horaria**: elegí la tuya.
  - **La semana empieza el**: Lunes o Domingo (según cómo pensás las semanas).
  - **Mostrar el ranking**: dejalo prendido salvo que no quieras rankings.
- [ ] Botón abajo a la derecha: **«Guardar ajustes»**.
- [ ] El panel se repinta con tu color y tu nombre al instante.

### 4.2 · Invitar al equipo

- [ ] Menú de arriba: **Equipo**.
- [ ] Card lateral **«Agregar al equipo»**:
  - **Nombre**: el nombre completo del vendedor.
  - **Rol**: Setter, Closer, o Setter y closer (si hace las dos cosas).
  - **Correo**: el correo del vendedor.
- [ ] **«Agregar e invitar»**.
- [ ] Al vendedor le llega un correo de Supabase con un link para elegir contraseña. Cuando lo acepte, va a entrar a **su propio panel filtrado** — ve solo sus números.
- [ ] Repetí por cada persona del equipo.

**Listo. La app está funcionando. El equipo puede empezar a cargar sus reportes de fin de día y el panel se llena solo.**

---

## Si algo no anda


| Lo que ves                                                   | Qué pasa                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| «error de servidor» en el login                              | Chequeá que las 3 env vars en Vercel estén bien (Settings → Environment Variables). Especial cuidado con `SERVICE_KEY` — si copiaste los puntitos en vez de la clave, error.                                                         |
| «Correo o contraseña incorrectos»                            | Correo o contraseña incorrectos. Podés resetearlo desde Supabase → Authentication → Users → tres puntitos → «Send password recovery».                                                                                                |
| Después del login te tira a **/pendiente**                   | El SQL «Todo en Uno» no te marcó como admin. Volvé al SQL Editor y correlo solo la parte del bootstrap (últimas 5 líneas antes de la comprobación).                                                                                  |
| El panel está todo en `—`                                    | No hay reportes cargados todavía. No es un error.                                                                                                                                                                                    |
| Después de una semana sin usar el panel, «error de servidor» | Supabase pausa proyectos gratuitos tras 7 días sin actividad. Andá a supabase.com → tu proyecto → botón **«Restore»** o **«Resume»**. Tarda 2 min y vuelve todo. Para evitarlo: que alguien cargue algo al menos una vez por semana. |


---

## ¿Y después?

- **Uso diario**: `docs/uso-diario.md` — cómo se carga un reporte, cómo se lee el panel.
- **Recibir mejoras**: `docs/actualizar.md` — cómo traer los updates que Leandro publique en la plantilla.

