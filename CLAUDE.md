# Panel de Ventas — LP The CEO

Panel de métricas de ventas donde **toda la data se carga a mano**, con dos formularios de fin de
día (setter y closer). El panel calcula las tasas, el embudo, el dinero y los rankings.

⚠️ **Esta app NO tiene nada que ver con la app de anuncios** (`LP-Command-Center`). Ese proyecto
quedó descartado. Acá no hay Meta Ads, ni GHL, ni integraciones de ningún tipo.

## Estado

Construida, verificada contra Postgres real y desplegada. La UI **todavía no llega al nivel** que
pide Jack: ése es el trabajo abierto.

| | |
|---|---|
| Producción | https://panel-de-ventas-kappa.vercel.app (cuenta de Leandro) |
| Supabase | `fjorfclimdrtcvijlvls` · us-west-2 · **con la semilla de prueba cargada** |
| Login | `jackmartinezglez@gmail.com` — contraseña en `.login-password` |
| Dev | `npm run dev` → http://localhost:3110 |
| Spec visual | `MOCKUP-APROBADO.html` — **es el spec literal, no una referencia** |
| PRP | `.claude/PRPs/prp-panel-de-ventas-v1.md` |

## 🔴 Las reglas que no se negocian

1. **El CSS NO se edita a mano.** `src/app/globals.css` lo GENERA `scripts/portar-css.py` desde
   `MOCKUP-APROBADO.html`. Para cambiar un estilo: se cambia el mockup y se corre
   `npm run portar-css`. El script **falla ruidoso** si una regla de celular queda sin su gemela
   `@media`. Editar el CSS a mano se pierde en el siguiente porteo.
2. **Cero datos de un negocio en el código.** Nombre, color, moneda y zona horaria salen de la
   tabla `configuracion`. `npm run sin-cliente` lo verifica y **falla** si aparece uno.
3. **Cero emoji en la interfaz.** Iconos SVG inline (`src/shared/chasis/iconos.tsx`). Los emoji
   salen cuadraditos en una máquina sin fuente de emoji.
4. **Un divisor 0 muestra `—`,** nunca `NaN`, nunca `0%`. Una instalación nueva no tiene datos.
5. **Lo derivado se deriva, nunca se guarda.** No hay ni una columna calculada en el esquema.
6. **Baja lógica, nunca DELETE** de personas: sus reportes tienen que seguir contando.

## El gate, antes de decir que algo está listo

```bash
npm run gate     # typecheck + lint + 19 tests + sin-cliente + build
npm run verificar  # los 24 numeros de oro contra la base REAL
```

Y **la foto**: escritorio (~1440) y celular (~390), claro **y** oscuro, app contra mockup. Validar
por foto de página completa no alcanza — hay que abrir cada estado (selector, date picker, el aviso
de "ya cargaste este día", la baja en Equipo).

## Gotchas ya pagados — no los redescubras

- **Next 16:** el archivo es `proxy.ts`, **no** `middleware.ts` (un `middleware.ts` no da error:
  simplemente no corre). `next lint` no existe. Sin `force-dynamic` en el layout de `(app)`, las
  pantallas con datos se prerenderizan y muestran los números del build — y **en `next dev` no se ve**.
- **Node 20 no trae `WebSocket`** y `createClient()` de Supabase construye un RealtimeClient en su
  constructor: tira antes de leer una fila. Resuelto con un `transport` en
  `shared/datos/supabase/cliente.ts`. En Vercel no se ve, porque ahí es Node 24.
- **En `next dev` la ruta de API y el render corren en procesos distintos.** Por eso la capa de
  desarrollo se respalda en un archivo: si no, un POST devuelve 200 y la lista sigue vacía.
- **El deploy va a la cuenta de Leandro** y los commits van firmados
  `LPTheCEOTech <tech@lpfinancialservices.info>` — si se firman con otro correo, Vercel los bloquea.

## Estructura

```
src/shared/calculo/   las fórmulas. Funciones puras, con tests.
src/shared/datos/     el puerto de datos. Las pantallas NO hablan con Supabase.
src/shared/chasis/    topbar, iconos, tema.
src/features/         una carpeta por pantalla.
supabase/migraciones/ el esquema.
```
