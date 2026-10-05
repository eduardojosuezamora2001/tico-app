-- ~200 negocios demo, 15 dueños, equipo, cadenas y catálogo básico.
-- Dueños: demo-scale-owner-01@ticoapp.demo … demo-scale-owner-15@ticoapp.demo / DemoTico2026!
-- Idempotente: corre solo si el primer dueño scale no existe.

create or replace function private.demo_scale_seed_auth_user(
  p_id uuid,
  p_email text,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id = p_id) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('DemoTico2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    p_id,
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
end;
$$;

do $$
declare
  owner_ids uuid[] := array[
    'c1000001-0001-4001-8001-000000000001'::uuid,
    'c1000002-0002-4002-8002-000000000002'::uuid,
    'c1000003-0003-4003-8003-000000000003'::uuid,
    'c1000004-0004-4004-8004-000000000004'::uuid,
    'c1000005-0005-4005-8005-000000000005'::uuid,
    'c1000006-0006-4006-8006-000000000006'::uuid,
    'c1000007-0007-4007-8007-000000000007'::uuid,
    'c1000008-0008-4008-8008-000000000008'::uuid,
    'c1000009-0009-4009-8009-000000000009'::uuid,
    'c1000010-0010-4010-8010-000000000010'::uuid,
    'c1000011-0011-4011-8011-000000000011'::uuid,
    'c1000012-0012-4012-8012-000000000012'::uuid,
    'c1000013-0013-4013-8013-000000000013'::uuid,
    'c1000014-0014-4014-8014-000000000014'::uuid,
    'c1000015-0015-4015-8015-000000000015'::uuid
  ];
  staff_ids uuid[];
  chain_ids uuid[];
  biz_id uuid;
  owner_id uuid;
  co_owner_id uuid;
  manager_id uuid;
  employee_id uuid;
  chain_id uuid;
  cat_label text;
  cat_slug text;
  is_food boolean;
  biz_name text;
  i int;
  j int;
  n int;
  lat double precision;
  lng double precision;
  prefixes text[] := array[
    'Central', 'Nuevo', 'El', 'La', 'Don', 'Doña', 'San', 'Santa', 'Metro', 'Plaza', 'Express', 'Premium'
  ];
  suffixes text[] := array[
    'Parque', 'Sol', 'Luna', 'Río', 'Valle', 'Centro', 'Norte', 'Sur', 'Verde', 'Azul', 'Real', 'Familiar'
  ];
  product_names text[] := array[
    'Artículo destacado', 'Oferta del día', 'Producto básico', 'Edición limitada', 'Paquete económico',
    'Referencia premium', 'Stock local', 'Novedad', 'Clásico de la casa'
  ];
  service_names text[] := array[
    'Servicio a domicilio', 'Consulta express', 'Mantenimiento básico', 'Instalación', 'Diagnóstico',
    'Plan mensual', 'Sesión estándar'
  ];
  menu_sections text[] := array['Entradas', 'Platos fuertes', 'Bebidas', 'Postres'];
  menu_items text[][] := array[
    array['Ensalada mixta', 'Sopa del día', 'Nachos'],
    array['Casado tradicional', 'Pasta al pesto', 'Hamburguesa artesanal'],
    array['Fresco natural', 'Café chorreado', 'Refresco 600 ml'],
    array['Flan casero', 'Brownie', 'Helado']
  ];
begin
  if exists (
    select 1 from public.businesses where id = 'f4000000-0001-4000-8000-000000000001'::uuid
  ) then
    return;
  end if;

  for i in 1..15 loop
    perform private.demo_scale_seed_auth_user(
      owner_ids[i],
      format('demo-scale-owner-%s@ticoapp.demo', lpad(i::text, 2, '0')),
      format('Dueña demo %s', i)
    );
  end loop;

  staff_ids := array[]::uuid[];
  for i in 1..50 loop
    staff_ids := staff_ids || format(
      'd2000000-%s-4000-8000-%s',
      lpad(i::text, 4, '0'),
      lpad(i::text, 12, '0')
    )::uuid;
    perform private.demo_scale_seed_auth_user(
      staff_ids[i],
      format('demo-scale-staff-%s@ticoapp.demo', lpad(i::text, 2, '0')),
      format('Colaborador demo %s', i)
    );
  end loop;

  chain_ids := array[]::uuid[];
  for i in 1..12 loop
    chain_id := format(
      'e3000000-%s-4000-8000-%s',
      lpad(i::text, 4, '0'),
      lpad(i::text, 12, '0')
    )::uuid;
    chain_ids := chain_ids || chain_id;
    insert into public.business_chains (id, name, description, created_by)
    values (
      chain_id,
      format('Cadena demo %s', i),
      'Marca de prueba con varias sedes.',
      owner_ids[1 + ((i - 1) % 15)]
    );
    insert into public.business_chain_admins (chain_id, user_id)
    values (chain_id, owner_ids[1 + ((i - 1) % 15)])
    on conflict do nothing;
  end loop;

  for i in 1..200 loop
    owner_id := owner_ids[1 + ((i - 1) % 15)];
    manager_id := staff_ids[1 + ((i - 1) % 50)];
    employee_id := staff_ids[1 + ((i + 17) % 50)];
    biz_id := format(
      'f4000000-%s-4000-8000-%s',
      lpad(i::text, 4, '0'),
      lpad(i::text, 12, '0')
    )::uuid;

    select c.legacy_label, c.slug
    into cat_label, cat_slug
    from public.marketplace_business_categories c
    order by random()
    limit 1;

    if cat_label is null then
      cat_label := 'Pulpería';
      cat_slug := 'tiendas';
    end if;

    is_food := cat_slug = 'comida-bebida'
      or cat_label ilike any (array['%restaurante%', '%soda%', '%comida%', '%bebida%']);

    biz_name := prefixes[1 + (i % array_length(prefixes, 1))]
      || ' '
      || cat_label
      || ' '
      || suffixes[1 + ((i * 3) % array_length(suffixes, 1))]
      || ' '
      || i::text;

    lat := 9.90 + (random() * 0.25);
    lng := -84.20 + (random() * 0.35);

    chain_id := null;
    if i <= 96 then
      chain_id := chain_ids[1 + ((i - 1) % 12)];
    end if;

    insert into public.businesses (
      id, owner_id, name, description, category,
      latitude, longitude, address, whatsapp_number, is_active, is_draft, chain_id
    ) values (
      biz_id,
      owner_id,
      biz_name,
      format('Negocio de prueba #%s en %s.', i, cat_label),
      cat_label,
      lat,
      lng,
      format('Dirección demo %s, Costa Rica', i),
      format('+5068889%05s', 10000 + i),
      true,
      false,
      chain_id
    );

    insert into public.business_modules (business_id, module_name, enabled)
    values
      (biz_id, 'products', true),
      (biz_id, 'services', not is_food or random() < 0.35)
    on conflict (business_id, module_name) do update set enabled = excluded.enabled;

    if is_food then
      insert into public.business_modules (business_id, module_name, enabled)
      values (biz_id, 'menu', true)
      on conflict (business_id, module_name) do update set enabled = true;
    end if;

    insert into public.business_users (business_id, user_id, role, permissions, is_active)
    values
      (biz_id, owner_id, 'owner', array[]::text[], true),
      (biz_id, manager_id, 'manager', array[]::text[], true),
      (biz_id, employee_id, 'employee', array[]::text[], true)
    on conflict (business_id, user_id) do nothing;

    if random() < 0.22 then
      co_owner_id := owner_ids[1 + ((i + 5) % 15)];
      if co_owner_id <> owner_id then
        insert into public.business_users (business_id, user_id, role, permissions, is_active)
        values (biz_id, co_owner_id, 'owner', array[]::text[], true)
        on conflict (business_id, user_id) do nothing;
      end if;
    end if;

    n := 3 + floor(random() * 6)::int;
    for j in 1..n loop
      insert into public.products (business_id, name, description, price, stock, created_by)
      values (
        biz_id,
        product_names[1 + ((i + j) % array_length(product_names, 1))] || ' ' || j::text,
        'Producto generado para datos demo.',
        (500 + floor(random() * 12000))::numeric,
        5 + floor(random() * 80)::int,
        owner_id
      );
    end loop;

    n := 2 + floor(random() * 4)::int;
    for j in 1..n loop
      insert into public.services (business_id, name, description, price, duration_minutes, category, created_by)
      values (
        biz_id,
        service_names[1 + ((i + j) % array_length(service_names, 1))],
        'Servicio demo para pruebas de catálogo.',
        (1500 + floor(random() * 25000))::numeric,
        30 + (j * 15),
        'Servicios',
        owner_id
      );
    end loop;

    if is_food then
      for j in 1..array_length(menu_sections, 1) loop
        insert into public.menus (business_id, section, name, description, price, sort_order, created_by)
        select
          biz_id,
          menu_sections[j],
          menu_items[j][1 + mod(i + j - 1, 3)],
          'Plato demo del menú.',
          (1200 + floor(random() * 6500))::numeric,
          j,
          owner_id;
      end loop;
    end if;
  end loop;
end $$;

drop function if exists private.demo_scale_seed_auth_user(uuid, text, text);
