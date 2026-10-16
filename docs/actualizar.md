# Cuando salga una mejora

## La versión corta

**No haces nada.**

Tu Vercel apunta directo al repo de Leandro (`LPTheCEOTech/panel-de-ventas`). Cuando Leandro publique una mejora, Vercel dispara un deploy automáticamente y en 2 minutos tu app está actualizada. Tu login, tus datos, tu equipo, tu color, todo intacto — solo cambia lo que se mejoró.

**No forkeaste, no clonaste, no tienes tu propia copia del código.** Todo bien: es exactamente el diseño.

## Cuando una mejora necesita cambiar la base de datos

De vez en cuando una mejora necesita algo nuevo en tu base de datos (por ejemplo, un campo más). **No copias nada ni entras a Supabase.** Te enteras porque, al entrar al panel, ves una barra arriba:

> **Hay una actualización para tu panel.** … **[Actualizar ahora]**

1. Toca **«Actualizar ahora»**.
2. Espera unos segundos: aparece **«Listo. Tu panel ya está actualizado.»** y la barra se va.
3. Listo. Los datos que ya tenías se preservan, y si lo tocas dos veces no pasa nada.

Solo el admin ve la barra (tu manager y tus vendedores no). Mientras no la toques, el panel sigue funcionando igual que antes: lo único que no ves es la mejora nueva.

**Si la barra dice que escribas a soporte**: tu panel se instaló antes de que existiera el botón. Escríbele a Leandro: te manda un paso corto (se hace una sola vez) y desde ahí el botón funciona siempre.

## ¿Y si un update rompe algo?

Casi nunca pasa (Leandro publica cosas probadas), pero por si acaso:

- **Vercel guarda todos los deployments anteriores.** Si algo se rompe visualmente, ve a tu proyecto en Vercel → **Deployments** → el deployment de antes → tres puntitos → **«Promote to Production»**. Vuelves a la versión que funcionaba en un click. Los datos no se tocan.
- **Si algo falló al tocar «Actualizar ahora»**, la barra muestra el motivo. Mándale una captura a Leandro: no intentes arreglarlo a mano en Supabase.

## ¿Qué pasa si quiero modificar el código?

Con este esquema (Vercel apunta al repo de Leandro), **no puedes cambiar el código para ti**. Si quieres una feature específica que solo aplica a tu negocio, hay dos caminos:

**Opción A · Pídele a Leandro que la agregue a la plantilla.** Si es útil para varios alumnos, la suma al repo y automáticamente le llega a todos.

**Opción B · Haz fork del repo, apunta tu Vercel al fork.** En ese caso, para recibir updates del original tienes que hacer clic en «Sync fork» en GitHub cuando salgan (1 click). Requiere un poco más de mantenimiento pero te da control total sobre tu copia.

La mayoría de alumnos no necesita Opción B. Si eres un caso especial, avísale a Leandro y te ayuda a hacer el switch.

## ¿Cómo enterarme de qué cambió en el último update?

En GitHub, en el repo de Leandro, tab **Commits** → miras los últimos 5-10 mensajes. Cada uno describe qué cambió y por qué. Los mensajes están en español rioplatense, sin jerga.

Si prefieres algo más liviano: pregúntale a Leandro «¿qué salió nuevo?» y él te resume.
