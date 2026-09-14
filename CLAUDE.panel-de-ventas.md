# Panel de Ventas — contexto específico

> Este archivo lo lee tu Claude (o Cursor) para entender la app antes de tocar algo. Está pensado para el alumno que clona esta plantilla — no para el desarrollo original.
>
> Si sos el desarrollador original: mirá `CLAUDE.md` (doctrina de la fábrica) y los PRPs en `.claude/PRPs/`.

## Qué es

Panel de métricas de ventas donde **toda la data se carga a mano**, con:
- Un formulario diario para setters (conversaciones + agendas)
- Un formulario POR llamada para closers (con nombre del lead + condicionales de plata)
- Un formulario diario para el gasto de captación (solo admin)
- Un panel que calcula tasas, embudo, CAC, AOV, ticket promedio, rankings y cash por día

Multiusuario con dos roles: **admin** ve y toca todo; **miembro** ve solo lo suyo, sin ajustes ni gasto ni ranking.

**Cero integraciones. Cero data del negocio en el código.** Todo lo que hace que el panel sea de un negocio y no de otro vive en la tabla `configuracion` (nombre, iniciales, color, moneda, zona, logo).

## Estado del código (al día de escribir esto)

Todo lo que Leandro pidió como feedback está entregado en dos sesiones:

**Sesión 1** — Fase A (gasto + CAC + costo/asistida + AOV), Fase B (logo subible), Fase C (multiusuario + invitar por correo + roles), Fase D (Post Llamada granular).

**Sesión 2** — Fase E (gap visual `.panel-costos`), Fase A (Equipo unificado en un solo flow), Fase B (favicon dinámico con las iniciales), Fase C (color picker visual), Fase D (nombre del lead + Revenue/Cash condicionales).

Los PRPs de cada Fase viven en `.claude/PRPs/` con bitácora completa de decisiones tomadas y aprendizajes.

## Datos que vive dónde

```
supabase/migraciones/
  001_esquema.sql       configuracion, personas, reportes_setter, reportes_closer
  002_permisos.sql      grants solo a service_role
  003_gastos.sql        gasto diario del negocio
  004_logo.sql          columna logo_url en configuracion
  005_usuarios.sql      auth_user_id ↔ persona_id + rol admin/miembro
  006_llamadas.sql      una fila POR llamada (reemplaza reportes_closer agregado)
  007_lead_nombre.sql   nombre del lead obligatorio en cada llamada
```

**Todas se aplican de una** vía `docs/todo-en-uno.sql` (SQL Editor de Supabase). El archivo `scripts/instalar.mjs` también las aplica todas si el alumno prefiere terminal.

## Reglas duras del proyecto

1. **CSS del mockup, nunca `globals.css` a mano.** Circuito: `MOCKUP-APROBADO.html` → `python3 scripts/gemelas.py` → `npm run portar-css`. Las gemelas mobile (`body[data-view="mobile"]`) las genera un script — nunca se escriben a mano. Toda regla responsive es `max-width` (una `min-width` no tiene gemela posible).

2. **Cero datos de un negocio en el código.** `scripts/sin-cliente.py` lo verifica y falla si aparece uno. Nombre, moneda, zona horaria, color, logo, iniciales — todo vive en `configuracion`.

3. **Cero emoji en la interfaz.** SVG inline en `src/shared/chasis/iconos.tsx`. Emoji salen cuadraditos sin fuente adecuada.

4. **Un divisor 0 muestra `—`,** nunca `NaN`, nunca `0%`. Una instalación nueva no tiene datos; `0%` de cierre es mentira.

5. **Lo derivado se deriva, nunca se guarda.** No hay ni una columna calculada en el esquema. CAC, AOV, tasas, ranking — todo se calcula al leer.

6. **Baja lógica, nunca DELETE** de personas ni de llamadas. Sus reportes tienen que seguir contando.

7. **Auth en el servidor, no en el cliente.** Los endpoints (`/api/reportes/setter`, `/api/reportes/closer`, `/api/llamadas`) **overridean el `personaId` del body con el de la sesión** cuando el rol es `miembro`. Nunca confiar en lo que dice el navegador para authz.

## Arquitectura

```
src/
├── app/                              rutas
│   ├── (app)/                        todas requieren login (layout redirige a /pendiente si no está vinculado)
│   │   ├── panel/                    tablero principal
│   │   ├── gasto/                    formulario del gasto diario (admin)
│   │   ├── reporte-setter/           form setter (uno por día por persona)
│   │   ├── llamada/                  Post Llamada (una fila por llamada)
│   │   ├── equipo/                   agregar + invitar (admin)
│   │   ├── ajustes/                  configuración (admin)
│   │   └── layout.tsx                lee sesión, aplica marca CSS, monta Topbar
│   ├── login/                        pantalla de login (única pública)
│   ├── pendiente/                    fallback si el user está logueado pero no vinculado
│   ├── api/                          endpoints (todos requieren admin salvo los de reportes)
│   │   ├── favicon/                  SVG dinámico con las iniciales
│   │   ├── ajustes/                  PATCH config
│   │   ├── logo/                     POST/DELETE del logo (Supabase Storage)
│   │   ├── equipo/                   POST agrega + invita (unificado)
│   │   ├── gasto/                    POST/GET del gasto diario
│   │   ├── llamadas/                 POST/PATCH/DELETE de llamadas
│   │   ├── reportes/setter/          POST/GET (endpoint clásico)
│   │   ├── reportes/closer/          POST/GET (endpoint legacy, se usa poco desde Fase D)
│   │   └── auth/                     login + logout
│   ├── layout.tsx                    <html> raíz, favicon dinámico
│   └── globals.css                   generado desde MOCKUP-APROBADO.html
│
├── shared/
│   ├── calculo/metricas.ts           kernel: totales, metricas, embudo, rankings, agregarLlamadas
│   ├── datos/
│   │   ├── interfaz.ts               CapaDeDatos (contrato)
│   │   ├── supabase/capa.ts          implementación real
│   │   ├── demo.ts                   implementación en memoria (para dev sin BD)
│   │   ├── semilla.ts                42 filas de oro + 96 llamadas + 7 gastos
│   │   ├── sesion.ts                 login, cookies, credenciales
│   │   ├── sesion-usuario.ts         sesionActual() para RSC / route handlers
│   │   └── guardias.ts               soloAdmin()
│   ├── chasis/
│   │   ├── topbar.tsx                barra de arriba con logo/iniciales + nav + logout
│   │   ├── nav.tsx                   filtra rutas admin cuando rol=miembro
│   │   ├── marca.ts                  deriva --m1..--m7 y neutros del hex
│   │   └── iconos.tsx                todos los SVG inline
│   └── tipos/                        Configuracion, Persona, ReporteSetter, ReporteCloser, Llamada, Gasto, Usuario, Sesion
│
└── features/                         una carpeta por pantalla, con componentes cliente
    ├── panel/piezas.tsx              Plata, Tasas, Embudo, CashPorDia, Costos, RankingClosers/Setters
    ├── gasto/form.tsx                CampoDinero para el gasto
    ├── reportes/                     form-setter, form-closer, piezas (Stepper, CampoDinero, Derivado)
    ├── llamadas/panel-llamada.tsx    form + lista con contador vivo del día
    ├── equipo/lista.tsx              lista + card unificada de alta e invitación
    └── ajustes/
        ├── panel.tsx                 dos tarjetas de configuración + logo + color picker
        ├── color-picker.tsx          popover custom con gradient sat/brillo + hue
        └── color-utils.ts            hexToHsv / hsvToHex / hexValido

supabase/migraciones/                 001 → 007
scripts/                              instalar, semilla, verificar, gemelas, portar-css, sin-cliente, demo-vivo
MOCKUP-APROBADO.html                  el diseño, spec literal
docs/                                 setup-checklist, todo-en-uno.sql, uso-diario, actualizar, guia-instalacion
.claude/PRPs/                         planes de las 9 Fases (2 sesiones)
```

## Trampas conocidas (gotchas ya pagados)

Cada uno está documentado en detalle en el PRP correspondiente. En corto:

- **Next 16**: el archivo es `proxy.ts`, NO `middleware.ts` (un middleware.ts no da error: simplemente no corre). `next lint` ya no existe. Sin `force-dynamic` en el layout `(app)`, las pantallas con datos se prerenderizan.

- **Node 20 no trae `WebSocket`**. Supabase createClient() construye un RealtimeClient en su constructor y tira. Resuelto con un `transport` custom en `shared/datos/supabase/cliente.ts`. En Vercel (Node 24) no se ve.

- **`next dev`: la API y el render corren en procesos distintos.** Por eso la capa demo se respalda en un archivo, no en memoria — si no, un POST devuelve 200 y la lista sigue vacía.

- **`var(--token)` que no existe = silencio.** Si se renombra un token en el mockup, hay que grepear fuera de `globals.css` (hoy solo `login.module.css` tiene CSS propio).

- **`color-scheme` decide el date-picker del navegador y el `<select>`.** Sin declararlo, en tema oscuro el calendario se abre blanco y el icono del date queda negro sobre negro.

- **Supabase gratis pausa proyectos** tras 7 días sin actividad. Síntoma: «error de servidor» al entrar. Solución: Restore/Resume desde el dashboard. Documentado en `docs/setup-checklist.md`.

- **Borrar una API route requiere `rm -rf .next`**. Next 16 mantiene tipos generados en `.next/types/validator.ts` que apuntan al archivo viejo.

- **`setState` sincrónico en `useEffect`** dispara warning `react-hooks/set-state-in-effect` y crea renders en cascada. Consolidar en un handler.

- **Cache de favicon**: Vercel + navegadores cachean fuerte. El `/api/favicon` tiene cache 60 s para que un cambio en Ajustes se vea rápido.

- **Bucket `logos` público**: el `<img>` del navegador no puede autenticarse a Supabase Storage. Requiere URL firmada o público. Elegimos público — es un logo del negocio, se muestra a cualquiera que abra el panel.

## Gate antes de decir «listo»

```bash
npm run typecheck   # sin errores
npm run lint        # sin warnings
npm test            # 41 tests (kernel + sesion + color-utils)
npm run sin-cliente # cero data hardcodeada
npm run build       # build verde
npm run verificar   # los 27 números de oro contra la base real
```

Y **la foto**: 1440×900 y 390×844, tema claro y oscuro, panel vs mockup.

## Cómo pedirle cosas a tu Claude

Cuando querés que Claude cambie algo:

1. **Empezá diciendo qué pantalla + qué se ve mal / qué querés distinto.** «En el panel, la banda de costos tiene diferente separación que las demás» es mucho mejor que «arreglá el CSS».

2. **Dejalo mirar los PRPs** (`.claude/PRPs/*.md`) para que copie el patrón. Cada Fase tiene bitácora con decisiones y aprendizajes.

3. **NO le pidas que edite `globals.css`** — el circuito es mockup → gemelas.py → portar-css. Los PRPs anteriores lo repiten porque cuesta acordarse.

4. **NO le pidas cambios de esquema sin migración numerada.** El próximo número libre es `008_...sql` (los siete anteriores están usados).

5. **Cuando termine, pedile el gate**: typecheck, tests, sin-cliente, build. Si toca la base, también `verificar` contra la base real.

## Contacto

Si algo no cierra o encontrás un bug, avisale a Leandro. Él coordina updates de la plantilla base.
