-- Rellena imágenes demo en comercios, productos, servicios, menús y variantes
-- que aún no tienen URL. Usa picsum.photos con seeds estables por id.

create or replace function private.demo_image_url(seed text, width integer, height integer)
returns text
language sql
immutable
as $$
  select format(
    'https://picsum.photos/seed/%s/%s/%s',
    left(regexp_replace(coalesce(seed, 'tico'), '[^a-zA-Z0-9]', '', 'g'), 40),
    greatest(width, 64),
    greatest(height, 64)
  );
$$;

update public.businesses
set
  logo_url = coalesce(
    nullif(logo_url, ''),
    private.demo_image_url(id::text || '-logo', 400, 400)
  ),
  banner_url = coalesce(
    nullif(banner_url, ''),
    private.demo_image_url(id::text || '-banner', 1200, 480)
  )
where logo_url is null
   or logo_url = ''
   or banner_url is null
   or banner_url = '';

update public.products
set image_url = private.demo_image_url(id::text || '-product', 800, 800)
where image_url is null or image_url = '';

update public.services
set image_url = private.demo_image_url(id::text || '-service', 800, 800)
where image_url is null or image_url = '';

update public.menus
set image_url = private.demo_image_url(id::text || '-menu', 800, 800)
where image_url is null or image_url = '';

update public.product_variants pv
set image_url = coalesce(
  nullif(pv.image_url, ''),
  p.image_url,
  private.demo_image_url(pv.id::text || '-variant', 800, 800)
)
from public.products p
where p.id = pv.product_id
  and (pv.image_url is null or pv.image_url = '');

-- Una foto de galería por comercio si todavía no tiene ninguna.
insert into public.business_gallery (business_id, image_url, sort_order)
select
  b.id,
  private.demo_image_url(b.id::text || '-gallery', 1200, 800),
  0
from public.businesses b
where not exists (
  select 1 from public.business_gallery g where g.business_id = b.id
);
