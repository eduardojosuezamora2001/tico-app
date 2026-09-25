-- Fase 2: slug publico, busqueda de negocios y bucket de imagenes.

create or replace function private.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(input, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

revoke all on function private.slugify(text) from public, anon, authenticated;

alter table public.businesses add column slug text;

create or replace function private.set_business_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' and new.name is not distinct from old.name and new.slug is not null then
    return new;
  end if;

  base := private.slugify(new.name);
  if base = '' then
    base := 'negocio';
  end if;
  candidate := base;

  while exists (
    select 1 from public.businesses where slug = candidate and id is distinct from new.id
  ) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

revoke all on function private.set_business_slug() from public, anon, authenticated;

create trigger set_business_slug
  before insert or update of name on public.businesses
  for each row execute function private.set_business_slug();

update public.businesses set name = name;

alter table public.businesses alter column slug set not null;
create unique index businesses_slug_idx on public.businesses (slug);

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
      when lat is not null and lng is not null and b.location is not null then
        extensions.st_distance(
          b.location,
          extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
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
      lat is null
      or lng is null
      or b.location is null
      or extensions.st_dwithin(
        b.location,
        extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
        least(radius_km, 50) * 1000
      )
    )
    and (cursor is null or b.id > cursor)
  order by distance_m nulls last, b.name
  limit least(lim, 50);
$$;

revoke all on function public.search_businesses(text, text, double precision, double precision, numeric, integer, uuid) from public;
grant execute on function public.search_businesses(text, text, double precision, double precision, numeric, integer, uuid) to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media',
  'business-media',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business-media public read" on storage.objects;
create policy "business-media public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'business-media');
