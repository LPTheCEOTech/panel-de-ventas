-- ============================================================
-- Panel de Ventas · migración 009 · AGENDAS CALIFICADAS
--
-- El setter carga al final del día, al lado de Agendas, cuántas de esas
-- agendas fueron calificadas (las que se quedan en el calendario). El panel
-- saca de ahí la tasa de calificación, el escalón Calificadas del embudo y
-- el ranking de setters por calificadas.
--
-- 🔴 NULL, sin default: NULL = ese día no se midió. Las filas de antes
-- quedan en NULL y no tiran la tasa a 0%. Un DEFAULT 0 diría «agendó 8 y
-- ninguna servía».
--
-- 🔴 Sin check contra `agendas`: el esquema no tiene checks entre columnas
-- a propósito. La regla «nunca más que las agendas» vive en Zod y en el form.
--
-- Es la primera que llega por el botón «Actualizar ahora» (MIGRACIONES en
-- `src/shared/datos/migraciones.ts`, con el mismo SQL). Idempotente.
-- ============================================================

alter table reportes_setter
  add column if not exists calificadas int null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reportes_setter_calificadas_no_negativas'
  ) then
    alter table reportes_setter
      add constraint reportes_setter_calificadas_no_negativas
      check (calificadas >= 0);
  end if;
end $$;

-- PostgREST guarda el esquema en caché: sin esto, la columna nueva podría no
-- verse hasta que se recargue solo.
notify pgrst, 'reload schema';
