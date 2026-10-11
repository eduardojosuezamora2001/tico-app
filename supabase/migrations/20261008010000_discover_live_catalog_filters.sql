-- Discovery: tag/catalog_label filters must see live catalog rows, not only the
-- business_catalog_search MV (refreshed every ~15m). Suggestions already read
-- live products, so /buscar was empty for new/updated offers until refresh.

create or replace function public.discover_businesses_v2(
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
          from public.products p
          inner join public.product_catalog_tags pct on pct.product_id = p.id
          inner join public.catalog_tags ct on ct.id = pct.tag_id
          where p.business_id = b.id
            and p.is_available
            and ct.scope = 'marketplace'
            and ct.is_active
            and ct.slug = any (discover_businesses_v2.marketplace_tag_slugs)
        )
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
        or (
          discover_businesses_v2.catalog_kind = 'product'
          and exists (
            select 1
            from public.products p
            where p.business_id = b.id
              and p.is_available
              and lower(btrim(p.name)) = lower(btrim(discover_businesses_v2.catalog_label))
          )
        )
        or (
          discover_businesses_v2.catalog_kind = 'service'
          and exists (
            select 1
            from public.services s
            where s.business_id = b.id
              and s.is_active
              and lower(btrim(s.name)) = lower(btrim(discover_businesses_v2.catalog_label))
              and exists (
                select 1
                from public.business_modules bm
                where bm.business_id = b.id
                  and bm.module_name = 'services'
                  and bm.enabled
              )
          )
        )
        or (
          discover_businesses_v2.catalog_kind = 'menu'
          and exists (
            select 1
            from public.menus m
            where m.business_id = b.id
              and m.is_available
              and lower(btrim(m.name)) = lower(btrim(discover_businesses_v2.catalog_label))
              and exists (
                select 1
                from public.business_modules bm
                where bm.business_id = b.id
                  and bm.module_name = 'menu'
                  and bm.enabled
              )
          )
        )
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
          from public.products p
          where p.business_id = b.id
            and p.is_available
            and (
              p.name ilike '%' || discover_businesses_v2.q || '%'
              or p.search_vector @@ plainto_tsquery('simple', discover_businesses_v2.q)
            )
        )
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
            and (
              exists (
                select 1
                from public.products p
                inner join public.product_catalog_tags pct on pct.product_id = p.id
                where p.business_id = b.id
                  and p.is_available
                  and pct.tag_id = ct.id
              )
              or exists (
                select 1
                from public.business_catalog_search s
                where s.business_id = b.id
                  and s.item_type = 'product'
                  and ct.slug = any (s.tag_slugs)
              )
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
