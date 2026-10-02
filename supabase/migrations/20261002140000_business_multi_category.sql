-- Varias categorías de rubro por negocio (CSV en businesses.category).

alter table public.businesses
  drop constraint if exists businesses_category_check;

alter table public.businesses
  add constraint businesses_category_check
  check (char_length(category) between 1 and 2000);

create or replace function private.business_matches_category_filter(
  business_category text,
  filter_categories text[]
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    filter_categories is null
    or cardinality(filter_categories) = 0
    or business_category = any (filter_categories)
    or exists (
      select 1
      from unnest(string_to_array(business_category, ',')) as part(raw)
      where btrim(raw) = any (filter_categories)
    );
$$;

-- Actualizar filtro de rubro en discover_businesses (misma firma que la migración anterior).
do $patch$
declare
  def text;
begin
  select pg_get_functiondef(p.oid)
  into def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'discover_businesses'
  order by p.oid desc
  limit 1;

  if def is null then
    raise exception 'discover_businesses not found';
  end if;

  def := replace(
    def,
    'or b.category = any (discover_businesses.categories)',
    'or private.business_matches_category_filter(b.category, discover_businesses.categories)'
  );

  execute def;
end;
$patch$;
