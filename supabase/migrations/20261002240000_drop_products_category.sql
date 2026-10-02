-- Taxonomía de producto vive en product_catalog_tags; la columna CSV ya no se usa.

alter table public.products drop column if exists category;
