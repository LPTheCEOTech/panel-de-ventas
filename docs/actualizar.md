# Cuando salga una mejora

## La versión corta

**No haces nada.**

Tu Vercel apunta directo al repo de Leandro (`LPTheCEOTech/panel-de-ventas`). Cuando Leandro publique una mejora, Vercel dispara un deploy automáticamente y en 2 minutos tu app está actualizada. Tu login, tus datos, tu equipo, tu color, todo intacto — solo cambia lo que se mejoró.

**No forkeaste, no clonaste, no tienes tu propia copia del código.** Todo bien: es exactamente el diseño.

## La única excepción: migraciones SQL

De vez en cuando (cada varios meses, en la práctica), una mejora trae un cambio en la base de datos: una tabla nueva, una columna nueva. A esos cambios los llamamos **migraciones**. Cada migración es un archivo con nombre numerado en `supabase/migraciones/`.

Cuando eso pasa, Leandro te avisa. Y **el proceso es igual al setup inicial**, pero en versión chica:

1. Abre el archivo nuevo desde el repo público de Leandro (por ejemplo, `supabase/migraciones/008_lo_que_sea.sql`).
2. Botón **«Copy raw file»** en GitHub.
3. Supabase → SQL Editor → New query → pegas → Run.
4. Listo. Los datos que ya tenías se preservan.

**Cómo enterarte de que hay una migración**: Leandro te avisa por el canal que use (WhatsApp, mail). También puedes hacer clic en el botón **Watch → Custom → Releases** en el repo de Leandro y te llega mail cuando publica versiones.

## ¿Y si un update rompe algo?

Casi nunca pasa (Leandro publica cosas probadas), pero por si acaso:

- **Vercel guarda todos los deployments anteriores.** Si algo se rompe visualmente, ve a tu proyecto en Vercel → **Deployments** → el deployment de antes → tres puntitos → **«Promote to Production»**. Vuelves a la versión que funcionaba en un click. Los datos no se tocan.
- **Si el problema es una migración SQL nueva que rompió algo**, envíale un mensaje a Leandro. No te pongas a revertir SQL a mano — más fácil que él te guíe.

## ¿Qué pasa si quiero modificar el código?

Con este esquema (Vercel apunta al repo de Leandro), **no puedes cambiar el código para ti**. Si quieres una feature específica que solo aplica a tu negocio, hay dos caminos:

**Opción A · Pídele a Leandro que la agregue a la plantilla.** Si es útil para varios alumnos, la suma al repo y automáticamente le llega a todos.

**Opción B · Haz fork del repo, apunta tu Vercel al fork.** En ese caso, para recibir updates del original tienes que hacer clic en «Sync fork» en GitHub cuando salgan (1 click). Requiere un poco más de mantenimiento pero te da control total sobre tu copia.

La mayoría de alumnos no necesita Opción B. Si eres un caso especial, avísale a Leandro y te ayuda a hacer el switch.

## ¿Cómo enterarme de qué cambió en el último update?

En GitHub, en el repo de Leandro, tab **Commits** → miras los últimos 5-10 mensajes. Cada uno describe qué cambió y por qué. Los mensajes están en español rioplatense, sin jerga.

Si prefieres algo más liviano: pregúntale a Leandro «¿qué salió nuevo?» y él te resume.
