-- Negocios de prueba para el directorio publico.
-- Duena: duena@ticoapp.demo / DemoTico2026!
-- Idempotente: si el usuario demo ya existe, no vuelve a insertar.

do $$
declare
  owner_id uuid := 'a1111111-1111-4111-8111-111111111111';
  soda_id uuid := 'b1111111-1111-4111-8111-111111111111';
  farmacia_id uuid := 'b2222222-2222-4222-8222-222222222222';
  ferreteria_id uuid := 'b3333333-3333-4333-8333-333333333333';
  pulperia_id uuid := 'b4444444-4444-4444-8444-444444444444';
  belleza_id uuid := 'b5555555-5555-4555-8555-555555555555';
  servicios_id uuid := 'b6666666-6666-4666-8666-666666666666';
begin
  if exists (select 1 from auth.users where id = owner_id) then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    owner_id,
    'authenticated',
    'authenticated',
    'duena@ticoapp.demo',
    extensions.crypt('DemoTico2026!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"María Solano"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    owner_id,
    owner_id,
    jsonb_build_object('sub', owner_id::text, 'email', 'duena@ticoapp.demo'),
    'email',
    owner_id::text,
    now(),
    now(),
    now()
  );

  insert into public.businesses (
    id, owner_id, name, description, category,
    latitude, longitude, address, whatsapp_number, is_active
  ) values
    (soda_id, owner_id, 'Soda El Parque', 'Casados, cafés y frescos en el centro.', 'Sodas', 9.933, -84.079, 'Avenida Central, San José', '+50688881001', true),
    (farmacia_id, owner_id, 'Farmacia Central', 'Medicamentos y cuidado personal.', 'Farmacia', 9.928, -84.084, 'Calle 2, San José', '+50688881002', true),
    (ferreteria_id, owner_id, 'Ferretería El Clavo', 'Herramientas y materiales para el hogar.', 'Ferretería', 9.941, -84.102, 'Escazú centro', '+50688881003', true),
    (pulperia_id, owner_id, 'Pulpería Don Chepe', 'Abarrotes, verduras y recargas.', 'Pulpería', 9.998, -84.117, 'Heredia centro', '+50688881004', true),
    (belleza_id, owner_id, 'Belleza Luna', 'Corte, color y uñas.', 'Belleza', 9.865, -83.922, 'Cartago centro', '+50688881005', true),
    (servicios_id, owner_id, 'Taller El Tico', 'Plomería y electricidad a domicilio.', 'Servicios', 10.016, -84.214, 'Alajuela centro', '+50688881006', true);

  insert into public.business_modules (business_id, module_name, enabled) values
    (soda_id, 'menu', true),
    (farmacia_id, 'products', true),
    (ferreteria_id, 'products', true),
    (pulperia_id, 'products', true),
    (belleza_id, 'services', true),
    (servicios_id, 'services', true);

  insert into public.menus (business_id, section, name, description, price, sort_order, created_by) values
    (soda_id, 'Platos', 'Casado de pollo', 'Arroz, frijoles, ensalada y pollo.', 4500, 1, owner_id),
    (soda_id, 'Platos', 'Casado de pescado', 'Arroz, frijoles, ensalada y pescado.', 5200, 2, owner_id),
    (soda_id, 'Bebidas', 'Fresco de cas', 'Vaso de 16 oz.', 1200, 3, owner_id);

  insert into public.products (business_id, name, description, price, stock, category, created_by) values
    (farmacia_id, 'Acetaminofén 500 mg', 'Caja de 20 tabletas.', 1800, 40, 'Medicamentos', owner_id),
    (farmacia_id, 'Alcohol en gel', 'Frasco de 250 ml.', 2200, 25, 'Cuidado', owner_id),
    (ferreteria_id, 'Martillo de uña', 'Mango de fibra.', 6500, 12, 'Herramientas', owner_id),
    (ferreteria_id, 'Cinta métrica 5 m', 'Cuerpo de plástico.', 3500, 18, 'Herramientas', owner_id),
    (pulperia_id, 'Arroz 1 kg', 'Grano entero.', 1100, 60, 'Abarrotes', owner_id),
    (pulperia_id, 'Frijoles 900 g', 'Negros, empacados.', 1400, 40, 'Abarrotes', owner_id);

  insert into public.services (business_id, name, description, price, duration_minutes, category, created_by) values
    (belleza_id, 'Corte de cabello', 'Incluye lavado.', 8000, 45, 'Cabello', owner_id),
    (belleza_id, 'Manicure', 'Esmalte tradicional.', 6000, 40, 'Uñas', owner_id),
    (servicios_id, 'Destape de tubería', 'Visita en el valle central.', 15000, 60, 'Plomería', owner_id),
    (servicios_id, 'Cambio de tomacorriente', 'Mano de obra, sin materiales.', 12000, 40, 'Electricidad', owner_id);
end $$;
