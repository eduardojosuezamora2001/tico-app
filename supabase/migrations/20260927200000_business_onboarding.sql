-- Campos adicionales para publicar un negocio (wizard / borrador).
alter table public.businesses
  add column if not exists tagline text,
  add column if not exists province text,
  add column if not exists canton text,
  add column if not exists district text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists offers_delivery boolean not null default false,
  add column if not exists delivery_cost numeric(12, 2)
    check (delivery_cost is null or delivery_cost >= 0),
  add column if not exists delivery_radius_km numeric(6, 2)
    check (delivery_radius_km is null or delivery_radius_km > 0),
  add column if not exists is_draft boolean not null default false,
  add column if not exists payment_cash boolean not null default false,
  add column if not exists payment_card boolean not null default false,
  add column if not exists payment_sinpe boolean not null default false,
  add column if not exists payment_iban boolean not null default false,
  add column if not exists sinpe_phone text,
  add column if not exists sinpe_holder text,
  add column if not exists iban text;

comment on column public.businesses.is_draft is
  'Borrador del wizard de publicacion. No aparece en busqueda ni ficha publica hasta publicar.';

-- Co-dueños: un owner existente puede agregar otro owner con el mismo nivel.
create policy "business_users: owners can add co-owners"
  on public.business_users for insert
  to authenticated
  with check (
    role = 'owner'
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_users.business_id
        and bu.user_id = (select auth.uid())
        and bu.role = 'owner'
        and coalesce(bu.is_active, true)
    )
  );

-- Al agregar co-dueño, promover rol global si aplica.
create or replace function private.handle_business_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unknown_permission text;
begin
  select p
    into unknown_permission
    from unnest(new.permissions) as p
    where not exists (select 1 from public.permissions perm where perm.name = p)
    limit 1;

  if unknown_permission is not null then
    raise exception 'Permiso desconocido: %', unknown_permission
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and new.role = 'owner' then
    update public.users
      set role = 'business_owner'
      where id = new.user_id
        and role in ('client', 'business_employee');
  elsif tg_op = 'INSERT' and new.role <> 'owner' then
    update public.users
      set role = 'business_employee'
      where id = new.user_id
        and role = 'client';
  end if;

  return new;
end;
$$;

-- Excluir borradores de la busqueda publica.
create or replace function public.search_businesses(
  q text default null,
  categories text[] default null,
  lat double precision default null,
  lng double precision default null,
  radius_km numeric default 10,
  lim integer default 20,
  cursor_distance double precision default null,
  cursor_name text default null,
  cursor_id uuid default null,
  provinces text[] default null
)
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  category text,
  address text,
  whatsapp_number text,
  logo_url text,
  banner_url text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  with located as (
    select
      b.id,
      b.slug,
      b.name,
      b.description,
      b.category,
      b.address,
      b.whatsapp_number,
      b.logo_url,
      b.banner_url,
      b.latitude,
      b.longitude,
      case
        when search_businesses.lat is not null
          and search_businesses.lng is not null
          and b.location is not null
          then extensions.st_distance(
            b.location,
            extensions.st_setsrid(extensions.st_makepoint(search_businesses.lng, search_businesses.lat), 4326)::extensions.geography
          )
        else null
      end as distance_m
    from public.businesses b
    where b.is_active
      and not b.is_draft
      and (
        search_businesses.q is null
        or b.name ilike '%' || search_businesses.q || '%'
        or b.category ilike '%' || search_businesses.q || '%'
      )
      and (
        search_businesses.categories is null
        or cardinality(search_businesses.categories) = 0
        or b.category = any (search_businesses.categories)
      )
      and (
        search_businesses.lat is null
        or search_businesses.lng is null
        or b.location is null
        or extensions.st_dwithin(
          b.location,
          extensions.st_setsrid(extensions.st_makepoint(search_businesses.lng, search_businesses.lat), 4326)::extensions.geography,
          least(search_businesses.radius_km, 50) * 1000
        )
      )
      and (
        search_businesses.provinces is null
        or cardinality(search_businesses.provinces) = 0
        or b.province = any (search_businesses.provinces)
        or (
          b.address is not null
          and exists (
            select 1
            from unnest(search_businesses.provinces) as picked(name)
            where b.address ilike '%' || picked.name || '%'
          )
        )
      )
  )
  select *
  from located
  where search_businesses.cursor_id is null
    or (
      search_businesses.lat is null
      and (located.name, located.id) > (search_businesses.cursor_name, search_businesses.cursor_id)
    )
    or (
      search_businesses.lat is not null
      and (
        (
          located.distance_m is not null
          and search_businesses.cursor_distance is not null
          and (located.distance_m, located.name, located.id)
            > (search_businesses.cursor_distance, search_businesses.cursor_name, search_businesses.cursor_id)
        )
        or (located.distance_m is null and search_businesses.cursor_distance is not null)
        or (
          located.distance_m is null
          and search_businesses.cursor_distance is null
          and (located.name, located.id) > (search_businesses.cursor_name, search_businesses.cursor_id)
        )
      )
    )
  order by
    located.distance_m nulls last,
    located.name,
    located.id
  limit least(search_businesses.lim, 51);
$$;
