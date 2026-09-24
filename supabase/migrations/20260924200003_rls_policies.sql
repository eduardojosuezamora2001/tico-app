-- ============================================================================
-- Plaza de Comercios Digital - Migracion 3/4
-- Row Level Security para las 16 tablas.
--
-- Convenciones:
--  * auth.uid() siempre envuelto en (select ...) para evaluarse una sola vez.
--  * Politicas con `to anon` / `to authenticated` explicitos (nunca auth.role()).
--  * UPDATE siempre con USING + WITH CHECK.
--  * La logica de pertenencia/permisos vive en private.* (SECURITY DEFINER),
--    evitando recursion entre politicas y escaneos por fila.
--  * Los privilegios de columna complementan a RLS donde una fila puede ser
--    editada por su dueno pero ciertas columnas no deben cambiar (users.role,
--    businesses.owner_id, messages.* salvo is_read).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;

create policy "users: select own profile or admin"
  on public.users for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_admin())
  );

-- Los miembros de un negocio ven los perfiles de sus companeros (chat, equipo).
create policy "users: select business co-members"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.user_id = users.id
        and (select private.is_business_member(bu.business_id))
    )
  );

-- Contrapartes de chat: quien me escribio o a quien le escribi.
create policy "users: select chat counterparts"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where (m.sender_id = users.id and m.receiver_id = (select auth.uid()))
         or (m.receiver_id = users.id and m.sender_id = (select auth.uid()))
    )
  );

create policy "users: update own profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Nadie cambia su propio rol global: solo columnas de perfil son editables.
revoke update on public.users from anon, authenticated;
grant update (full_name, avatar_url, preferred_language) on public.users to authenticated;
-- Insert/Delete solo via trigger de Auth o service_role.
revoke insert, delete on public.users from anon, authenticated;

-- ----------------------------------------------------------------------------
-- businesses
-- ----------------------------------------------------------------------------
alter table public.businesses enable row level security;

create policy "businesses: public can view active"
  on public.businesses for select
  to anon
  using (is_active);

create policy "businesses: authenticated view active or own"
  on public.businesses for select
  to authenticated
  using (
    is_active
    or (select private.is_business_member(id))
  );

create policy "businesses: authenticated can create as owner"
  on public.businesses for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "businesses: members with business:edit can update"
  on public.businesses for update
  to authenticated
  using ((select private.has_permission(id, 'business:edit')))
  with check ((select private.has_permission(id, 'business:edit')));

create policy "businesses: owner or admin can delete"
  on public.businesses for delete
  to authenticated
  using (
    (select private.is_business_owner(id))
    or (select private.is_admin())
  );

-- owner_id no se transfiere desde el cliente (solo service_role).
revoke update on public.businesses from anon, authenticated;
grant update (
  name, description, category, latitude, longitude, address,
  whatsapp_number, website, email, phone, logo_url, banner_url,
  is_active, chat_retention_days
) on public.businesses to authenticated;

-- ----------------------------------------------------------------------------
-- business_modules
-- ----------------------------------------------------------------------------
alter table public.business_modules enable row level security;

create policy "business_modules: public read"
  on public.business_modules for select
  to anon, authenticated
  using (true);

create policy "business_modules: business:edit can insert"
  on public.business_modules for insert
  to authenticated
  with check ((select private.has_permission(business_id, 'business:edit')));

create policy "business_modules: business:edit can update"
  on public.business_modules for update
  to authenticated
  using ((select private.has_permission(business_id, 'business:edit')))
  with check ((select private.has_permission(business_id, 'business:edit')));

create policy "business_modules: business:edit can delete"
  on public.business_modules for delete
  to authenticated
  using ((select private.has_permission(business_id, 'business:edit')));

-- ----------------------------------------------------------------------------
-- permissions (catalogo de solo lectura para clientes)
-- ----------------------------------------------------------------------------
alter table public.permissions enable row level security;

create policy "permissions: authenticated can read catalog"
  on public.permissions for select
  to authenticated
  using (true);

create policy "permissions: admin can manage"
  on public.permissions for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ----------------------------------------------------------------------------
-- business_users
-- ----------------------------------------------------------------------------
alter table public.business_users enable row level security;

create policy "business_users: members can view team"
  on public.business_users for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_business_member(business_id))
  );

-- La fila 'owner' solo la crea el trigger handle_new_business.
create policy "business_users: employees:manage can add"
  on public.business_users for insert
  to authenticated
  with check (
    role <> 'owner'
    and (select private.has_permission(business_id, 'employees:manage'))
  );

create policy "business_users: employees:manage can update"
  on public.business_users for update
  to authenticated
  using (
    role <> 'owner'
    and (select private.has_permission(business_id, 'employees:manage'))
  )
  with check (
    role <> 'owner'
    and (select private.has_permission(business_id, 'employees:manage'))
  );

create policy "business_users: employees:manage can remove"
  on public.business_users for delete
  to authenticated
  using (
    role <> 'owner'
    and (select private.has_permission(business_id, 'employees:manage'))
  );

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;

create policy "products: public read"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "products: products:create can insert"
  on public.products for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.has_permission(business_id, 'products:create'))
  );

create policy "products: edit_all or edit_own can update"
  on public.products for update
  to authenticated
  using (
    (select private.has_permission(business_id, 'products:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'products:edit_own'))
    )
  )
  with check (
    (select private.has_permission(business_id, 'products:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'products:edit_own'))
    )
  );

create policy "products: delete_all or delete_own can delete"
  on public.products for delete
  to authenticated
  using (
    (select private.has_permission(business_id, 'products:delete_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'products:delete_own'))
    )
  );

-- ----------------------------------------------------------------------------
-- product_translations
-- ----------------------------------------------------------------------------
alter table public.product_translations enable row level security;

create policy "product_translations: public read"
  on public.product_translations for select
  to anon, authenticated
  using (true);

create policy "product_translations: products:edit_all can write"
  on public.product_translations for all
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

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "messages: participants or chat:view_all can read"
  on public.messages for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or (select private.has_permission(business_id, 'chat:view_all'))
  );

-- El emisor es el usuario actual y al menos una de las partes pertenece al negocio.
create policy "messages: sender can insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (select private.is_user_business_member(business_id, sender_id))
      or (select private.is_user_business_member(business_id, receiver_id))
    )
  );

create policy "messages: receiver can mark as read"
  on public.messages for update
  to authenticated
  using (receiver_id = (select auth.uid()))
  with check (receiver_id = (select auth.uid()));

-- Solo is_read es editable desde el cliente; el borrado por retencion lo hace la API.
revoke update, delete on public.messages from anon, authenticated;
grant update (is_read) on public.messages to authenticated;

-- ----------------------------------------------------------------------------
-- audit_log
-- ----------------------------------------------------------------------------
alter table public.audit_log enable row level security;

create policy "audit_log: audit:view can read"
  on public.audit_log for select
  to authenticated
  using ((select private.has_permission(business_id, 'audit:view')));

create policy "audit_log: members can append"
  on public.audit_log for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.is_business_member(business_id))
  );

-- La bitacora es inmutable desde el cliente.
revoke update, delete on public.audit_log from anon, authenticated;

-- ----------------------------------------------------------------------------
-- business_hours
-- ----------------------------------------------------------------------------
alter table public.business_hours enable row level security;

create policy "business_hours: public read"
  on public.business_hours for select
  to anon, authenticated
  using (true);

create policy "business_hours: hours:edit can write"
  on public.business_hours for all
  to authenticated
  using ((select private.has_permission(business_id, 'hours:edit')))
  with check ((select private.has_permission(business_id, 'hours:edit')));

-- ----------------------------------------------------------------------------
-- services
-- ----------------------------------------------------------------------------
alter table public.services enable row level security;

create policy "services: public read"
  on public.services for select
  to anon, authenticated
  using (true);

create policy "services: services:create can insert"
  on public.services for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.has_permission(business_id, 'services:create'))
  );

create policy "services: edit_all or edit_own can update"
  on public.services for update
  to authenticated
  using (
    (select private.has_permission(business_id, 'services:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'services:edit_own'))
    )
  )
  with check (
    (select private.has_permission(business_id, 'services:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'services:edit_own'))
    )
  );

create policy "services: delete_all or delete_own can delete"
  on public.services for delete
  to authenticated
  using (
    (select private.has_permission(business_id, 'services:delete_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'services:delete_own'))
    )
  );

-- ----------------------------------------------------------------------------
-- menus
-- ----------------------------------------------------------------------------
alter table public.menus enable row level security;

create policy "menus: public read"
  on public.menus for select
  to anon, authenticated
  using (true);

create policy "menus: menu:create can insert"
  on public.menus for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.has_permission(business_id, 'menu:create'))
  );

create policy "menus: edit_all or edit_own can update"
  on public.menus for update
  to authenticated
  using (
    (select private.has_permission(business_id, 'menu:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'menu:edit_own'))
    )
  )
  with check (
    (select private.has_permission(business_id, 'menu:edit_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'menu:edit_own'))
    )
  );

create policy "menus: delete_all or delete_own can delete"
  on public.menus for delete
  to authenticated
  using (
    (select private.has_permission(business_id, 'menu:delete_all'))
    or (
      created_by = (select auth.uid())
      and (select private.has_permission(business_id, 'menu:delete_own'))
    )
  );

-- ----------------------------------------------------------------------------
-- appointments
-- ----------------------------------------------------------------------------
alter table public.appointments enable row level security;

create policy "appointments: client or appointments:view can read"
  on public.appointments for select
  to authenticated
  using (
    client_id = (select auth.uid())
    or employee_id = (select auth.uid())
    or (select private.has_permission(business_id, 'appointments:view'))
  );

-- Un cliente agenda para si mismo; el personal con permiso agenda en nombre de clientes.
create policy "appointments: client or appointments:create can insert"
  on public.appointments for insert
  to authenticated
  with check (
    client_id = (select auth.uid())
    or (select private.has_permission(business_id, 'appointments:create'))
  );

-- El cliente puede modificar/cancelar su cita; el personal con edit_all gestiona todas,
-- y con edit_own las que tiene asignadas.
create policy "appointments: client or staff can update"
  on public.appointments for update
  to authenticated
  using (
    client_id = (select auth.uid())
    or (select private.has_permission(business_id, 'appointments:edit_all'))
    or (
      employee_id = (select auth.uid())
      and (select private.has_permission(business_id, 'appointments:edit_own'))
    )
  )
  with check (
    client_id = (select auth.uid())
    or (select private.has_permission(business_id, 'appointments:edit_all'))
    or (
      employee_id = (select auth.uid())
      and (select private.has_permission(business_id, 'appointments:edit_own'))
    )
  );

create policy "appointments: delete_all or delete_own can delete"
  on public.appointments for delete
  to authenticated
  using (
    (select private.has_permission(business_id, 'appointments:delete_all'))
    or (
      employee_id = (select auth.uid())
      and (select private.has_permission(business_id, 'appointments:delete_own'))
    )
  );

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews: public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "reviews: authenticated can create own"
  on public.reviews for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "reviews: author can update"
  on public.reviews for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reviews: author or admin can delete"
  on public.reviews for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events: public read"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "events: events:manage can insert"
  on public.events for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.has_permission(business_id, 'events:manage'))
  );

create policy "events: events:manage can update"
  on public.events for update
  to authenticated
  using ((select private.has_permission(business_id, 'events:manage')))
  with check ((select private.has_permission(business_id, 'events:manage')));

create policy "events: events:manage can delete"
  on public.events for delete
  to authenticated
  using ((select private.has_permission(business_id, 'events:manage')));

-- ----------------------------------------------------------------------------
-- business_translations
-- ----------------------------------------------------------------------------
alter table public.business_translations enable row level security;

create policy "business_translations: public read"
  on public.business_translations for select
  to anon, authenticated
  using (true);

create policy "business_translations: business:edit can write"
  on public.business_translations for all
  to authenticated
  using ((select private.has_permission(business_id, 'business:edit')))
  with check ((select private.has_permission(business_id, 'business:edit')));
