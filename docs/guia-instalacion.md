# Instalar tu Panel de Ventas

Esta guía asume **cero conocimiento técnico**. Son unos 30 minutos, y la mayor
parte es esperar.

Vas a necesitar tres cuentas gratuitas: **GitHub** (donde vive el código),
**Vercel** (donde vive la app) y **Supabase** (donde viven tus números). Las
tres tienen plan gratis que alcanza de sobra.

> 💡 **Usá el mismo correo para las tres.** El día que necesites ayuda, tener
> todo bajo un correo evita media hora de "¿con cuál me registré?".

---

## Paso 1 — Tu copia del código

1. Entrá al repositorio de la plantilla y apretá el botón verde
   **«Use this template» → «Create a new repository»**.
2. Ponele un nombre (`panel-de-ventas` está bien), dejálo **Private**, y creá.

Ya tenés tu copia. Nadie más la ve, y lo que cambies no afecta a nadie.

---

## Paso 2 — Tu base de datos (Supabase)

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto.
2. Elegí la región **más cercana a vos** y guardá la contraseña de la base en
   tu gestor de contraseñas — te la va a pedir una sola vez y no se puede ver
   después.
3. Esperá a que termine de crearse (un par de minutos).

Ahora andá a **Project Settings → API** y copiá tres cosas:

| Qué | Dónde dice |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (está tapada: apretá *Reveal*) |

> 🔴 **Esto es lo que más problemas da, y no lo parece.**
> La clave `service_role` se muestra tapada con puntitos. **Si seleccionás el
> texto con el mouse, te llevás los puntitos y no la clave.** La app queda rota
> de una forma que no se entiende: el login dice «error de servidor» aunque la
> contraseña esté bien. **Usá siempre el botón de copiar (o *Reveal* primero).**

---

## Paso 3 — La app en internet (Vercel)

1. Entrá a [vercel.com](https://vercel.com) y registrate **con tu cuenta de GitHub**.
2. **Add New → Project** y elegí el repositorio que creaste en el paso 1.
3. Antes de apretar Deploy, abrí **Environment Variables** y pegá las tres del
   paso 2, una por una.
4. Deploy.

> 🔴 **El primer deploy sale verde y no prueba nada.**
> Ése lo dispara Vercel al importar el proyecto. **El que importa es el
> segundo** — el que sale cuando cambiás algo. Si el segundo falla y el primero
> no, casi siempre es porque los commits están firmados con un correo que no es
> el dueño de la cuenta de Vercel. Se arregla en Git, no en Vercel.

---

## Paso 4 — Crear las tablas y tu usuario

En tu computadora, con el código descargado:

```bash
npm install
cp .env.local.example .env.local
```

Abrí `.env.local` y pegá las mismas tres variables. Después:

```bash
npm run instalar
```

Te va a preguntar el nombre de tu panel, tu color de marca, tu moneda, tu zona
horaria, y el correo y la contraseña con los que vas a entrar. Y listo.

---

## Paso 5 — Cargá tu equipo

Entrá a tu panel, andá a **Equipo** y agregá a tus setters y closers. Hasta que
no haya nadie ahí, los formularios no tienen a quién asignarle los números.

El panel va a estar en cero hasta que alguien mande su primer reporte. **Es
así a propósito**: no viene con datos de ejemplo de otro negocio.

---

## 🔴 Paso 6 — El que nadie te cuenta: Supabase se duerme

**El plan gratuito de Supabase PAUSA tu proyecto si pasa una semana sin
consultas a la base.** Y no avisa.

Lo que ves cuando pasa: entrás al panel y dice **«error de servidor»**. Parece
que se rompió la app. No se rompió: la base está dormida.

**Cómo despertarla:** entrá a supabase.com, abrí tu proyecto y apretá
*Restore* / *Resume*. Tarda un par de minutos y vuelve todo, sin perder nada.

**Cómo evitarlo:** que alguien del equipo cargue su reporte al menos una vez por
semana. Es lo mismo que ya tiene que pasar para que el panel sirva.

**Cómo confirmar que es eso y no otra cosa,** desde tu terminal:

```bash
dig +short TU-REF.supabase.co @1.1.1.1
```

Si no devuelve nada, está pausado. Si devuelve una dirección IP, está despierto
y el problema es otro.

> 💡 Probá el mismo comando con `google.com`. Si *ése* tampoco devuelve nada, lo
> que falla es tu conexión, no Supabase. Sin esa segunda prueba, «no responde»
> y «no tengo internet» se ven exactamente igual.

---

## Cuando algo no anda

| Lo que ves | Casi siempre es |
|---|---|
| «error de servidor» al entrar | Supabase pausado (paso 6), o una clave copiada con los puntitos (paso 2) |
| «Correo o contraseña incorrectos» | eso mismo. `npm run usuario -- resetear <correo> "<contraseña nueva>"` |
| El deploy falla y el primero había salido bien | el correo del autor de los commits (paso 3) |
| El panel está todo en `—` | todavía no hay reportes cargados. No es un error |
| Un formulario dice que no hay nadie | falta cargar el equipo (paso 5) |
