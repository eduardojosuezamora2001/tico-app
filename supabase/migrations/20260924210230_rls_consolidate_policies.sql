-- ============================================================================
-- Plaza de Comercios Digital - Migracion 5
-- Consolida politicas permisivas duplicadas (advisor: multiple_permissive_policies).
-- Cada tabla queda con una sola politica SELECT por rol; las politicas `for all`
-- se reemplazan por insert/update/delete explicitos.
-- ============================================================================

-- users: una sola politica SELECT ---------------------------------------------
drop policy if exists "users: select own profile or admin" on public.users;
drop policy if exists "users: select business co-members" on public.users;
drop policy if exists "users: select chat counterparts" on public.users;

create policy "users: select own, admin, co-members or chat counterparts"
  on public.users for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
    -- Companeros de negocio (equipo, chat interno).
    or exists (
      select 1
      from public.business_users bu
      where bu.user_id = users.id
        and (select private.is_business_member(bu.business_id))
    )
    -- Contrapartes de chat.
    or exists (
      select 1
      from public.messages m
      where (m.sender_id = users.id and m.receiver_id = (select auth.uid()))
         or (m.receiver_id = users.id and m.sender_id = (select auth.uid()))
    )
  );

-- permissions: admin gestiona con insert/update/delete (SELECT ya es publico) --
drop policy if exists "permissions: admin can manage" on public.permissions;

create policy "permissions: admin can insert"
  on public.permissions for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "permissions: admin can update"
  on public.permissions for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "permissions: admin can delete"
  on public.permissions for delete
  to authenticated
  using ((select private.is_admin()));

-- business_hours ---------------------------------------------------------------
drop policy if exists "business_hours: hours:edit can write" on public.business_hours;

create policy "business_hours: hours:edit can insert"
  on public.business_hours for insert
  to authenticated
  with check ((select private.has_permission(business_id, 'hours:edit')));

create policy "business_hours: hours:edit can update"
  on public.business_hours for update
  to authenticated
  using ((select private.has_permission(business_id, 'hours:edit')))
  with check ((select private.has_permission(business_id, 'hours:edit')));

create policy "business_hours: hours:edit can delete"
  on public.business_hours for delete
  to authenticated
  using ((select private.has_permission(business_id, 'hours:edit')));

-- business_translations --------------------------------------------------------
drop policy if exists "business_translations: business:edit can write" on public.business_translations;

create policy "business_translations: business:edit can insert"
  on public.business_translations for insert
  to authenticated
  with check ((select private.has_permission(business_id, 'business:edit')));

create policy "business_translations: business:edit can update"
  on public.business_translations for update
  to authenticated
  using ((select private.has_permission(business_id, 'business:edit')))
  with check ((select private.has_permission(business_id, 'business:edit')));

create policy "business_translations: business:edit can delete"
  on public.business_translations for delete
  to authenticated
  using ((select private.has_permission(business_id, 'business:edit')));

-- product_translations ---------------------------------------------------------
drop policy if exists "product_translations: products:edit_all can write" on public.product_translations;

create policy "product_translations: products:edit_all can insert"
  on public.product_translations for insert
  to authenticated
  with check (
    (select private.has_permission(
      (select p.business_id from public.products p where p.id = product_id),
      'products:edit_all'
    ))
  );

create policy "product_translations: products:edit_all can update"
  on public.product_translations for update
  to authenticated
  using (
    (select private.has_permission(
      (select p.business_id from public.products p where p.id = product_id),
      'products:edit_all'
    ))
  )
  with check (
    (select private.has_permission(
      (select p.business_id from public.products p where p.id = product_id),
      'products:edit_all'
    ))
  );

create policy "product_translations: products:edit_all can delete"
  on public.product_translations for delete
  to authenticated
  using (
    (select private.has_permission(
      (select p.business_id from public.products p where p.id = product_id),
      'products:edit_all'
    ))
  );
