-- ============================================================
-- Panel de Ventas · migración 007 · NOMBRE DEL LEAD por llamada
--
-- Post Llamada gana un campo obligatorio: quién atendió esa llamada. Sin
-- eso, la lista del día muestra `#1 #2 #3` y el closer no distingue una
-- fila de otra a las 6 de la tarde para editar.
--
-- 🔴 NOT NULL DEFAULT '': las filas viejas se rellenan con string vacío,
-- no rompe el ALTER contra una BD con datos reales. El front pinta '' como
-- «(sin nombre)» al editarlas y el Zod exige >= 2 chars al crear nuevas.
-- La validación semántica vive en Zod, NO en la BD (un CHECK rechazando ''
-- rompería las filas viejas de un solo golpe).
--
-- 🔴 Chequeo blando de largo: char_length <= 200. Es un tope de cordura,
-- no una validación de negocio.
--
-- Idempotente: `add column if not exists`.
-- ============================================================

alter table llamadas
  add column if not exists lead_nombre text not null default '';

-- El constraint necesita DO $$ ... $$ para ser idempotente en Postgres,
-- porque add constraint if not exists no acepta CHECK con nombre en algunas
-- versiones. Igual: create if not exists via catálogo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'llamadas_lead_nombre_len'
  ) then
    alter table llamadas
      add constraint llamadas_lead_nombre_len
      check (char_length(lead_nombre) <= 200);
  end if;
end $$;
