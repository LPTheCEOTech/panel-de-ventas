-- ============================================================
-- Panel de Ventas · migración 004 · LOGO
--
-- Una sola columna: la URL pública del logo del negocio. `null` cuando no
-- hay logo cargado (el topbar cae a `.brand-tile` con las iniciales).
--
-- 🔴 El archivo NO vive en la base: vive en Storage, bucket `logos` público.
-- La base solo guarda el puntero. Guardar el archivo como base64 acá hincharía
-- la fila y rompería el patrón de todos los otros valores.
--
-- 🔴 Idempotente: `add column if not exists`.
-- ============================================================

alter table configuracion
  add column if not exists logo_url text null;
