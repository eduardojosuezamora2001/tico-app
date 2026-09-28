-- Filtro por división raíz usando addresses cuando exista address_id.

create or replace function private.root_division_name(division_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  with recursive tree as (
    select d.id, d.parent_id, d.name
    from public.administrative_divisions d
    where d.id = division_id
    union all
    select p.id, p.parent_id, p.name
    from public.administrative_divisions p
    join tree t on p.id = t.parent_id
  )
  select tree.name
  from tree
  where tree.parent_id is null
  limit 1;
$$;

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
      coalesce(addr.formatted_address, addr.address_line_1, b.address) as address,
      b.whatsapp_number,
      b.logo_url,
      b.banner_url,
      coalesce(addr.latitude, b.latitude) as latitude,
      coalesce(addr.longitude, b.longitude) as longitude,
      case
        when search_businesses.lat is not null
          and search_businesses.lng is not null
          and coalesce(addr.location, b.location) is not null
        then extensions.st_distance(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(extensions.st_makepoint(search_businesses.lng, search_businesses.lat), 4326)::extensions.geography
        )
        else null::double precision
      end as distance_m,
      coalesce(
        private.root_division_name(addr.administrative_division_id),
        b.province
      ) as root_division
    from public.businesses b
    left join public.addresses addr on addr.id = b.address_id
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
        or coalesce(addr.location, b.location) is null
        or extensions.st_dwithin(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(extensions.st_makepoint(search_businesses.lng, search_businesses.lat), 4326)::extensions.geography,
          least(search_businesses.radius_km, 50) * 1000
        )
      )
      and (
        search_businesses.provinces is null
        or cardinality(search_businesses.provinces) = 0
        or coalesce(
          private.root_division_name(addr.administrative_division_id),
          b.province
        ) = any (search_businesses.provinces)
        or exists (
          select 1
          from unnest(search_businesses.provinces) as picked(name)
          where coalesce(
            private.root_division_name(addr.administrative_division_id),
            b.province
          ) ilike picked.name
        )
      )
  )
  select
    located.id,
    located.slug,
    located.name,
    located.description,
    located.category,
    located.address,
    located.whatsapp_number,
    located.logo_url,
    located.banner_url,
    located.latitude,
    located.longitude,
    located.distance_m
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

revoke all on function public.search_businesses(text, text[], double precision, double precision, numeric, integer, double precision, text, uuid, text[]) from public;
grant execute on function public.search_businesses(text, text[], double precision, double precision, numeric, integer, double precision, text, uuid, text[]) to anon, authenticated, service_role;
