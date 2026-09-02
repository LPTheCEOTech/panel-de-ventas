-- ============================================================
-- PERMISOS — explícitos, no heredados.
--
-- 🔴 Las tablas creadas por conexión directa como `postgres` NO heredan los
-- GRANT que Supabase da por defecto a sus roles. Resultado: la app falla con
-- "permission denied for table personas" AUNQUE use service_role, y el error
-- no dice nada de permisos por defecto. Ya nos pasó en la app de anuncios.
--
-- Se otorga SOLO a service_role. A `anon` y `authenticated` nada: la anon key
-- vive en el navegador y ahí no puede poder tocar la base.
-- ============================================================
grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- lo que se cree de acá en adelante nace con el mismo permiso
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

revoke all on all tables in schema public from anon, authenticated;
