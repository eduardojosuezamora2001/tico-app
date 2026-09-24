-- ============================================================================
-- Plaza de Comercios Digital - Migracion 1/4
-- Extensiones y schema `private` (helpers no expuestos por la Data API).
-- ============================================================================

-- PostGIS para geolocalizacion de negocios (busqueda por radio, PDF seccion 11).
create extension if not exists postgis with schema extensions;

-- Schema privado: funciones de apoyo para triggers y politicas RLS.
-- No esta en la lista de schemas expuestos por PostgREST (ver supabase/config.toml).
create schema if not exists private;

grant usage on schema private to anon, authenticated, service_role;
-- El servicio de Auth ejecuta el trigger `handle_new_user` (migracion 2).
grant usage on schema private to supabase_auth_admin;

-- ----------------------------------------------------------------------------
-- Trigger generico: mantiene `updated_at` al dia.
-- ----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function private.set_updated_at() is
  'Trigger BEFORE UPDATE: fija updated_at = now().';
