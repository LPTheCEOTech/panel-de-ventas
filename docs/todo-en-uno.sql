-- ================================================================
-- Panel de Ventas · TODO EN UNO
--
-- Este archivo hace TODO lo que necesita la app para arrancar:
--   · Crea las 4 tablas base (configuracion, personas, reportes_setter,
--     reportes_closer) y las 3 tablas nuevas (gastos, usuarios, llamadas).
--   · Prende Row Level Security y da permisos solo a service_role.
--   · Crea el bucket público `logos` en Supabase Storage.
--   · Deja una fila de configuración inicial que se edita después desde
--     Ajustes en la app.
--   · Crea tu usuario admin (correo + contraseña) y lo deja confirmado.
--     No hace falta ir a Authentication → Users: este SQL lo hace por vos.
--
-- ================================================================
--   🔴  DOS CAMBIOS ANTES DE CORRER  🔴
--   Buscá `TU_CORREO_AQUI` y `TU_CONTRASENA_AQUI` al final del archivo y
--   reemplazalos por el correo y la contraseña con los que vas a entrar
--   al panel. La contraseña: mínimo 12 caracteres, sin comillas simples.
--   (Si usás la guía interactiva, ella los reemplaza sola.)
-- ================================================================
--
-- Es idempotente: correrlo dos veces no rompe nada. Si alguna vez agregás
-- una nueva migración, la volvés a pegar acá y no re-crea lo que ya existe.
-- ================================================================


-- =============================================================
-- 001 · ESQUEMA
-- Configuracion (1 fila), Personas, Reportes setter, Reportes closer.
-- =============================================================

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
  constraint configuracion_fila_unica check (id = 1),
  constraint configuracion_inicio_semana check (inicio_semana in (0, 1))
);

do $$ begin
  create type rol_persona as enum ('setter', 'closer', 'ambos');
exception when duplicate_object then null; end $$;

create table if not exists personas (
  id        uuid        primary key default gen_random_uuid(),
  nombre    text        not null,
  rol       rol_persona not null,
  activo    boolean     not null default true,
  es_demo   boolean     not null default false,
  orden     int         not null default 0,
  creado_en timestamptz not null default now(),
  constraint personas_nombre_no_vacio check (length(trim(nombre)) > 0)
);

create unique index if not exists personas_nombre_unico on personas (lower(trim(nombre)));

create table if not exists reportes_setter (
  id             uuid        primary key default gen_random_uuid(),
  fecha          date        not null,
  persona_id     uuid        not null references personas(id) on delete restrict,
  conversaciones int         not null,
  agendas        int         not null,
  es_demo        boolean     not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
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

create index if not exists reportes_setter_fecha on reportes_setter (fecha);
create index if not exists reportes_closer_fecha on reportes_closer (fecha);

alter table configuracion    enable row level security;
alter table personas         enable row level security;
alter table reportes_setter  enable row level security;
alter table reportes_closer  enable row level security;


-- =============================================================
-- 002 · PERMISOS (solo service_role toca)
-- =============================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

revoke all on all tables in schema public from anon, authenticated;


-- =============================================================
-- 003 · GASTOS (Fase A · sesión 1)
-- =============================================================

create table if not exists gastos (
  fecha          date         primary key,
  monto_cents    bigint       not null check (monto_cents >= 0),
  nota           text         null,
  es_demo        boolean      not null default false,
  creado_en      timestamptz  not null default now(),
  actualizado_en timestamptz  not null default now()
);
alter table gastos enable row level security;
grant select, insert, update, delete on gastos to service_role;
revoke all on gastos from anon, authenticated;


-- =============================================================
-- 004 · LOGO (Fase B · sesión 1)
-- =============================================================

alter table configuracion
  add column if not exists logo_url text null;


-- =============================================================
-- 005 · USUARIOS (Fase C · sesión 1 · multiusuario + roles)
-- =============================================================

create table if not exists usuarios (
  auth_user_id uuid        primary key references auth.users(id) on delete cascade,
  persona_id   uuid        null references personas(id) on delete restrict,
  rol          text        not null check (rol in ('admin', 'miembro')),
  creado_en    timestamptz not null default now()
);
create unique index if not exists usuarios_persona_unica on usuarios (persona_id)
  where persona_id is not null;
alter table usuarios enable row level security;
grant select, insert, update, delete on usuarios to service_role;
revoke all on usuarios from anon, authenticated;


-- =============================================================
-- 006 · LLAMADAS (Fase D · sesión 1 · una fila por llamada)
-- =============================================================

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


-- =============================================================
-- 007 · LEAD_NOMBRE (Fase D · sesión 2 · nombre del lead por llamada)
-- =============================================================

alter table llamadas
  add column if not exists lead_nombre text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'llamadas_lead_nombre_len'
  ) then
    alter table llamadas
      add constraint llamadas_lead_nombre_len
      check (char_length(lead_nombre) <= 200);
  end if;
end $$;


-- =============================================================
-- 008 · ORIGEN_LEAD (Sesión 3 · de dónde vino el lead)
-- =============================================================

alter table llamadas
  add column if not exists origen_lead text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'llamadas_origen_lead_valido'
  ) then
    alter table llamadas
      add constraint llamadas_origen_lead_valido
      check (origen_lead in ('', 'organico', 'anuncios', 'referidos'));
  end if;
end $$;


-- =============================================================
-- CONFIGURACIÓN INICIAL
-- Deja una fila mínima para que la app arranque. Todos los valores se
-- editan después desde /ajustes en la propia app.
-- =============================================================

insert into configuracion (id, nombre_negocio, iniciales, usuario_nombre)
  values (1, 'Mi Panel de Ventas', 'MP', 'Yo')
  on conflict (id) do nothing;


-- =============================================================
-- BUCKET DE STORAGE PARA EL LOGO
-- Bucket público llamado `logos`. La app sube el archivo con un nombre
-- único y guarda la URL pública en configuracion.logo_url.
-- =============================================================

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;


-- =============================================================
-- 🔴 BOOTSTRAP · TU USUARIO ADMIN (correo + contraseña)
--
-- Crea tu usuario directamente en auth.users, ya confirmado, y lo marca
-- como admin del panel. NO hace falta pasar por Authentication → Users.
--
-- Reemplazá TU_CORREO_AQUI y TU_CONTRASENA_AQUI (entre las comillas
-- simples). Contraseña: mínimo 12 caracteres, sin comillas simples.
--
-- Si el correo ya existía en auth.users (por ejemplo lo creaste a mano
-- antes), no lo duplica ni le cambia la contraseña: solo lo marca admin.
-- Después de correrlo podés borrar esta query del historial del SQL
-- Editor para no dejar la contraseña escrita ahí.
-- =============================================================

do $$
declare
  v_correo   text := 'TU_CORREO_AQUI';
  v_password text := 'TU_CONTRASENA_AQUI';
  v_id       uuid;
begin
  select id into v_id from auth.users where email = v_correo limit 1;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_correo, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
  end if;

  if not exists (select 1 from auth.identities where user_id = v_id and provider = 'email') then
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_correo, 'email_verified', true),
      'email', now(), now(), now());
  end if;

  insert into usuarios (auth_user_id, persona_id, rol)
    values (v_id, null, 'admin')
    on conflict (auth_user_id) do nothing;
end $$;


-- =============================================================
-- COMPROBACIÓN FINAL
-- Esperado (en orden): 1, 1, 1, 1, 1, 1, 1, 1, ≥1, 1
-- Si algún número da 0, algo faltó y hay que revisar la parte
-- correspondiente antes de seguir a Vercel.
-- =============================================================

select
  (select count(*) from information_schema.tables  where table_schema='public' and table_name='configuracion')                            as configuracion_ok,
  (select count(*) from information_schema.tables  where table_schema='public' and table_name='personas')                                 as personas_ok,
  (select count(*) from information_schema.tables  where table_schema='public' and table_name='gastos')                                   as gastos_ok,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='configuracion' and column_name='logo_url') as logo_url_ok,
  (select count(*) from information_schema.tables  where table_schema='public' and table_name='usuarios')                                 as usuarios_ok,
  (select count(*) from information_schema.tables  where table_schema='public' and table_name='llamadas')                                 as llamadas_ok,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='llamadas' and column_name='lead_nombre')   as lead_nombre_ok,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='llamadas' and column_name='origen_lead')   as origen_lead_ok,
  (select count(*) from usuarios where rol='admin')                                                                                       as admins_registrados,
  (select count(*) from storage.buckets where id='logos' and public = true)                                                                as bucket_logos_ok;
