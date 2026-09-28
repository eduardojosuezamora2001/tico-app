-- Direcciones internacionales: países, divisiones administrativas y addresses.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 2),
  name text not null,
  native_name text not null,
  phone_code text not null,
  currency_code text not null check (char_length(currency_code) = 3),
  default_language text not null default 'es',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.countries is 'Catálogo de países soportados (ISO 3166-1 alpha-2 en code).';

create trigger set_countries_updated_at
  before update on public.countries
  for each row execute function private.set_updated_at();

create table public.country_administrative_levels (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id) on delete cascade,
  level smallint not null check (level between 1 and 8),
  type text not null,
  label text not null,
  unique (country_id, level)
);

comment on table public.country_administrative_levels is
  'Metadatos de niveles administrativos por país para formularios dinámicos.';

create table public.administrative_divisions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id) on delete cascade,
  parent_id uuid references public.administrative_divisions (id) on delete cascade,
  name text not null,
  type text not null,
  level smallint not null check (level between 1 and 8),
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint administrative_divisions_root_level
    check ((parent_id is null and level = 1) or (parent_id is not null and level > 1))
);

comment on table public.administrative_divisions is
  'Árbol administrativo genérico (provincia, cantón, colonia, etc.) vía parent_id.';

create index administrative_divisions_country_parent_idx
  on public.administrative_divisions (country_id, parent_id);
create index administrative_divisions_country_level_idx
  on public.administrative_divisions (country_id, level);

create trigger set_administrative_divisions_updated_at
  before update on public.administrative_divisions
  for each row execute function private.set_updated_at();

create or replace function private.validate_administrative_division()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_level smallint;
  parent_country uuid;
begin
  if tg_op = 'UPDATE' and new.parent_id = new.id then
    raise exception 'Una división no puede ser su propio padre';
  end if;

  if new.parent_id is not null then
    select d.level, d.country_id
      into parent_level, parent_country
      from public.administrative_divisions d
      where d.id = new.parent_id;

    if parent_country is null then
      raise exception 'División padre inexistente';
    end if;

    if parent_country <> new.country_id then
      raise exception 'La división padre debe pertenecer al mismo país';
    end if;

    if new.level <= parent_level then
      raise exception 'El nivel hijo debe ser mayor que el del padre';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_administrative_division
  before insert or update on public.administrative_divisions
  for each row execute function private.validate_administrative_division();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id),
  administrative_division_id uuid references public.administrative_divisions (id),
  postal_code text,
  address_line_1 text not null check (char_length(trim(address_line_1)) > 0),
  address_line_2 text,
  reference text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  formatted_address text,
  place_id text,
  location extensions.geography(Point, 4326) generated always as (
    case
      when latitude is not null and longitude is not null
        then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      else null
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint addresses_coordinates_pair
    check ((latitude is null) = (longitude is null))
);

comment on table public.addresses is 'Dirección internacional desacoplada de estructuras fijas por país.';

create index addresses_country_idx on public.addresses (country_id);
create index addresses_division_idx on public.addresses (administrative_division_id);
create index addresses_location_idx on public.addresses using gist (location);

create trigger set_addresses_updated_at
  before update on public.addresses
  for each row execute function private.set_updated_at();

alter table public.businesses
  add column if not exists address_id uuid references public.addresses (id) on delete set null;

create index if not exists businesses_address_id_idx on public.businesses (address_id);

-- Sincroniza campos legados del negocio cuando se vincula una dirección.
create or replace function private.sync_business_from_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses b
  set
    latitude = new.latitude,
    longitude = new.longitude,
    address = coalesce(new.formatted_address, new.address_line_1)
  where b.address_id = new.id;
  return new;
end;
$$;

create trigger sync_business_from_address
  after insert or update of latitude, longitude, formatted_address, address_line_1
  on public.addresses
  for each row execute function private.sync_business_from_address();

-- Validar que la división administrativa pertenece al país de la dirección.
create or replace function private.validate_address_division()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.administrative_division_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.administrative_divisions d
    where d.id = new.administrative_division_id
      and d.country_id = new.country_id
  ) then
    raise exception 'La división administrativa no pertenece al país indicado';
  end if;

  return new;
end;
$$;

create trigger validate_address_division
  before insert or update on public.addresses
  for each row execute function private.validate_address_division();

-- RLS: países y divisiones son lectura pública; addresses restringidas a miembros del negocio.
alter table public.countries enable row level security;
alter table public.country_administrative_levels enable row level security;
alter table public.administrative_divisions enable row level security;
alter table public.addresses enable row level security;

create policy "countries: public read"
  on public.countries for select
  to anon, authenticated
  using (is_active);

create policy "country_levels: public read"
  on public.country_administrative_levels for select
  to anon, authenticated
  using (true);

create policy "admin_divisions: public read"
  on public.administrative_divisions for select
  to anon, authenticated
  using (is_active);

create policy "addresses: public read for active businesses"
  on public.addresses for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and b.is_active
        and not b.is_draft
    )
  );

create policy "addresses: members read own business addresses"
  on public.addresses for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and (select private.is_business_member(b.id))
    )
  );

create policy "addresses: authenticated insert"
  on public.addresses for insert
  to authenticated
  with check (true);

create policy "addresses: business:edit can update"
  on public.addresses for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and (select private.has_permission(b.id, 'business:edit'))
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and (select private.has_permission(b.id, 'business:edit'))
    )
  );

create policy "addresses: business:edit can delete"
  on public.addresses for delete
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and (select private.has_permission(b.id, 'business:edit'))
    )
  );

grant update (
  name, description, category, latitude, longitude, address,
  whatsapp_number, website, email, phone, logo_url, banner_url,
  is_active, chat_retention_days, tagline, province, canton, district,
  facebook_url, instagram_url, tiktok_url, offers_delivery, delivery_cost,
  delivery_radius_km, is_draft, payment_cash, payment_card, payment_sinpe,
  payment_iban, sinpe_phone, sinpe_holder, iban, address_id
) on public.businesses to authenticated;

-- Búsqueda por proximidad (radio en metros).
create or replace function public.find_businesses_nearby(
  lat double precision,
  lng double precision,
  radius_m double precision default 5000,
  lim integer default 20
)
returns table (
  id uuid,
  slug text,
  name text,
  category text,
  address text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.slug,
    b.name,
    b.category,
    coalesce(a.formatted_address, a.address_line_1, b.address) as address,
    coalesce(a.latitude, b.latitude) as latitude,
    coalesce(a.longitude, b.longitude) as longitude,
    extensions.st_distance(
      coalesce(
        a.location,
        case
          when b.latitude is not null and b.longitude is not null
            then extensions.st_setsrid(extensions.st_makepoint(b.longitude, b.latitude), 4326)::extensions.geography
          else null
        end
      ),
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
    ) as distance_m
  from public.businesses b
  left join public.addresses a on a.id = b.address_id
  where b.is_active
    and not b.is_draft
    and coalesce(
      a.location,
      case
        when b.latitude is not null and b.longitude is not null
          then extensions.st_setsrid(extensions.st_makepoint(b.longitude, b.latitude), 4326)::extensions.geography
        else null
      end
    ) is not null
    and extensions.st_dwithin(
      coalesce(
        a.location,
        extensions.st_setsrid(extensions.st_makepoint(b.longitude, b.latitude), 4326)::extensions.geography
      ),
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
      least(radius_m, 50000)
    )
  order by distance_m
  limit least(lim, 50);
$$;

revoke all on function public.find_businesses_nearby(double precision, double precision, double precision, integer) from public;
grant execute on function public.find_businesses_nearby(double precision, double precision, double precision, integer) to anon, authenticated, service_role;
