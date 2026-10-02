-- Taxonomía jerárquica de rubros de negocio (explorador tipo Temu + filtro discover).

create table public.marketplace_business_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.marketplace_business_categories (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  legacy_label text not null check (char_length(legacy_label) between 1 and 60),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_business_categories_slug_uidx unique (slug)
);

create index marketplace_business_categories_parent_id_idx
  on public.marketplace_business_categories (parent_id);

comment on table public.marketplace_business_categories is
  'Rubros marketplace para negocios. legacy_label coincide con valores en businesses.category (CSV).';

comment on column public.marketplace_business_categories.legacy_label is
  'Etiqueta usada en onboarding (BUSINESS_CATEGORY_OPTIONS) y businesses.category.';

create trigger set_marketplace_business_categories_updated_at
  before update on public.marketplace_business_categories
  for each row execute function private.set_updated_at();

alter table public.marketplace_business_categories enable row level security;

create policy "marketplace_business_categories: public read"
  on public.marketplace_business_categories for select
  to anon, authenticated
  using (is_active);

-- Expande slugs (padre incluye todos los descendientes) → etiquetas legacy para discover.
create or replace function public.expand_marketplace_business_category_labels(p_slugs text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with recursive tree as (
    select c.id, c.parent_id, c.legacy_label
    from public.marketplace_business_categories c
    where c.is_active
      and p_slugs is not null
      and cardinality(p_slugs) > 0
      and c.slug = any (p_slugs)
    union all
    select ch.id, ch.parent_id, ch.legacy_label
    from public.marketplace_business_categories ch
    inner join tree t on ch.parent_id = t.id
    where ch.is_active
  )
  select coalesce(array_agg(distinct btrim(legacy_label)), '{}'::text[])
  from tree
  where btrim(legacy_label) <> '';
$$;

revoke all on function public.expand_marketplace_business_category_labels(text[]) from public;
grant execute on function public.expand_marketplace_business_category_labels(text[]) to anon, authenticated, service_role;

-- Expande tags marketplace de productos (padre → hijos) para filtro por tag.
create or replace function public.expand_marketplace_catalog_tag_slugs(p_slugs text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with recursive tree as (
    select t.id, t.parent_id, t.slug
    from public.catalog_tags t
    where t.is_active
      and t.scope = 'marketplace'
      and p_slugs is not null
      and cardinality(p_slugs) > 0
      and t.slug = any (p_slugs)
    union all
    select ch.id, ch.parent_id, ch.slug
    from public.catalog_tags ch
    inner join tree t on ch.parent_id = t.id
    where ch.is_active
      and ch.scope = 'marketplace'
  )
  select coalesce(array_agg(distinct slug), '{}'::text[])
  from tree;
$$;

revoke all on function public.expand_marketplace_catalog_tag_slugs(text[]) from public;
grant execute on function public.expand_marketplace_catalog_tag_slugs(text[]) to anon, authenticated, service_role;

-- Seed: árbol de entretenimiento (ejemplo principal).
insert into public.marketplace_business_categories (slug, name, legacy_label, sort_order)
select 'entretenimiento', 'Entretenimiento', 'Entretenimiento', 100
where not exists (
  select 1 from public.marketplace_business_categories where slug = 'entretenimiento'
);

insert into public.marketplace_business_categories (slug, name, legacy_label, sort_order, parent_id)
select v.slug, v.name, v.legacy_label, v.sort_order, p.id
from (
  values
    ('casino', 'Casino', 'Casino', 10),
    ('videojuegos', 'Videojuegos', 'Videojuegos', 20),
    ('apuestas-loteria', 'Apuestas y lotería', 'Apuestas y lotería', 30),
    ('cine-eventos', 'Cine y eventos', 'Cine y eventos', 40),
    ('musica-instrumentos', 'Música e instrumentos', 'Música e instrumentos', 50),
    ('arte-galeria', 'Arte y galería', 'Arte y galería', 60)
) as v(slug, name, legacy_label, sort_order)
cross join public.marketplace_business_categories p
where p.slug = 'entretenimiento'
  and not exists (
    select 1 from public.marketplace_business_categories x where x.slug = v.slug
  );

-- Raíces adicionales (sin hijos aún; se pueden colgar rubros después).
insert into public.marketplace_business_categories (slug, name, legacy_label, sort_order)
select v.slug, v.name, v.legacy_label, v.sort_order
from (
  values
    ('comida-bebida', 'Comida y bebida', 'Restaurante', 10),
    ('tiendas', 'Tiendas', 'Pulpería', 20),
    ('salud-bienestar', 'Salud y bienestar', 'Farmacia', 30),
    ('servicios-locales', 'Servicios locales', 'Salón de belleza', 40),
    ('viajes-hospedaje', 'Viajes y hospedaje', 'Hotel', 50)
) as v(slug, name, legacy_label, sort_order)
where not exists (
  select 1 from public.marketplace_business_categories x where x.slug = v.slug
);

-- Ejemplo productos: subtags bajo Bebidas.
insert into public.catalog_tags (scope, slug, name, sort_order, parent_id)
select 'marketplace', v.slug, v.name, v.sort_order, p.id
from (
  values
    ('gaseosas', 'Gaseosas', 10),
    ('jugos', 'Jugos y naturales', 20),
    ('agua', 'Agua', 30),
    ('energizantes', 'Energizantes', 40)
) as v(slug, name, sort_order)
cross join public.catalog_tags p
where p.scope = 'marketplace'
  and p.slug = 'bebidas'
  and not exists (
    select 1 from public.catalog_tags ct where ct.scope = 'marketplace' and ct.slug = v.slug
  );
