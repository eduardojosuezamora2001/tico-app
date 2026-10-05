-- Catálogo en embeddings desde sellable_items (no depende del refresh de business_catalog_search).

create or replace function public.assistant_list_embed_sources(p_limit int default 500)
returns table (
  source_type text,
  source_id text,
  business_id uuid,
  content text,
  metadata jsonb,
  content_hash text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  (
    select
      'business'::text,
      b.id::text,
      b.id,
      concat_ws(
        E'\n',
        'Negocio: ' || b.name,
        'Categoría: ' || coalesce(b.category, ''),
        'Rubros marketplace: ' || coalesce((
          select string_agg(distinct c.name, ', ' order by c.name)
          from public.marketplace_business_categories c
          where c.is_active
            and exists (
              select 1
              from unnest(string_to_array(b.category, ',')) as part(raw)
              where btrim(raw) <> ''
                and c.legacy_label = btrim(raw)
            )
        ), ''),
        'Dirección: ' || coalesce(b.address, ''),
        'Descripción: ' || coalesce(b.description, '')
      ),
      jsonb_build_object('name', b.name, 'slug', b.slug),
      md5(
        concat_ws(
          '|',
          b.name,
          coalesce(b.category, ''),
          coalesce(b.address, ''),
          coalesce(b.description, ''),
          b.updated_at::text
        )
      )
    from public.businesses b
    where b.is_active = true and b.is_draft = false
    order by b.updated_at desc
    limit p_limit
  )
  union all
  (
    select
      'catalog_item'::text,
      s.item_type || ':' || s.item_id::text,
      s.business_id,
      concat_ws(
        E'\n',
        'Ítem: ' || s.name,
        'Tipo: ' || s.item_type,
        'Negocio: ' || b.name,
        'Categoría negocio: ' || coalesce(b.category, ''),
        'Precio: ' || coalesce(s.price::text, ''),
        'Tags catálogo: ' || coalesce((
          select string_agg(ct.slug, ', ' order by ct.slug)
          from public.product_catalog_tags pct
          join public.catalog_tags ct on ct.id = pct.tag_id
          where s.item_type = 'product'
            and pct.product_id = s.item_id
            and ct.scope = 'marketplace'
            and ct.is_active
        ), '')
      ),
      jsonb_build_object(
        'item_type', s.item_type,
        'item_id', s.item_id,
        'business_name', b.name,
        'price', s.price
      ),
      md5(
        concat_ws(
          '|',
          s.name,
          s.item_type,
          s.item_id::text,
          s.business_id::text,
          b.name,
          coalesce(s.price::text, ''),
          s.updated_at::text
        )
      )
    from public.sellable_items s
    join public.businesses b on b.id = s.business_id
    where b.is_active = true and b.is_draft = false and s.listed = true
    limit p_limit
  )
  union all
  (
    select
      'faq'::text,
      f.id::text,
      null::uuid,
      concat_ws(E'\n', 'FAQ: ' || f.title, f.body),
      jsonb_build_object('slug', f.slug),
      md5(f.title || '|' || f.body)
    from public.faq_entries f
    where f.is_active = true
    limit 50
  )
  union all
  (
    select
      'marketplace_category'::text,
      c.slug,
      null::uuid,
      concat_ws(
        E'\n',
        'Rubro marketplace: ' || c.name,
        'Slug: ' || c.slug,
        'Etiqueta legacy: ' || c.legacy_label
      ),
      jsonb_build_object('slug', c.slug, 'name', c.name),
      md5(c.name || '|' || c.slug || '|' || c.legacy_label || '|' || c.updated_at::text)
    from public.marketplace_business_categories c
    where c.is_active = true
    limit 200
  )
  union all
  (
    select
      'catalog_tag'::text,
      t.slug,
      null::uuid,
      concat_ws(
        E'\n',
        'Tag catálogo: ' || t.name,
        'Slug: ' || t.slug,
        'Alcance: ' || t.scope
      ),
      jsonb_build_object('slug', t.slug, 'name', t.name, 'scope', t.scope),
      md5(t.name || '|' || t.slug || '|' || t.scope || '|' || t.updated_at::text)
    from public.catalog_tags t
    where t.is_active = true
      and t.scope = 'marketplace'
    limit 200
  );
$$;
