-- ============================================================
-- Panel de Ventas · migración 003 · GASTOS
--
-- Cuánto se gasta cada día en captación. Del negocio, no de nadie del equipo:
-- por eso no hay `persona_id`. Uno por día — un solo gasto por fecha (PK).
-- Si hubo dos plataformas, se carga la SUMA y la nota queda de ayuda-memoria
-- («$8k Meta, $6k Google»).
--
-- 🔴 Idempotente: `create table if not exists`. Correrla dos veces no rompe.
-- 🔴 Permisos: solo service_role. Alineado con 002_permisos.sql.
-- ============================================================

create table if not exists gastos (
  fecha          date         primary key,
  -- 🔴 CENTAVOS, siempre. Igual que revenue_cents y cash_cents. Nunca numeric.
  monto_cents    bigint       not null check (monto_cents >= 0),
  nota           text         null,
  -- lo que planta `npm run semilla`. `--limpiar` borra exactamente esto.
  es_demo        boolean      not null default false,
  creado_en      timestamptz  not null default now(),
  actualizado_en timestamptz  not null default now()
);

alter table gastos enable row level security;

-- mismo patrón que 002: SOLO service_role toca. anon/authenticated no ven nada.
grant select, insert, update, delete on gastos to service_role;
revoke all on gastos from anon, authenticated;
