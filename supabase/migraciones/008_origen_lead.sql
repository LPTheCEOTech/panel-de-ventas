-- ============================================================
-- Panel de Ventas · migración 008 · ORIGEN DEL LEAD por llamada
--
-- Post Llamada v2 gana un campo obligatorio: de dónde vino el lead
-- (Orgánico / Anuncios / Referidos). Sin eso, el dueño del panel no
-- puede decidir dónde invertir el próximo dólar de ads.
--
-- 🔴 NOT NULL DEFAULT '': las filas viejas (pre-migración) se rellenan
-- con string vacío al aplicar el ALTER — no rompe contra una BD con
-- datos ya cargados. El front pinta '' como pill omitida y al editar
-- la fila obliga a elegir uno. La validación semántica (uno de los 3)
-- vive en Zod; el CHECK acá solo acota el dominio permitido.
--
-- 🔴 El '' queda permitido en el CHECK como estado transitorio. Cuando
-- se decida sacarlo (backfill manual + drop constraint + re-add), es
-- una migración aparte.
--
-- Idempotente: `add column if not exists` + CHECK con guard `DO $$`.
-- ============================================================

alter table llamadas
  add column if not exists origen_lead text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'llamadas_origen_lead_valido'
  ) then
    alter table llamadas
      add constraint llamadas_origen_lead_valido
      check (origen_lead in ('', 'organico', 'anuncios', 'referidos'));
  end if;
end $$;
