# Panel de Ventas

Tu propio panel de métricas de ventas. **Todo se carga a mano** (sin integraciones), y el panel calcula solo las tasas, el embudo, el CAC, el AOV, el ticket promedio y los rankings.

## Empezar

**Mirá el video** (25 min): [link al Loom acá] · Video de despliegue paso a paso.

Si te perdés a la mitad, el video es exactamente lo que dice **[`docs/setup-checklist.md`](docs/setup-checklist.md)**. Podés ir siguiéndolo escrito.

## Qué mide

| | De dónde sale |
|---|---|
| **Cash collected** | lo que efectivamente cobraste |
| **Revenue contratado** | lo que se firmó |
| **% de cobro** | cash ÷ revenue |
| **Tasa de agenda** | agendas ÷ conversaciones |
| **Tasa de asistencia** | asistieron ÷ llamadas |
| **Tasa de cierre** | cierres ÷ asistieron |
| **Ticket promedio** | revenue ÷ cierres |
| **AOV** | cash ÷ cierres |
| **CAC** | gasto del período ÷ cierres |
| **Costo por asistida** | gasto ÷ asistidos |
| Embudo, rankings, cash por día | lo mismo, agrupado |

**Nada se guarda: todo se calcula al leer.** Si un día un número no cuadra, el problema está en un dato de entrada y se ve cuál.

## Pantallas

- **Panel**: los números de arriba. Filtrás por día, semana o mes.
- **Gasto**: cuánto gastaste en captación cada día (solo admin).
- **Reporte Setter**: el setter carga sus conversaciones y agendas al final del día.
- **Post Llamada**: el closer carga UNA fila POR llamada, con el nombre del lead.
- **Equipo**: agregar / invitar al equipo (solo admin).
- **Ajustes**: nombre, color, moneda, zona horaria, logo (solo admin).

## Los roles

- **Admin** (vos): ve todo, cambia todo, invita al equipo.
- **Miembro** (tu equipo): ve solo lo suyo, sin ajustes, sin gasto, sin ranking, sin equipo. Solo carga sus propios reportes.

Cada miembro se loguea con su propio correo (invitación por Supabase Auth).

## Documentación en el repo

| Archivo | Para qué |
|---|---|
| **[docs/setup-checklist.md](docs/setup-checklist.md)** | El paso a paso del video, escrito. A prueba de tontos. |
| **[docs/todo-en-uno.sql](docs/todo-en-uno.sql)** | El SQL que pegás en Supabase para crear todo (tablas, permisos, bucket, admin). |
| **[docs/uso-diario.md](docs/uso-diario.md)** | Cómo cargar reportes, cómo leer el panel. |
| **[docs/actualizar.md](docs/actualizar.md)** | Cómo traer los updates que Leandro publique. |
| **[docs/guia-instalacion.md](docs/guia-instalacion.md)** | Versión narrativa larga de la instalación (con contexto y gotchas). |

## Si usás Claude / Cursor / Copilot

El repo tiene contexto para agentes de IA:

- **`CLAUDE.md`**: doctrina general (SaaS Factory + este proyecto).
- **`CLAUDE.panel-de-ventas.md`**: contexto específico del panel (arquitectura, reglas, trampas conocidas).

Podés pegarles el link al repo y decirle a tu Claude «leé el CLAUDE.md y el CLAUDE.panel-de-ventas.md» — ya sabe cómo funciona todo.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase**: auth + Postgres + Storage
- **Vercel**: despliegue
- **CSS portado desde `MOCKUP-APROBADO.html`** (no se edita a mano)

## Preguntas frecuentes

**¿Cuánto sale?** Todo tiene plan gratis: GitHub (privado), Supabase (base + auth + storage), Vercel (despliegue). Alcanza de sobra para un negocio con equipo chico.

**¿Se rompe si crece el equipo?** No hay integraciones ni límites de usuarios en el código. El plan gratis de Supabase tiene sus topes (500 MB de base, 50 mil MAU); si los pasás, te avisan.

**¿Qué pasa si el bucket del logo se cae?** El favicon y el topbar caen a un SVG con las iniciales sobre el color de marca. Nada se rompe.

**¿Cómo pido ayuda?** Preguntale a tu Claude con el link al repo. Si no puede, pedile a Leandro.
