# Jack juzga por la foto, no por el diff

El veredicto que importa es «se ve pobre» / «se ve bien». Un cambio puede estar
correcto, testeado y verificado contra la base y **aun así no valer**, porque lo que
pidió era otra cosa.

## Qué implica al trabajar

- **La foto es parte de terminar.** No alcanza con `npm run gate`: 1440 y 390, claro
  y oscuro, y **abriendo cada estado** (el selector de personas, el date picker, el
  aviso de «ya cargaste este día», la baja en Equipo, el panel vacío). Una foto de
  página completa no cubre ninguno de esos.
- **La semilla vive en julio de 2026** y «hoy» del sistema es septiembre: entrar a
  `/panel` a secas muestra la semana vacía. Para ver el panel con datos:
  `/panel?p=semana&f=2026-07-26`. Sacar la foto de la semana vacía y creer que la app
  está rota es un error que ya se cometió.
- **Contexto en español rioplatense**, en los comentarios y en los commits. Los
  comentarios explican POR QUÉ, y los `🔴` marcan lo que se pagó caro.

## Cómo pide el trabajo

Por fases, con commit por fase, firmados con el `git config` del repo
(`LPTheCEOTech`). Nunca `git add -A`: se stagea por nombre.
