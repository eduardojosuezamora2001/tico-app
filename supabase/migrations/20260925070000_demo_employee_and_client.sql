-- Cuentas de prueba junto a la dueña duena@ticoapp.demo / DemoTico2026!
-- Empleado de Soda El Parque: empleado@ticoapp.demo / DemoTico2026!
-- Cliente: cliente@ticoapp.demo / DemoTico2026!

do $$
declare
  employee_id uuid := 'a2222222-2222-4222-8222-222222222222';
  client_id uuid := 'a3333333-3333-4333-8333-333333333333';
  soda_id uuid := 'b1111111-1111-4111-8111-111111111111';
begin
  if not exists (select 1 from auth.users where id = employee_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      employee_id,
      'authenticated',
      'authenticated',
      'empleado@ticoapp.demo',
      extensions.crypt('DemoTico2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Luis Mora"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      employee_id,
      employee_id,
      jsonb_build_object('sub', employee_id::text, 'email', 'empleado@ticoapp.demo'),
      'email',
      employee_id::text,
      now(),
      now(),
      now()
    );

    insert into public.business_users (business_id, user_id, role, permissions)
    values (
      soda_id,
      employee_id,
      'employee',
      array['gallery:upload', 'menu:view', 'menu:create', 'menu:edit_own']
    );
  end if;

  if not exists (select 1 from auth.users where id = client_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      client_id,
      'authenticated',
      'authenticated',
      'cliente@ticoapp.demo',
      extensions.crypt('DemoTico2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Ana Rojas"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      client_id,
      client_id,
      jsonb_build_object('sub', client_id::text, 'email', 'cliente@ticoapp.demo'),
      'email',
      client_id::text,
      now(),
      now(),
      now()
    );
  end if;
end $$;
