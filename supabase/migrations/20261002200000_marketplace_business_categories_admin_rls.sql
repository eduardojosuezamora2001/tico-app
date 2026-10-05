-- Escritura de rubros marketplace solo para super admin (is_admin).
-- Lectura pública activa ya existe en 20261002180000.

create policy "marketplace_business_categories: admin insert"
  on public.marketplace_business_categories for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "marketplace_business_categories: admin update"
  on public.marketplace_business_categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "marketplace_business_categories: admin delete"
  on public.marketplace_business_categories for delete
  to authenticated
  using ((select private.is_admin()));
