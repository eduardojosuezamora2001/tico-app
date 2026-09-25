-- Category and province filters accept several values. Empty or null means no filter.

drop function if exists public.search_businesses(text, text, double precision, double precision, numeric, integer, double precision, text, uuid, text);

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
security invoker
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
          and b.location is not null then
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
        or exists (
          select 1
          from unnest(search_businesses.provinces) as picked(name)
          where b.address ilike any (
            case picked.name
              when 'San José' then array['%san jos%', '%escaz%', '%desamparados%', '%curridabat%']
              when 'Alajuela' then array['%alajuela%']
              when 'Cartago' then array['%cartago%']
              when 'Heredia' then array['%heredia%']
              when 'Guanacaste' then array['%guanacaste%', '%liberia%', '%santa cruz%']
              when 'Puntarenas' then array['%puntarenas%', '%esparza%', '%quepos%']
              when 'Limón' then array['%limon%', '%limón%']
              else array['%' || picked.name || '%']
            end
          )
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
  order by located.distance_m nulls last, located.name, located.id
  limit least(search_businesses.lim, 51);
$$;

revoke all on function public.search_businesses(text, text[], double precision, double precision, numeric, integer, double precision, text, uuid, text[]) from public;
grant execute on function public.search_businesses(text, text[], double precision, double precision, numeric, integer, double precision, text, uuid, text[]) to anon, authenticated, service_role;
