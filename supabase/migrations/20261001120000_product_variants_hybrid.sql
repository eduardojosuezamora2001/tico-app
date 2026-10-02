-- Productos: modelo híbrido padre + variantes + bundles (JSON validado en API).

alter table public.products
  add column if not exists product_kind text not null default 'simple'
    check (product_kind in ('simple', 'variant', 'bundle')),
  add column if not exists option_groups jsonb not null default '[]'::jsonb
    check (jsonb_typeof(option_groups) = 'array'),
  add column if not exists spec_schema jsonb not null default '[]'::jsonb
    check (jsonb_typeof(spec_schema) = 'array'),
  add column if not exists specifications jsonb not null default '{}'::jsonb
    check (jsonb_typeof(specifications) = 'object'),
  add column if not exists bundle_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(bundle_config) = 'object');

comment on column public.products.product_kind is 'simple | variant | bundle';
comment on column public.products.option_groups is 'Ejes de variante (color, talla, etc.).';
comment on column public.products.spec_schema is 'Definición de ficha técnica dinámica.';
comment on column public.products.specifications is 'Valores de ficha técnica.';
comment on column public.products.bundle_config is 'Reglas de precio/composición para bundles.';

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  stock integer check (stock >= 0),
  image_url text,
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  sku text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_variants is 'SKU por producto (precio, stock, opciones).';

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);
create unique index if not exists product_variants_one_default_per_product_idx
  on public.product_variants (product_id)
  where is_default = true;

create trigger set_product_variants_updated_at
  before update on public.product_variants
  for each row execute function private.set_updated_at();

create table if not exists public.product_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_product_id uuid not null references public.products (id) on delete cascade,
  component_variant_id uuid not null references public.product_variants (id) on delete restrict,
  default_qty integer not null default 1 check (default_qty >= 0),
  min_qty integer not null default 0 check (min_qty >= 0),
  max_qty integer not null default 99 check (max_qty >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (min_qty <= default_qty and default_qty <= max_qty)
);

comment on table public.product_bundle_items is 'Componentes de un producto bundle (variantes concretas).';

create index if not exists product_bundle_items_bundle_idx on public.product_bundle_items (bundle_product_id);
create index if not exists product_bundle_items_component_idx on public.product_bundle_items (component_variant_id);

-- Backfill: una variante default por producto existente.
insert into public.product_variants (
  product_id,
  price,
  stock,
  image_url,
  options,
  is_default,
  is_available,
  sort_order
)
select
  p.id,
  p.price,
  p.stock,
  p.image_url,
  '{}'::jsonb,
  true,
  p.is_available,
  0
from public.products p
where not exists (
  select 1 from public.product_variants v where v.product_id = p.id
);

-- Sincroniza cache en products desde variante default.
create or replace function private.sync_product_default_variant_cache()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_default then
    update public.products
    set
      price = new.price,
      stock = new.stock,
      image_url = new.image_url,
      updated_at = now()
    where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_product_cache_on_variant on public.product_variants;
create trigger sync_product_cache_on_variant
  after insert or update of price, stock, image_url, is_default
  on public.product_variants
  for each row
  when (new.is_default)
  execute function private.sync_product_default_variant_cache();

-- RLS product_variants
alter table public.product_variants enable row level security;

create policy "product_variants: public read"
  on public.product_variants for select
  to anon, authenticated
  using (true);

create policy "product_variants: insert via products:create"
  on public.product_variants for insert
  to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (select private.has_permission(p.business_id, 'products:create'))
    )
  );

create policy "product_variants: update via products edit"
  on public.product_variants for update
  to authenticated
  using (
    exists (
      select 1 from public.products p
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
      select 1 from public.products p
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

create policy "product_variants: delete via products delete"
  on public.product_variants for delete
  to authenticated
  using (
    exists (
      select 1 from public.products p
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

-- RLS product_bundle_items
alter table public.product_bundle_items enable row level security;

create policy "product_bundle_items: public read"
  on public.product_bundle_items for select
  to anon, authenticated
  using (true);

create policy "product_bundle_items: insert via products:create"
  on public.product_bundle_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = bundle_product_id
        and (select private.has_permission(p.business_id, 'products:create'))
    )
  );

create policy "product_bundle_items: update via products edit"
  on public.product_bundle_items for update
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = bundle_product_id
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
      select 1 from public.products p
      where p.id = bundle_product_id
        and (
          (select private.has_permission(p.business_id, 'products:edit_all'))
          or (
            p.created_by = (select auth.uid())
            and (select private.has_permission(p.business_id, 'products:edit_own'))
          )
        )
    )
  );

create policy "product_bundle_items: delete via products delete"
  on public.product_bundle_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = bundle_product_id
        and (
          (select private.has_permission(p.business_id, 'products:delete_all'))
          or (
            p.created_by = (select auth.uid())
            and (select private.has_permission(p.business_id, 'products:delete_own'))
          )
        )
    )
  );
