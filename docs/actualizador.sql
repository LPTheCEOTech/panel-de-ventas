-- ================================================================
-- Panel de Ventas · INSTALAR EL ACTUALIZADOR
--
-- Para los paneles instalados ANTES del 23 de septiembre de 2026. Esas
-- bases no tienen el botón «Actualizar ahora» y el panel les dice que
-- escriban a soporte. Soporte les manda ESTE archivo.
--
-- Qué hace: instala la función que usa el botón para aplicar las mejoras.
-- Nada más. No crea usuarios, no toca datos, no tiene nada que reemplazar.
-- Se puede correr dos veces sin problema.
--
-- Después de correrlo: entrar al panel, apretar «Actualizar ahora» en la
-- barra de arriba, y listo.
--
-- 🔴 NO mandar `todo-en-uno.sql` en su lugar: si nadie reemplaza los
-- placeholders, crea un admin con una contraseña escrita en el archivo.
-- ================================================================

create table if not exists migraciones_aplicadas (
  id          text        primary key,
  aplicada_en timestamptz not null default now()
);
alter table migraciones_aplicadas enable row level security;
grant select, insert on migraciones_aplicadas to service_role;
revoke all on migraciones_aplicadas from anon, authenticated;

create or replace function aplicar_migracion(id_migracion text, sql_migracion text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $fn$
begin
  if exists (select 1 from migraciones_aplicadas where id = id_migracion) then
    return 'ya-aplicada';
  end if;
  execute sql_migracion;
  insert into migraciones_aplicadas (id) values (id_migracion);
  return 'aplicada';
end;
$fn$;

revoke all on function aplicar_migracion(text, text) from public;
revoke all on function aplicar_migracion(text, text) from anon, authenticated;
grant execute on function aplicar_migracion(text, text) to service_role;

-- Esperado: 1 y 1. Si da eso, ya puede apretar el botón en el panel.
select
  (select count(*) from information_schema.tables   where table_schema='public' and table_name='migraciones_aplicadas') as tabla_ok,
  (select count(*) from information_schema.routines where routine_schema='public' and routine_name='aplicar_migracion')    as actualizador_ok;
