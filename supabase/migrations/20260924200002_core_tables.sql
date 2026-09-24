-- ============================================================================
-- Plaza de Comercios Digital - Migracion 2/4
-- 16 tablas del modelo de datos, indices, triggers y helpers de autorizacion.
-- Documentacion: docs/specs/database.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. users - perfil publico vinculado 1:1 con auth.users
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'client'
    check (role in ('admin', 'business_owner', 'business_employee', 'client')),
  preferred_language text not null default 'es'
    check (preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'Perfil de usuario. Se crea automaticamente desde auth.users (trigger handle_new_user). role = rol global.';

create trigger set_users_updated_at
  before update on public.users
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. businesses - negocios registrados
-- ----------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  category text not null check (char_length(category) between 1 and 60),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  -- Punto PostGIS derivado de latitude/longitude para busquedas por radio.
  location extensions.geography(Point, 4326) generated always as (
    case
      when latitude is not null and longitude is not null
        then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      else null
    end
  ) stored,
  address text,
  whatsapp_number text,
  website text,
  email text,
  phone text,
  logo_url text,
  banner_url text,
  is_active boolean not null default true,
  -- Retencion del chat en dias (PDF seccion 6: configurable, maximo 30).
  chat_retention_days integer not null default 30
    check (chat_retention_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_coordinates_pair
    check ((latitude is null) = (longitude is null))
);

comment on table public.businesses is 'Negocios del marketplace. location se genera desde latitude/longitude.';

create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_category_idx on public.businesses (category);
create index businesses_location_idx on public.businesses using gist (location);

create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. business_modules - modulos funcionales activos por negocio
-- ----------------------------------------------------------------------------
create table public.business_modules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  module_name text not null
    check (module_name in ('products', 'services', 'menu', 'appointments')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, module_name)
);

comment on table public.business_modules is 'Modulos (productos, servicios, menu, citas) habilitados por negocio.';

-- ----------------------------------------------------------------------------
-- 4. permissions - catalogo de permisos granulares
-- ----------------------------------------------------------------------------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z_]+:[a-z_]+$'),
  description text,
  module text not null,
  action text not null,
  created_at timestamptz not null default now(),
  unique (module, action)
);

comment on table public.permissions is 'Catalogo de permisos modulo:accion. Se siembra en la migracion 4 y refleja packages/shared PERMISSION_DEFINITIONS.';

-- ----------------------------------------------------------------------------
-- 5. business_users - relacion usuario <-> negocio (dueno y empleados)
-- ----------------------------------------------------------------------------
create table public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'employee')),
  permissions text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

comment on table public.business_users is 'Membresia de usuarios en negocios. permissions contiene nombres del catalogo permissions.';

create index business_users_user_id_idx on public.business_users (user_id);

create trigger set_business_users_updated_at
  before update on public.business_users
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. products - catalogo de productos
-- ----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  stock integer check (stock >= 0),
  image_url text,
  category text,
  is_available boolean not null default true,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Modulo Productos. created_by habilita los permisos *_own.';

create index products_business_id_idx on public.products (business_id);
create index products_category_idx on public.products (category);
create index products_created_by_idx on public.products (created_by);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. product_translations - traducciones de productos (DeepSeek)
-- ----------------------------------------------------------------------------
create table public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  language_code text not null check (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text,
  description text,
  created_at timestamptz not null default now(),
  unique (product_id, language_code)
);

comment on table public.product_translations is 'Traducciones almacenadas de productos (contenido estatico, PDF seccion 8).';

-- ----------------------------------------------------------------------------
-- 8. messages - chat persistente
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_sender_receiver_distinct check (sender_id <> receiver_id)
);

comment on table public.messages is 'Mensajes del chat (Socket.io + persistencia). Retencion segun businesses.chat_retention_days.';

create index messages_business_id_created_at_idx on public.messages (business_id, created_at desc);
create index messages_sender_id_idx on public.messages (sender_id);
create index messages_receiver_id_idx on public.messages (receiver_id);
create index messages_unread_idx on public.messages (receiver_id) where is_read = false;

create trigger set_messages_updated_at
  before update on public.messages
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. audit_log - bitacora de cambios
-- ----------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Bitacora: quien, que y cuando (PDF seccion 10). user_id se conserva como null si el usuario se elimina.';

create index audit_log_business_id_created_at_idx on public.audit_log (business_id, created_at desc);
create index audit_log_user_id_idx on public.audit_log (user_id);

-- ----------------------------------------------------------------------------
-- 10. business_hours - horario semanal y excepciones por fecha
-- ----------------------------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  exception_date date,
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  -- Una fila es horario semanal (day_of_week) o excepcion (exception_date), nunca ambos.
  constraint business_hours_weekly_or_exception
    check ((day_of_week is null) <> (exception_date is null)),
  constraint business_hours_times_required
    check (is_closed or (open_time is not null and close_time is not null))
);

comment on table public.business_hours is 'Horarios (0 = domingo) y excepciones por fecha (PDF seccion 13).';

create unique index business_hours_weekly_uidx
  on public.business_hours (business_id, day_of_week) where exception_date is null;
create unique index business_hours_exception_uidx
  on public.business_hours (business_id, exception_date) where exception_date is not null;

-- ----------------------------------------------------------------------------
-- 11. services - modulo Servicios
-- ----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  price numeric(12, 2) check (price >= 0),
  duration_minutes integer check (duration_minutes > 0),
  category text,
  image_url text,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.services is 'Modulo Servicios. duration_minutes se usa para agendar citas.';

create index services_business_id_idx on public.services (business_id);
create index services_created_by_idx on public.services (created_by);

create trigger set_services_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. menus - modulo Menu digital (una fila por plato/item)
-- ----------------------------------------------------------------------------
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  section text,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.menus is 'Modulo Menu digital: cada fila es un item agrupado por section.';

create index menus_business_id_section_idx on public.menus (business_id, section, sort_order);
create index menus_created_by_idx on public.menus (created_by);

create trigger set_menus_updated_at
  before update on public.menus
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. appointments - modulo Citas / Reservas
-- ----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  employee_id uuid references public.users (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer check (duration_minutes > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.appointments is 'Modulo Citas. employee_id es el miembro del negocio asignado.';

create index appointments_business_id_scheduled_at_idx on public.appointments (business_id, scheduled_at);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_service_id_idx on public.appointments (service_id);
create index appointments_employee_id_idx on public.appointments (employee_id);

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. reviews - resenas de clientes
-- ----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

comment on table public.reviews is 'Resenas (rating 1-5 + texto), publicacion automatica, editables (PDF seccion 14).';

create index reviews_user_id_idx on public.reviews (user_id);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 15. events - eventos del negocio (RSVP / WhatsApp)
-- ----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  location_text text,
  image_url text,
  rsvp_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  created_by uuid default auth.uid() references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is 'Eventos con RSVP y contacto por WhatsApp (PDF secciones 9 y 13).';

create index events_business_id_starts_at_idx on public.events (business_id, starts_at);
create index events_created_by_idx on public.events (created_by);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- 16. business_translations - traducciones del perfil del negocio
-- ----------------------------------------------------------------------------
create table public.business_translations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  language_code text not null check (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text,
  description text,
  created_at timestamptz not null default now(),
  unique (business_id, language_code)
);

comment on table public.business_translations is 'Traducciones almacenadas del nombre/descripcion del negocio.';

-- ============================================================================
-- Helpers de autorizacion (schema private, SECURITY DEFINER, search_path vacio)
-- Se usan dentro de politicas RLS para evitar recursion y evaluaciones por fila.
-- Cada uno verifica la identidad del usuario actual con auth.uid().
-- ============================================================================

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'
  );
$$;

create or replace function private.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  );
$$;

-- Verdadero si p_user_id pertenece al negocio (dueno o empleado).
create or replace function private.is_user_business_member(p_business_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_users bu
    where bu.business_id = p_business_id
      and bu.user_id = p_user_id
  ) or exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = p_user_id
  );
$$;

-- Verdadero si el usuario actual es admin, dueno o empleado del negocio.
create or replace function private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or private.is_user_business_member(p_business_id, (select auth.uid()));
$$;

-- Verdadero si el usuario actual es admin, dueno, o empleado con el permiso dado.
create or replace function private.has_permission(p_business_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or private.is_business_owner(p_business_id)
      or exists (
        select 1
        from public.business_users bu
        where bu.business_id = p_business_id
          and bu.user_id = (select auth.uid())
          and bu.permissions @> array[p_permission]
      );
$$;

-- ============================================================================
-- Triggers de dominio
-- ============================================================================

-- Crea el perfil publico cuando Supabase Auth registra un usuario.
-- El rol NUNCA se toma de user_metadata (editable por el usuario).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, preferred_language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case
      when new.raw_user_meta_data ->> 'preferred_language' ~ '^[a-z]{2}(-[A-Z]{2})?$'
        then new.raw_user_meta_data ->> 'preferred_language'
      else 'es'
    end
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Mantiene sincronizado el email si cambia en auth.users.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
    set email = new.email
    where id = new.id
      and email is distinct from new.email;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

-- Al crear un negocio: el dueno queda como miembro 'owner' y su rol global
-- pasa de client a business_owner.
create or replace function private.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_users (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  update public.users
    set role = 'business_owner'
    where id = new.owner_id
      and role = 'client';

  return new;
end;
$$;

create trigger on_business_created
  after insert on public.businesses
  for each row execute function private.handle_new_business();

-- Al agregar un empleado: valida los permisos contra el catalogo y promueve
-- el rol global de client a business_employee.
create or replace function private.handle_business_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unknown_permission text;
begin
  select p
    into unknown_permission
    from unnest(new.permissions) as p
    where not exists (select 1 from public.permissions perm where perm.name = p)
    limit 1;

  if unknown_permission is not null then
    raise exception 'Permiso desconocido: %', unknown_permission
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and new.role <> 'owner' then
    update public.users
      set role = 'business_employee'
      where id = new.user_id
        and role = 'client';
  end if;

  return new;
end;
$$;

create trigger on_business_user_change
  before insert or update on public.business_users
  for each row execute function private.handle_business_user_change();
