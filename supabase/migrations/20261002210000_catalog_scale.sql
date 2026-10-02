-- Escala de catálogo: índices, vista unificada, MV de búsqueda y RPC v2.
-- No se particiona `products`: el umbral de la spec es ~10–50M filas.
-- Radio de discovery sigue acotado a 50 km (SLA geo de discover_businesses*).

comment on column public.products.category is
  'DEPRECATED: no usar en filtros nuevos. Fuente de verdad: product_catalog_tags. La API solo escribe esta columna si LEGACY_CATEGORY_SYNC=true.';

-- ----------------------------------------------------------------------------
-- Backfill de junction donde category legado no generó tags
-- ----------------------------------------------------------------------------
do $$
declare
  rec record;
  part text;
  tag_slug text;
  mkt_id uuid;
  merch_id uuid;
begin
  for rec in
    select p.id as product_id, p.business_id, p.category
    from public.products p
    where p.category is not null
      and btrim(p.category) <> ''
      and not exists (
        select 1
        from public.product_catalog_tags pct
        where pct.product_id = p.id
      )
  loop
    foreach part in array string_to_array(rec.category, ',')
    loop
      part := btrim(part);
      if part = '' then
        continue;
      end if;

      tag_slug := private.slugify_tag_label(part);
      if tag_slug is null or tag_slug = '' then
        continue;
      end if;

      select id into mkt_id
      from public.catalog_tags
      where scope = 'marketplace' and catalog_tags.slug = tag_slug and is_active
      limit 1;

      if mkt_id is not null then
        insert into public.product_catalog_tags (product_id, tag_id)
        values (rec.product_id, mkt_id)
        on conflict do nothing;
      end if;

      insert into public.catalog_tags (scope, business_id, slug, name)
      select 'merchant', rec.business_id, tag_slug, part
      where not exists (
        select 1
        from public.catalog_tags ct
        where ct.scope = 'merchant'
          and ct.business_id = rec.business_id
          and ct.slug = tag_slug
      );

      select id into merch_id
      from public.catalog_tags
      where scope = 'merchant'
        and business_id = rec.business_id
        and catalog_tags.slug = tag_slug
      limit 1;

      if merch_id is not null then
        insert into public.product_catalog_tags (product_id, tag_id)
        values (rec.product_id, merch_id)
        on conflict do nothing;
      end if;
    end loop;
  end loop;
end;
$$;

-- PK (product_id, tag_id) ya cubre el prefijo product_id. Este índice deja
-- explícito el acceso "tags de este producto" que usa el listado del comercio.
create index if not exists product_catalog_tags_product_id_idx
  on public.product_catalog_tags (product_id);

create index if not exists products_available_business_idx
  on public.products (business_id)
  where is_available;

create index if not exists services_active_business_idx
  on public.services (business_id)
  where is_active;

create index if not exists menus_available_business_idx
  on public.menus (business_id)
  where is_available;

-- ----------------------------------------------------------------------------
-- Lectura unificada del catálogo del comercio (incluye no publicados)
-- ----------------------------------------------------------------------------
create or replace view public.sellable_items
with (security_invoker = true) as
select
  p.business_id,
  'product'::text as item_type,
  p.id as item_id,
  p.name,
  p.description,
  p.price,
  null::text as group_label,
  p.is_available as listed,
  p.search_vector,
  p.updated_at
from public.products p
union all
select
  s.business_id,
  'service'::text,
  s.id,
  s.name,
  s.description,
  s.price,
  s.category,
  s.is_active,
  s.search_vector,
  s.updated_at
from public.services s
union all
select
  m.business_id,
  'menu'::text,
  m.id,
  m.name,
  m.description,
  m.price,
  m.section,
  m.is_available,
  m.search_vector,
  m.updated_at
from public.menus m;

comment on view public.sellable_items is
  'Superficie de lectura de productos, servicios y menú. group_label de producto queda null: las categorías viven en product_catalog_tags.';

revoke all on public.sellable_items from public, anon, authenticated;
grant select on public.sellable_items to service_role;

create or replace function public.list_business_catalog(
  p_business_id uuid,
  lim integer default 50,
  cursor_updated_at timestamptz default null,
  cursor_item_type text default null,
  cursor_item_id uuid default null
)
returns table (
  item_type text,
  item_id uuid,
  name text,
  price numeric,
  group_label text,
  listed boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.item_type,
    s.item_id,
    s.name,
    s.price,
    s.group_label,
    s.listed,
    s.updated_at
  from public.sellable_items s
  where s.business_id = p_business_id
    and (
      cursor_updated_at is null
      or cursor_item_type is null
      or cursor_item_id is null
      or (s.updated_at, s.item_type, s.item_id)
        < (cursor_updated_at, cursor_item_type, cursor_item_id)
    )
  order by s.updated_at desc, s.item_type, s.item_id
  limit least(lim, 100);
$$;

revoke all on function public.list_business_catalog(uuid, integer, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.list_business_catalog(uuid, integer, timestamptz, text, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- MV de búsqueda pesada. REFRESH CONCURRENTLY fuera de esta transacción.
-- ----------------------------------------------------------------------------
create materialized view public.business_catalog_search as
select
  p.business_id,
  'product'::text as item_type,
  p.id as item_id,
  p.name,
  (
    setweight(to_tsvector('simple', coalesce(p.name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(p.description, '')), 'B')
    || setweight(to_tsvector('simple', coalesce((
      select string_agg(v.sku, ' ')
      from public.product_variants v
      where v.product_id = p.id
        and v.sku is not null
        and btrim(v.sku) <> ''
    ), '')), 'C')
  ) as search_vector,
  coalesce((
    select array_agg(ct.slug order by ct.slug)
    from public.product_catalog_tags pct
    join public.catalog_tags ct on ct.id = pct.tag_id
    where pct.product_id = p.id
      and ct.scope = 'marketplace'
      and ct.is_active
  ), '{}'::text[]) as tag_slugs,
  p.price,
  p.updated_at
from public.products p
where p.is_available
union all
select
  s.business_id,
  'service'::text,
  s.id,
  s.name,
  s.search_vector,
  '{}'::text[],
  s.price,
  s.updated_at
from public.services s
where s.is_active
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = s.business_id
      and bm.module_name = 'services'
      and bm.enabled
  )
union all
select
  m.business_id,
  'menu'::text,
  m.id,
  m.name,
  m.search_vector,
  '{}'::text[],
  m.price,
  m.updated_at
from public.menus m
where m.is_available
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = m.business_id
      and bm.module_name = 'menu'
      and bm.enabled
  );

create unique index business_catalog_search_item_uidx
  on public.business_catalog_search (item_type, item_id);

create index business_catalog_search_business_id_idx
  on public.business_catalog_search (business_id);

create index business_catalog_search_vector_gin_idx
  on public.business_catalog_search using gin (search_vector);

create index business_catalog_search_tag_slugs_gin_idx
  on public.business_catalog_search using gin (tag_slugs);

revoke all on public.business_catalog_search from public, anon, authenticated;
grant select on public.business_catalog_search to service_role;

create or replace function public.refresh_business_catalog_search()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.business_catalog_search;
end;
$$;

revoke all on function public.refresh_business_catalog_search() from public, anon, authenticated;
grant execute on function public.refresh_business_catalog_search() to service_role;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('refresh_business_catalog_search');
    exception
      when others then
        null;
    end;
    perform cron.schedule(
      'refresh_business_catalog_search',
      '*/15 * * * *',
      'select public.refresh_business_catalog_search()'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron no programado: %', sqlerrm;
end
$cron$;

-- ----------------------------------------------------------------------------
-- discover_businesses_v2: texto y tags leen la MV (sin similarity() en caliente).
-- El radio sigue limitado a 50 km. La API usa esta RPC de forma exclusiva.
-- ----------------------------------------------------------------------------
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
        discover_businesses_v2.provinces is null
        or cardinality(discover_businesses_v2.provinces) = 0
        or coalesce(
          private.root_division_name(addr.administrative_division_id),
          b.province
        ) = any (discover_businesses_v2.provinces)
        or exists (
          select 1
          from unnest(discover_businesses_v2.provinces) as picked(name)
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
  double precision, text, uuid, text[], text, text
) from public;
grant execute on function public.discover_businesses_v2(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[], text, text
) to anon, authenticated, service_role;
