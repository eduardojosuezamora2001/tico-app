-- El trigger set_business_slug y la columna generada location necesitan UPDATE
-- cuando el cliente modifica name o latitude/longitude.

grant update (slug, location) on public.businesses to authenticated;
