-- El argumento category chocaba con businesses.category y el filtro no aplicaba.

create or replace function public.search_businesses(
  q text default null,
  category text default null,
  lat double precision default null,
  lng double precision default null,
  radius_km numeric default 10,
  lim integer default 20,
  cursor uuid default null
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
security invoker
set search_path = ''
as $$
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
      when search_businesses.lat is not null and search_businesses.lng is not null and b.location is not null then
        extensions.st_distance(
          b.location,
          extensions.st_setsrid(extensions.st_makepoint(search_businesses.lng, search_businesses.lat), 4326)::extensions.geography
        )
      else null
    end as distance_m
  from public.businesses b
  where b.is_active
    and (
      search_businesses.q is null
      or b.name ilike '%' || search_businesses.q || '%'
      or b.category ilike '%' || search_businesses.q || '%'
    )
    and (search_businesses.category is null or b.category = search_businesses.category)
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
    and (search_businesses.cursor is null or b.id > search_businesses.cursor)
  order by distance_m nulls last, b.name
  limit least(search_businesses.lim, 50);
$$;
