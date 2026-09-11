-- ============================================================
-- Panel de Ventas · migración 005 · USUARIOS (multiusuario + roles)
--
-- La app deja de ser mono-usuario. Cada persona del equipo se loguea con su
-- propio correo, la app sabe QUIÉN es (a qué fila de `personas` está ligado)
-- y QUÉ ROL tiene (`admin` o `miembro`).
--
-- 🔴 auth_user_id es la PK: no hay una segunda superficie donde identificar
-- a un usuario. `auth.users` ya es autoridad.
-- 🔴 persona_id NULL para el admin: el admin no es un vendedor, no figura en
-- `personas`. Si alguna vez quisiera aparecer también como closer/setter, se
-- le crea una `Persona` y se la vincula.
-- 🔴 Índice único parcial: una persona no puede tener dos logins. Dos admins
-- con null sí pueden.
-- 🔴 on delete restrict en persona_id: la persona no se puede borrar (ya es
-- baja lógica), pero además no queremos borrarla accidentalmente si tiene
-- login vinculado.
-- 🔴 on delete cascade en auth_user_id: si se borra el usuario de auth, la
-- fila `usuarios` se va también (no dejamos huérfanos que apunten a nadie).
--
-- Idempotente: `create table if not exists`.
-- ============================================================

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
