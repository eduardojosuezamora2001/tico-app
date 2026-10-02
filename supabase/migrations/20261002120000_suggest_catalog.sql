-- Sugerencias del buscador global y filtro estricto de locales por oferta.

create or replace function public.suggest_catalog(
  q text,
  lim integer default 8
)
returns table (
  kind text,
  id uuid,
  label text,
  hint text
)
language sql
stable
security definer
set search_path = ''
as $$
  with scored as (
    select
      'business'::text as kind,
      b.id,
      b.name as label,
      coalesce(b.category, 'Local') as hint,
      greatest(
        case when b.name ilike suggest_catalog.q || '%' then 1::real else 0 end,
        case when b.name ilike '%' || suggest_catalog.q || '%' then 0.9 else 0 end,
        extensions.similarity(b.name, suggest_catalog.q)
      ) as score
    from public.businesses b
    where b.is_active
      and not b.is_draft
      and char_length(btrim(suggest_catalog.q)) >= 2
      and (
        b.name ilike '%' || suggest_catalog.q || '%'
        or extensions.similarity(b.name, suggest_catalog.q) > 0.35
      )
    union all
    select kind, id, label, hint, score
    from (
      select distinct on (lower(btrim(p.name)))
        'product'::text as kind,
        p.id,
        p.name as label,
        'Producto'::text as hint,
        greatest(
          case when p.name ilike suggest_catalog.q || '%' then 1::real else 0 end,
          case when p.name ilike '%' || suggest_catalog.q || '%' then 0.92 else 0 end,
          case when p.search_vector @@ plainto_tsquery('simple', suggest_catalog.q) then 0.8 else 0 end,
          extensions.similarity(p.name, suggest_catalog.q)
        ) as score
      from public.products p
      inner join public.businesses b on b.id = p.business_id
      where p.is_available
        and b.is_active
        and not b.is_draft
        and char_length(btrim(suggest_catalog.q)) >= 2
        and (
          p.name ilike '%' || suggest_catalog.q || '%'
          or p.search_vector @@ plainto_tsquery('simple', suggest_catalog.q)
          or extensions.similarity(p.name, suggest_catalog.q) > 0.35
        )
      order by lower(btrim(p.name)), score desc
    ) products
    union all
    select kind, id, label, hint, score
    from (
      select distinct on (lower(btrim(s.name)))
        'service'::text as kind,
        s.id,
        s.name as label,
        'Servicio'::text as hint,
        greatest(
          case when s.name ilike suggest_catalog.q || '%' then 1::real else 0 end,
          case when s.name ilike '%' || suggest_catalog.q || '%' then 0.92 else 0 end,
          case when s.search_vector @@ plainto_tsquery('simple', suggest_catalog.q) then 0.8 else 0 end,
          extensions.similarity(s.name, suggest_catalog.q)
        ) as score
      from public.services s
      inner join public.businesses b on b.id = s.business_id
      where s.is_active
        and b.is_active
        and not b.is_draft
        and char_length(btrim(suggest_catalog.q)) >= 2
        and exists (
          select 1
          from public.business_modules bm
          where bm.business_id = b.id
            and bm.module_name = 'services'
            and bm.enabled
        )
        and (
          s.name ilike '%' || suggest_catalog.q || '%'
          or s.search_vector @@ plainto_tsquery('simple', suggest_catalog.q)
          or extensions.similarity(s.name, suggest_catalog.q) > 0.35
        )
      order by lower(btrim(s.name)), score desc
    ) services
    union all
    select kind, id, label, hint, score
    from (
      select distinct on (lower(btrim(m.name)))
        'menu'::text as kind,
        m.id,
        m.name as label,
        'Menú'::text as hint,
        greatest(
          case when m.name ilike suggest_catalog.q || '%' then 1::real else 0 end,
          case when m.name ilike '%' || suggest_catalog.q || '%' then 0.92 else 0 end,
          case when m.search_vector @@ plainto_tsquery('simple', suggest_catalog.q) then 0.8 else 0 end,
          extensions.similarity(m.name, suggest_catalog.q)
        ) as score
      from public.menus m
      inner join public.businesses b on b.id = m.business_id
      where m.is_available
        and b.is_active
        and not b.is_draft
        and char_length(btrim(suggest_catalog.q)) >= 2
        and exists (
          select 1
          from public.business_modules bm
          where bm.business_id = b.id
            and bm.module_name = 'menu'
            and bm.enabled
        )
        and (
          m.name ilike '%' || suggest_catalog.q || '%'
          or m.search_vector @@ plainto_tsquery('simple', suggest_catalog.q)
          or extensions.similarity(m.name, suggest_catalog.q) > 0.35
        )
      order by lower(btrim(m.name)), score desc
    ) menus
  )
  select scored.kind, scored.id, scored.label, scored.hint
  from scored
  where scored.score >= 0.35
  order by scored.score desc, scored.label
  limit least(suggest_catalog.lim, 12);
$$;

revoke all on function public.suggest_catalog(text, integer) from public;
grant execute on function public.suggest_catalog(text, integer) to anon, authenticated, service_role;

drop function if exists public.discover_businesses(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[]
);

create function public.discover_businesses(
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
  provinces text[] default null,
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
        when discover_businesses.lat is not null
          and discover_businesses.lng is not null
          and coalesce(addr.location, b.location) is not null
        then extensions.st_distance(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(
            extensions.st_makepoint(discover_businesses.lng, discover_businesses.lat),
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
        discover_businesses.categories is null
        or cardinality(discover_businesses.categories) = 0
        or b.category = any (discover_businesses.categories)
      )
      and (
        discover_businesses.marketplace_tag_slugs is null
        or cardinality(discover_businesses.marketplace_tag_slugs) = 0
        or exists (
          select 1
          from public.products p
          inner join public.product_catalog_tags pct on pct.product_id = p.id
          inner join public.catalog_tags ct on ct.id = pct.tag_id
          where p.business_id = b.id
            and p.is_available
            and ct.scope = 'marketplace'
            and ct.is_active
            and ct.slug = any (discover_businesses.marketplace_tag_slugs)
        )
      )
      and (
        discover_businesses.catalog_kind is null
        or btrim(coalesce(discover_businesses.catalog_label, '')) = ''
        or (
          discover_businesses.catalog_kind = 'product'
          and exists (
            select 1
            from public.products p
            where p.business_id = b.id
              and p.is_available
              and lower(btrim(p.name)) = lower(btrim(discover_businesses.catalog_label))
          )
        )
        or (
          discover_businesses.catalog_kind = 'service'
          and exists (
            select 1
            from public.services s
            where s.business_id = b.id
              and s.is_active
              and lower(btrim(s.name)) = lower(btrim(discover_businesses.catalog_label))
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
          discover_businesses.catalog_kind = 'menu'
          and exists (
            select 1
            from public.menus m
            where m.business_id = b.id
              and m.is_available
              and lower(btrim(m.name)) = lower(btrim(discover_businesses.catalog_label))
              and exists (
                select 1
                from public.business_modules bm
                where bm.business_id = b.id
                  and bm.module_name = 'menu'
                  and bm.enabled
              )
          )
        )
      )
      and (
        discover_businesses.q is null
        or btrim(discover_businesses.q) = ''
        or b.name ilike '%' || discover_businesses.q || '%'
        or b.category ilike '%' || discover_businesses.q || '%'
        or exists (
          select 1
          from public.products p
          where p.business_id = b.id
            and p.is_available
            and (
              p.search_vector @@ plainto_tsquery('simple', discover_businesses.q)
              or p.name ilike '%' || discover_businesses.q || '%'
              or extensions.similarity(p.name, discover_businesses.q) > 0.35
            )
        )
        or exists (
          select 1
          from public.services s
          where s.business_id = b.id
            and s.is_active
            and exists (
              select 1
              from public.business_modules bm
              where bm.business_id = b.id
                and bm.module_name = 'services'
                and bm.enabled
            )
            and (
              s.search_vector @@ plainto_tsquery('simple', discover_businesses.q)
              or s.name ilike '%' || discover_businesses.q || '%'
              or extensions.similarity(s.name, discover_businesses.q) > 0.35
            )
        )
        or exists (
          select 1
          from public.menus m
          where m.business_id = b.id
            and m.is_available
            and exists (
              select 1
              from public.business_modules bm
              where bm.business_id = b.id
                and bm.module_name = 'menu'
                and bm.enabled
            )
            and (
              m.search_vector @@ plainto_tsquery('simple', discover_businesses.q)
              or m.name ilike '%' || discover_businesses.q || '%'
              or extensions.similarity(m.name, discover_businesses.q) > 0.35
            )
        )
        or exists (
          select 1
          from public.catalog_tags ct
          inner join public.catalog_tag_synonyms syn on syn.tag_id = ct.id
          where ct.scope = 'marketplace'
            and ct.is_active
            and syn.term ilike '%' || discover_businesses.q || '%'
            and exists (
              select 1
              from public.products p
              inner join public.product_catalog_tags pct on pct.product_id = p.id
              where p.business_id = b.id
                and p.is_available
                and pct.tag_id = ct.id
            )
        )
      )
      and (
        discover_businesses.lat is null
        or discover_businesses.lng is null
        or coalesce(addr.location, b.location) is null
        or extensions.st_dwithin(
          coalesce(addr.location, b.location),
          extensions.st_setsrid(
            extensions.st_makepoint(discover_businesses.lng, discover_businesses.lat),
            4326
          )::extensions.geography,
          least(discover_businesses.radius_km, 50) * 1000
        )
      )
      and (
        discover_businesses.provinces is null
        or cardinality(discover_businesses.provinces) = 0
        or coalesce(
          private.root_division_name(addr.administrative_division_id),
          b.province
        ) = any (discover_businesses.provinces)
        or exists (
          select 1
          from unnest(discover_businesses.provinces) as picked(name)
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
    located.distance_m,
    private.discover_business_matches(located.id, discover_businesses.q) as matches
  from located
  where discover_businesses.cursor_id is null
    or (
      discover_businesses.lat is null
      and (located.name, located.id) > (discover_businesses.cursor_name, discover_businesses.cursor_id)
    )
    or (
      discover_businesses.lat is not null
      and (
        (
          located.distance_m is not null
          and discover_businesses.cursor_distance is not null
          and (located.distance_m, located.name, located.id)
            > (
              discover_businesses.cursor_distance,
              discover_businesses.cursor_name,
              discover_businesses.cursor_id
            )
        )
        or (located.distance_m is null and discover_businesses.cursor_distance is not null)
        or (
          located.distance_m is null
          and discover_businesses.cursor_distance is null
          and (located.name, located.id) > (discover_businesses.cursor_name, discover_businesses.cursor_id)
        )
      )
    )
  order by
    located.distance_m nulls last,
    located.name,
    located.id
  limit least(discover_businesses.lim, 51);
$$;

revoke all on function public.discover_businesses(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[], text, text
) from public;
grant execute on function public.discover_businesses(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[], text, text
) to anon, authenticated, service_role;
