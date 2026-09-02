-- ============================================================
-- Panel de Ventas — esquema v1
--
-- Dos tablas de hechos (un reporte de fin de día por persona y por fecha) y
-- dos de dimensión (personas, configuración). Nada más.
--
-- 🔴 NO existe ninguna columna derivada. Ni `tasa_agenda`, ni `total_semana`,
-- ni `ticket_promedio`. Todo eso se calcula al leer, en
-- `src/shared/calculo/metricas.ts`. Guardar un derivado crea una segunda
-- verdad que el día que no coincida no se sabe cuál es la buena.
-- ============================================================

-- ---------- CONFIGURACIÓN: una sola fila, id fijo ----------
-- Acá vive TODO lo que hace que el panel sea de un negocio y no de otro. Nada
-- de esto está escrito en el código: es lo que permite que cada alumno instale
-- su propia copia sin tocar un archivo.
create table if not exists configuracion (
  id              int          primary key default 1,
  nombre_negocio  text         not null,
  iniciales       text         not null,
  usuario_nombre  text         not null,
  usuario_rol     text         not null default 'Dueño',
  marca           text         not null default '#00D97E',
  moneda          text         not null default 'USD',
  simbolo         text         not null default '$',
  zona_horaria    text         not null default 'America/New_York',
  inicio_semana   smallint     not null default 1,
  ranking_visible boolean      not null default true,
  actualizado_en  timestamptz  not null default now(),
  -- 🔴 el check hace IMPOSIBLE que haya dos configuraciones. Si fueran dos
  -- filas, la app leería una y la pantalla de Ajustes escribiría la otra.
  constraint configuracion_fila_unica check (id = 1),
  constraint configuracion_inicio_semana check (inicio_semana in (0, 1))
);

-- ---------- PERSONAS ----------
do $$ begin
  create type rol_persona as enum ('setter', 'closer', 'ambos');
exception when duplicate_object then null; end $$;

create table if not exists personas (
  id        uuid        primary key default gen_random_uuid(),
  nombre    text        not null,
  rol       rol_persona not null,
  -- 🔴 Baja LÓGICA. Un closer que se va NO se borra: sus reportes tienen que
  -- seguir contando en las semanas que trabajó. La app no tiene DELETE.
  activo    boolean     not null default true,
  -- lo que planta `npm run semilla`. `--limpiar` borra exactamente esto y
  -- nunca una fila real.
  es_demo   boolean     not null default false,
  orden     int         not null default 0,
  creado_en timestamptz not null default now(),
  constraint personas_nombre_no_vacio check (length(trim(nombre)) > 0)
);

-- dos "Sofía Lara" en el selector son indistinguibles y el ranking las separa
create unique index if not exists personas_nombre_unico on personas (lower(trim(nombre)));

-- ---------- REPORTES ----------
create table if not exists reportes_setter (
  id             uuid        primary key default gen_random_uuid(),
  fecha          date        not null,
  persona_id     uuid        not null references personas(id) on delete restrict,
  conversaciones int         not null,
  agendas        int         not null,
  es_demo        boolean     not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- 🔴 ESTE es el invariante que sostiene toda la app. Sin él, un setter que
  -- manda su reporte dos veces (porque no vio el primero, o refrescó) duplica
  -- su día: el panel suma de más, nada falla, ningún número se ve mal, y la
  -- tasa de agenda del equipo queda mintiendo para siempre.
  --
  -- Validarlo solo en el formulario dejaría tres lugares donde equivocarse
  -- (el form, la API y un script). Acá no deja ninguno.
  constraint reportes_setter_uno_por_dia unique (fecha, persona_id),

  constraint reportes_setter_no_negativos check (conversaciones >= 0 and agendas >= 0)
);

create table if not exists reportes_closer (
  id             uuid        primary key default gen_random_uuid(),
  fecha          date        not null,
  persona_id     uuid        not null references personas(id) on delete restrict,
  llamadas       int         not null,
  asistieron     int         not null,
  reagendadas    int         not null,
  cierres        int         not null,
  -- 🔴 CENTAVOS, no decimales. Con `numeric` habría que acordarse de la escala
  -- en cada lugar; con enteros no hay redondeo que se escape.
  revenue_cents  bigint      not null,
  cash_cents     bigint      not null,
  es_demo        boolean     not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint reportes_closer_uno_por_dia unique (fecha, persona_id),

  constraint reportes_closer_no_negativos check (
    llamadas >= 0 and asistieron >= 0 and reagendadas >= 0 and cierres >= 0
    and revenue_cents >= 0 and cash_cents >= 0
  )
);

-- ============================================================
-- 🔴 POR QUÉ NO HAY CHECKS DE COHERENCIA ENTRE COLUMNAS
--
-- La primera versión de este esquema tenía tres, y los tres estaban mal:
--
--   agendas <= conversaciones  → falso. Un setter agenda hoy a alguien con
--                                quien empezó a hablar el martes.
--   cierres <= asistieron      → falso. Un cierre puede venir de una llamada
--                                de la semana pasada, cerrada hoy por mensaje.
--   cash <= revenue            → falso, y es el más común de todos: cobrar hoy
--                                la cuota de una venta firmada hace un mes es
--                                literalmente el negocio. El propio modelo de
--                                Bryan tiene un campo para eso.
--
-- Un check que rechaza un día real es peor que no tenerlo: la persona no puede
-- cargar su reporte, y el número que falta hace más daño que el número raro.
-- Estas incoherencias son SEÑALES, no errores, y se avisan en el formulario
-- ("cobraste más de lo que firmaste hoy — ¿es de una venta anterior?"), donde
-- quien sabe la respuesta es quien está mirando la pantalla.
--
-- El único invariante duro es `unique (fecha, persona_id)`, porque ahí no hay
-- caso legítimo: nadie tiene dos finales de día.
-- ============================================================

create index if not exists reportes_setter_fecha on reportes_setter (fecha);
create index if not exists reportes_closer_fecha on reportes_closer (fecha);

-- ---------- RLS ----------
-- Prendido y SIN políticas, a propósito: no es multi-tenant y todo pasa por el
-- servidor con service_role, que salta RLS. Prenderlo es el cinturón: si algún
-- día alguien expusiera la anon key al navegador, no podría leer nada.
alter table configuracion    enable row level security;
alter table personas         enable row level security;
alter table reportes_setter  enable row level security;
alter table reportes_closer  enable row level security;
