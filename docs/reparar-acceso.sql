-- ================================================================
-- Panel de Ventas · REPARAR ACCESO
--
-- Para un panel que venía de la versión vieja (la que mandaba correos de
-- invitación) y donde el admin ya no puede entrar: «Correo o contraseña
-- incorrectos» aunque la contraseña esté bien.
--
-- Se corre DESPUÉS de `todo-en-uno.sql`. Ese archivo solo no alcanza: si
-- el admin ya existía, lo marca admin pero NO le cambia la contraseña.
--
-- Qué hace:
--   · Le pone al admin la contraseña nueva, lo confirma y lo desbloquea.
--   · Confirma a todos los que fueron invitados por correo (quedan sin
--     contraseña: el admin se la pone después desde Equipo → Contraseña).
--   · Rellena los campos vacíos (NULL) de auth.users. Con un NULL ahí,
--     Supabase falla al iniciar sesión y el panel lo muestra como
--     «Correo o contraseña incorrectos».
--
-- ================================================================
--   🔴  Reemplaza `TU_CORREO_AQUI` y `TU_CONTRASENA_AQUI` en los DOS
--   lugares donde aparecen (el bloque de arriba y la comprobación final).
--   Sin comillas simples dentro de la contraseña.
-- ================================================================


do $$
declare
  v_correo   text := 'TU_CORREO_AQUI';
  v_password text := 'TU_CONTRASENA_AQUI';
  v_id       uuid;
begin
  select id into v_id from auth.users where lower(trim(email)) = lower(v_correo) limit 1;
  if v_id is null then
    raise exception 'No existe ningún usuario con el correo %', v_correo;
  end if;

  update auth.users set
    email              = lower(v_correo),
    encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
    banned_until       = null,
    deleted_at         = null,
    updated_at         = now()
  where id = v_id;

  if not exists (select 1 from auth.identities where user_id = v_id and provider = 'email') then
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', lower(v_correo), 'email_verified', true),
      'email', now(), now(), now());
  end if;

  insert into usuarios (auth_user_id, persona_id, rol)
    values (v_id, null, 'admin')
    on conflict (auth_user_id) do update set rol = 'admin';
end $$;

-- Todos los usuarios: confirmados y sin campos NULL.
update auth.users set
  email_confirmed_at         = coalesce(email_confirmed_at, now()),
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change               = coalesce(email_change, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '');


-- =============================================================
-- COMPROBACIÓN · tiene que salir UNA fila con todo en true.
-- Si sale todo en true y el login sigue fallando, el panel está
-- conectado a OTRO proyecto de Supabase: comparar
-- NEXT_PUBLIC_SUPABASE_URL de Vercel con el de este proyecto.
-- =============================================================

with datos as (select lower('TU_CORREO_AQUI') as correo, 'TU_CONTRASENA_AQUI'::text as clave)
select
  u.email,
  u.email_confirmed_at is not null                                                         as confirmado,
  u.encrypted_password = extensions.crypt(d.clave, u.encrypted_password)                   as contrasena_ok,
  exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email') as identidad_ok,
  exists (select 1 from usuarios x where x.auth_user_id = u.id and x.rol = 'admin')        as admin_ok
from auth.users u, datos d
where u.email = d.correo;
