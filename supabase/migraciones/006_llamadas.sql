-- ============================================================
-- Panel de Ventas · migración 006 · LLAMADAS (granularidad por llamada)
--
-- El closer deja de cargar UN agregado por día y pasa a cargar UNA fila POR
-- llamada. Los agregados que alimentan el panel (llamadas, asistidos,
-- cierres, revenue, cash) se derivan sumando `llamadas` con `activa=true`.
--
-- 🔴 SIN `unique (fecha, persona_id)`. Un closer tiene VARIAS llamadas por
-- día — ese es exactamente el cambio.
-- 🔴 Baja lógica con `activa`: el closer se equivoca a menudo y el histórico
-- no puede desaparecer. Igual patrón que `personas`.
-- 🔴 Índice parcial `where activa`: el panel siempre filtra activas.
-- 🔴 revenue_cents y cash_cents con default 0: una llamada sin cierre no
-- obliga a tipear ceros; una llamada que solo cobra cuota de una venta
-- anterior tampoco.
-- 🔴 `reportes_closer` NO se droppea acá: queda como legacy y se decide en
-- la migración 007 si se borra o si se deja como vista de compatibilidad.
--
-- Idempotente: `create table if not exists`.
-- ============================================================

create table if not exists llamadas (
  id             uuid        primary key default gen_random_uuid(),
  persona_id     uuid        not null references personas(id) on delete restrict,
  fecha          date        not null,
  asistio        boolean     not null,
  reagendada     boolean     not null default false,
  cerro          boolean     not null,
  revenue_cents  bigint      not null default 0 check (revenue_cents >= 0),
  cash_cents     bigint      not null default 0 check (cash_cents >= 0),
  nota           text        null,
  activa         boolean     not null default true,
  es_demo        boolean     not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists llamadas_fecha_persona on llamadas (fecha, persona_id) where activa;
create index if not exists llamadas_fecha on llamadas (fecha) where activa;

alter table llamadas enable row level security;
grant select, insert, update, delete on llamadas to service_role;
revoke all on llamadas from anon, authenticated;
