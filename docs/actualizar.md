# Cuando salga una mejora

## La versión corta

**No hacés nada.**

Tu Vercel apunta directo al repo de Leandro (`LPTheCEOTech/panel-de-ventas`). Cuando Leandro publique una mejora, Vercel dispara un deploy automáticamente y en 2 minutos tu app está actualizada. Tu login, tus datos, tu equipo, tu color, todo intacto — solo cambia lo que se mejoró.

**No forkeaste, no clonaste, no tenés tu propia copia del código.** Todo bien: es exactamente el diseño.

## La única excepción: migraciones SQL

De vez en cuando (cada varios meses, en la práctica), una mejora trae un cambio en la base de datos: una tabla nueva, una columna nueva. A esos cambios los llamamos **migraciones**. Cada migración es un archivo con nombre numerado en `supabase/migraciones/`.

Cuando eso pasa, Leandro te avisa. Y **el proceso es igual al setup inicial**, pero en versión chica:

1. Abrí el archivo nuevo desde el repo público de Leandro (por ejemplo, `supabase/migraciones/008_lo_que_sea.sql`).
2. Botón **«Copy raw file»** en GitHub.
3. Supabase → SQL Editor → New query → pegás → Run.
4. Listo. Los datos que ya tenías se preservan.

**Cómo enterarte de que hay una migración**: Leandro te avisa por el canal que use (WhatsApp, mail). También podés apretar el botón **Watch → Custom → Releases** en el repo de Leandro y te llega mail cuando publica versiones.

## ¿Y si un update rompe algo?

Casi nunca pasa (Leandro publica cosas probadas), pero por las dudas:

- **Vercel guarda todos los deployments anteriores.** Si algo se rompe visualmente, andá a tu proyecto en Vercel → **Deployments** → el deployment de antes → tres puntitos → **«Promote to Production»**. Volvés a la versión que andaba en un click. Los datos no se tocan.
- **Si el problema es una migración SQL nueva que rompió algo**, mandale mensaje a Leandro. No te pongas a revertir SQL a mano — más fácil que él te guíe.

## ¿Qué pasa si quiero modificar el código?

Con este esquema (Vercel apunta al repo de Leandro), **no podés cambiar el código para vos**. Si querés una feature específica que solo aplica a tu negocio, hay dos caminos:

**Opción A · Pedile a Leandro que la agregue a la plantilla.** Si es útil para varios alumnos, la suma al repo y automáticamente le llega a todos.

**Opción B · Hacé fork del repo, apuntá tu Vercel al fork.** En ese caso, para recibir updates del original tenés que apretar «Sync fork» en GitHub cuando salgan (1 click). Requiere un poco más de mantenimiento pero te da control total sobre tu copia.

La mayoría de alumnos no necesita Opción B. Si sos un caso especial, avisale a Leandro y te ayuda a hacer el switch.

## ¿Cómo enterarme de qué cambió en el último update?

En GitHub, en el repo de Leandro, tab **Commits** → mirás los últimos 5-10 mensajes. Cada uno describe qué cambió y por qué. Los mensajes están en español rioplatense, sin jerga.

Si preferís algo más liviano: preguntale a Leandro «¿qué salió nuevo?» y él te resume.
