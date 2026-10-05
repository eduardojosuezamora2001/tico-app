-- Ubicación administrativa solo vía addresses.administrative_division_id (internacional).

create or replace function private.division_is_under(division_id uuid, ancestor_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    division_id is not null
    and ancestor_id is not null
    and exists (
      with recursive walk as (
        select d.id, d.parent_id
        from public.administrative_divisions d
        where d.id = division_id
        union all
        select p.id, p.parent_id
        from public.administrative_divisions p
        join walk w on p.id = w.parent_id
      )
      select 1
      from walk
      where walk.id = ancestor_id
    );
$$;

-- Asegurar address_id antes de quitar columnas legadas.
do $$
declare
  rec record;
  addr_id uuid;
  div_id uuid;
  cr_country constant uuid := 'c1111111-1111-4111-8111-111111111111';
begin
  for rec in
    select b.*
    from public.businesses b
    where b.address_id is null
      and (
        b.province is not null
        or b.canton is not null
        or b.district is not null
        or b.address is not null
        or b.latitude is not null
      )
  loop
    div_id := null;

    if rec.district is not null and rec.canton is not null and rec.province is not null then
      select d.id into div_id
      from public.administrative_divisions p
      join public.administrative_divisions c on c.parent_id = p.id and c.name = rec.canton
      join public.administrative_divisions d on d.parent_id = c.id and d.name = rec.district
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    if div_id is null and rec.canton is not null and rec.province is not null then
      select c.id into div_id
      from public.administrative_divisions p
      join public.administrative_divisions c on c.parent_id = p.id and c.name = rec.canton
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    if div_id is null and rec.province is not null then
      select p.id into div_id
      from public.administrative_divisions p
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    insert into public.addresses (
      country_id,
      administrative_division_id,
      address_line_1,
      latitude,
      longitude,
      formatted_address
    )
    values (
      cr_country,
      div_id,
      coalesce(nullif(trim(rec.address), ''), 'Sin dirección'),
      rec.latitude,
      rec.longitude,
      rec.address
    )
    returning id into addr_id;

    update public.businesses
    set address_id = addr_id
    where id = rec.id;
  end loop;
end $$;

drop function if exists public.discover_businesses_v2(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[], text, text
);

create function public.discover_businesses_v2(
  q text default null,
  marketplace_tag_slugs text[] default null,
  categories text[] default null,
  lat double precision default null,
  lng double precision default null,
  radius_km numeric default 10,
  lim integer default 20,
  cursor_distance double precision default null,
  cursor_name text default null,
  cursor_id uuid default null,
  administrative_division_ids uuid[] default null,
  catalog_kind text default null,
  catalog_label text default null
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
  distance_m double precision,
  matches jsonb
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
        when discover_businesses_v2.lat is not null
          and discover_businesses_v2.lng is not null
          and coalesce(addr.location, b.location) is not null
        then extensions.st_distance(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(
            extensions.st_makepoint(discover_businesses_v2.lng, discover_businesses_v2.lat),
            4326
          )::extensions.geography
        )
        else null::double precision
      end as distance_m
    from public.businesses b
    left join public.addresses addr on addr.id = b.address_id
    where b.is_active
      and not b.is_draft
      and (
        discover_businesses_v2.categories is null
        or cardinality(discover_businesses_v2.categories) = 0
        or b.category = any (discover_businesses_v2.categories)
      )
      and (
        discover_businesses_v2.marketplace_tag_slugs is null
        or cardinality(discover_businesses_v2.marketplace_tag_slugs) = 0
        or exists (
          select 1
          from public.business_catalog_search s
          where s.business_id = b.id
            and s.item_type = 'product'
            and s.tag_slugs && discover_businesses_v2.marketplace_tag_slugs
        )
      )
      and (
        discover_businesses_v2.catalog_kind is null
        or btrim(coalesce(discover_businesses_v2.catalog_label, '')) = ''
        or exists (
          select 1
          from public.business_catalog_search s
          where s.business_id = b.id
            and s.item_type = discover_businesses_v2.catalog_kind
            and lower(btrim(s.name)) = lower(btrim(discover_businesses_v2.catalog_label))
        )
      )
      and (
        discover_businesses_v2.q is null
        or btrim(discover_businesses_v2.q) = ''
        or b.name ilike '%' || discover_businesses_v2.q || '%'
        or b.category ilike '%' || discover_businesses_v2.q || '%'
        or exists (
          select 1
          from public.business_catalog_search s
          where s.business_id = b.id
            and s.search_vector @@ plainto_tsquery('simple', discover_businesses_v2.q)
        )
        or exists (
          select 1
          from public.catalog_tags ct
          inner join public.catalog_tag_synonyms syn on syn.tag_id = ct.id
          where ct.scope = 'marketplace'
            and ct.is_active
            and syn.term ilike '%' || discover_businesses_v2.q || '%'
            and exists (
              select 1
              from public.business_catalog_search s
              where s.business_id = b.id
                and s.item_type = 'product'
                and ct.slug = any (s.tag_slugs)
            )
        )
      )
      and (
        discover_businesses_v2.lat is null
        or discover_businesses_v2.lng is null
        or coalesce(addr.location, b.location) is null
        or extensions.st_dwithin(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(
            extensions.st_makepoint(discover_businesses_v2.lng, discover_businesses_v2.lat),
            4326
          )::extensions.geography,
          least(discover_businesses_v2.radius_km, 50) * 1000
        )
      )
      and (
        discover_businesses_v2.administrative_division_ids is null
        or cardinality(discover_businesses_v2.administrative_division_ids) = 0
        or exists (
          select 1
          from unnest(discover_businesses_v2.administrative_division_ids) as picked(id)
          where private.division_is_under(addr.administrative_division_id, picked.id)
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
    located.distance_m,
    private.discover_business_matches(located.id, discover_businesses_v2.q) as matches
  from located
  where discover_businesses_v2.cursor_id is null
    or (
      discover_businesses_v2.lat is null
      and (located.name, located.id) > (discover_businesses_v2.cursor_name, discover_businesses_v2.cursor_id)
    )
    or (
      discover_businesses_v2.lat is not null
      and (
        (
          located.distance_m is not null
          and discover_businesses_v2.cursor_distance is not null
          and (located.distance_m, located.name, located.id)
            > (
              discover_businesses_v2.cursor_distance,
              discover_businesses_v2.cursor_name,
              discover_businesses_v2.cursor_id
            )
        )
        or (located.distance_m is null and discover_businesses_v2.cursor_distance is not null)
        or (
          located.distance_m is null
          and discover_businesses_v2.cursor_distance is null
          and (located.name, located.id) > (discover_businesses_v2.cursor_name, discover_businesses_v2.cursor_id)
        )
      )
    )
  order by
    located.distance_m nulls last,
    located.name,
    located.id
  limit least(discover_businesses_v2.lim, 51);
$$;

revoke all on function public.discover_businesses_v2(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, uuid[], text, text
) from public;
grant execute on function public.discover_businesses_v2(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, uuid[], text, text
) to anon, authenticated, service_role;

drop function if exists public.search_businesses(
  text, text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[]
);

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
  administrative_division_ids uuid[] default null
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
      end as distance_m
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
        search_businesses.administrative_division_ids is null
        or cardinality(search_businesses.administrative_division_ids) = 0
        or exists (
          select 1
          from unnest(search_businesses.administrative_division_ids) as picked(id)
          where private.division_is_under(addr.administrative_division_id, picked.id)
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

revoke all on function public.search_businesses(
  text, text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, uuid[]
) from public;
grant execute on function public.search_businesses(
  text, text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, uuid[]
) to anon, authenticated, service_role;

alter table public.businesses
  drop column if exists province,
  drop column if exists canton,
  drop column if exists district;

grant update (
  name, description, category, latitude, longitude, address,
  whatsapp_number, website, email, phone, logo_url, banner_url,
  is_active, chat_retention_days, tagline,
  facebook_url, instagram_url, tiktok_url, offers_delivery, delivery_cost,
  delivery_radius_km, is_draft, payment_cash, payment_card, payment_sinpe,
  payment_iban, sinpe_phone, sinpe_holder, iban, address_id
) on public.businesses to authenticated;
