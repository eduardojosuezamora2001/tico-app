-- Taxonomía relacional de productos + descubrimiento de negocios por catálogo.
-- Spec: docs/specs/catalog-discovery.md

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ----------------------------------------------------------------------------
-- catalog_tags
-- ----------------------------------------------------------------------------
create table public.catalog_tags (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('marketplace', 'merchant')),
  business_id uuid references public.businesses (id) on delete cascade,
  parent_id uuid references public.catalog_tags (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_tags_scope_business_chk check (
    (scope = 'marketplace' and business_id is null)
    or (scope = 'merchant' and business_id is not null)
  )
);

comment on table public.catalog_tags is
  'Taxonomía de productos: marketplace (global) o merchant (estantería del negocio).';

create unique index catalog_tags_marketplace_slug_uidx
  on public.catalog_tags (slug)
  where scope = 'marketplace';

create unique index catalog_tags_merchant_business_slug_uidx
  on public.catalog_tags (business_id, slug)
  where scope = 'merchant';

create index catalog_tags_parent_id_idx on public.catalog_tags (parent_id);
create index catalog_tags_business_id_idx on public.catalog_tags (business_id);

create trigger set_catalog_tags_updated_at
  before update on public.catalog_tags
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- product_catalog_tags
-- ----------------------------------------------------------------------------
create table public.product_catalog_tags (
  product_id uuid not null references public.products (id) on delete cascade,
  tag_id uuid not null references public.catalog_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);

comment on table public.product_catalog_tags is
  'Etiquetas N:M por producto. Descubrimiento público usa tags scope=marketplace.';

create index product_catalog_tags_tag_id_idx on public.product_catalog_tags (tag_id);

-- ----------------------------------------------------------------------------
-- catalog_tag_synonyms
-- ----------------------------------------------------------------------------
create table public.catalog_tag_synonyms (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.catalog_tags (id) on delete cascade,
  term text not null check (char_length(term) between 1 and 80),
  created_at timestamptz not null default now()
);

create unique index catalog_tag_synonyms_tag_term_uidx
  on public.catalog_tag_synonyms (tag_id, lower(term));

-- ----------------------------------------------------------------------------
-- products.search_vector (nombre + descripción)
-- ----------------------------------------------------------------------------
alter table public.products
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;

create index if not exists products_search_vector_gin_idx
  on public.products using gin (search_vector);

create index if not exists products_name_trgm_idx
  on public.products using gin (name extensions.gin_trgm_ops);

comment on column public.products.category is
  'LEGACY: preferir product_catalog_tags. Se dejará de escribir cuando la API migre.';

-- ----------------------------------------------------------------------------
-- Seed: taxonomía marketplace inicial (Costa Rica / abarrotes)
-- ----------------------------------------------------------------------------
insert into public.catalog_tags (scope, slug, name, sort_order)
select v.scope, v.slug, v.name, v.sort_order
from (
  values
    ('marketplace', 'bebidas', 'Bebidas', 10),
    ('marketplace', 'snacks', 'Snacks', 20),
    ('marketplace', 'abarrotes', 'Abarrotes', 30),
    ('marketplace', 'lacteos', 'Lácteos', 40),
    ('marketplace', 'limpieza', 'Limpieza', 50),
    ('marketplace', 'cuidado-personal', 'Cuidado personal', 60),
    ('marketplace', 'farmacia-otc', 'Farmacia (OTC)', 70),
    ('marketplace', 'ferreteria', 'Ferretería', 80),
    ('marketplace', 'electronica', 'Electrónica', 90),
    ('marketplace', 'hogar', 'Hogar', 100),
    ('marketplace', 'alimentos', 'Alimentos', 110),
    ('marketplace', 'combos', 'Combos', 120)
) as v(scope, slug, name, sort_order)
where not exists (
  select 1
  from public.catalog_tags t
  where t.scope = 'marketplace' and t.slug = v.slug
);

insert into public.catalog_tag_synonyms (tag_id, term)
select t.id, v.term
from public.catalog_tags t
cross join lateral (
  values
    ('bebidas', 'gaseosa'),
    ('bebidas', 'refresco'),
    ('snacks', 'botanas'),
    ('abarrotes', 'pulperia')
) as v(slug, term)
where t.scope = 'marketplace' and t.slug = v.slug
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Backfill: products.category (CSV o texto) → tags merchant + marketplace si aplica
-- ----------------------------------------------------------------------------
create or replace function private.slugify_tag_label(label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent(trim(label))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

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
    where p.category is not null and btrim(p.category) <> ''
  loop
    foreach part in array string_to_array(rec.category, ',')
    loop
      part := btrim(part);
      if part = '' then
        continue;
      end if;

      tag_slug := private.slugify_tag_label(part);
      if tag_slug = '' or tag_slug is null then
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

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.catalog_tags enable row level security;
alter table public.product_catalog_tags enable row level security;
alter table public.catalog_tag_synonyms enable row level security;

create policy "catalog_tags: public read active"
  on public.catalog_tags for select
  to anon, authenticated
  using (is_active);

create policy "catalog_tags: admin write marketplace"
  on public.catalog_tags for insert
  to authenticated
  with check (
    scope = 'marketplace'
    and business_id is null
    and (select private.is_admin())
  );

create policy "catalog_tags: admin update marketplace"
  on public.catalog_tags for update
  to authenticated
  using (scope = 'marketplace' and business_id is null and (select private.is_admin()))
  with check (scope = 'marketplace' and business_id is null and (select private.is_admin()));

create policy "catalog_tags: admin delete marketplace"
  on public.catalog_tags for delete
  to authenticated
  using (scope = 'marketplace' and business_id is null and (select private.is_admin()));

create policy "catalog_tags: merchant insert"
  on public.catalog_tags for insert
  to authenticated
  with check (
    scope = 'merchant'
    and business_id is not null
    and (select private.has_permission(business_id, 'products:edit_all'))
  );

create policy "catalog_tags: merchant update"
  on public.catalog_tags for update
  to authenticated
  using (
    scope = 'merchant'
    and business_id is not null
    and (select private.has_permission(business_id, 'products:edit_all'))
  )
  with check (
    scope = 'merchant'
    and business_id is not null
    and (select private.has_permission(business_id, 'products:edit_all'))
  );

create policy "catalog_tags: merchant delete"
  on public.catalog_tags for delete
  to authenticated
  using (
    scope = 'merchant'
    and business_id is not null
    and (select private.has_permission(business_id, 'products:edit_all'))
  );

create policy "product_catalog_tags: public read"
  on public.product_catalog_tags for select
  to anon, authenticated
  using (true);

create policy "product_catalog_tags: insert via products create"
  on public.product_catalog_tags for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (select private.has_permission(p.business_id, 'products:create'))
    )
  );

create policy "product_catalog_tags: update via products edit"
  on public.product_catalog_tags for update
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (
          (select private.has_permission(p.business_id, 'products:edit_all'))
          or (
            p.created_by = (select auth.uid())
            and (select private.has_permission(p.business_id, 'products:edit_own'))
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (
          (select private.has_permission(p.business_id, 'products:edit_all'))
          or (
            p.created_by = (select auth.uid())
            and (select private.has_permission(p.business_id, 'products:edit_own'))
          )
        )
    )
  );

create policy "product_catalog_tags: delete via products delete"
  on public.product_catalog_tags for delete
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and (
          (select private.has_permission(p.business_id, 'products:delete_all'))
          or (
            p.created_by = (select auth.uid())
            and (select private.has_permission(p.business_id, 'products:delete_own'))
          )
        )
    )
  );

create policy "catalog_tag_synonyms: public read"
  on public.catalog_tag_synonyms for select
  to anon, authenticated
  using (true);

create policy "catalog_tag_synonyms: admin write"
  on public.catalog_tag_synonyms for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "catalog_tag_synonyms: admin update"
  on public.catalog_tag_synonyms for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "catalog_tag_synonyms: admin delete"
  on public.catalog_tag_synonyms for delete
  to authenticated
  using ((select private.is_admin()));

-- ----------------------------------------------------------------------------
-- discover_businesses — locales por catálogo + geo (producción)
-- ----------------------------------------------------------------------------
create or replace function public.discover_businesses(
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
    located.distance_m
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
  double precision, text, uuid, text[]
) from public;
grant execute on function public.discover_businesses(
  text, text[], text[], double precision, double precision, numeric, integer,
  double precision, text, uuid, text[]
) to anon, authenticated, service_role;
