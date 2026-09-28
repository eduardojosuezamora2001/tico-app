-- Seeds iniciales: Costa Rica, Colombia y México (UUIDs válidos hex).

insert into public.countries (id, code, name, native_name, phone_code, currency_code, default_language)
values
  ('c1111111-1111-4111-8111-111111111111', 'CR', 'Costa Rica', 'Costa Rica', '+506', 'CRC', 'es'),
  ('c2222222-2222-4222-8222-222222222222', 'CO', 'Colombia', 'Colombia', '+57', 'COP', 'es'),
  ('c3333333-3333-4333-8333-333333333333', 'MX', 'México', 'México', '+52', 'MXN', 'es')
on conflict (code) do nothing;

insert into public.country_administrative_levels (country_id, level, type, label)
values
  ('c1111111-1111-4111-8111-111111111111', 1, 'province', 'Provincia'),
  ('c1111111-1111-4111-8111-111111111111', 2, 'canton', 'Cantón'),
  ('c1111111-1111-4111-8111-111111111111', 3, 'district', 'Distrito'),
  ('c2222222-2222-4222-8222-222222222222', 1, 'department', 'Departamento'),
  ('c2222222-2222-4222-8222-222222222222', 2, 'municipality', 'Municipio'),
  ('c3333333-3333-4333-8333-333333333333', 1, 'state', 'Estado'),
  ('c3333333-3333-4333-8333-333333333333', 2, 'municipality', 'Municipio')
on conflict (country_id, level) do nothing;

-- Costa Rica: provincias
insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)
values
  ('d1c10001-0001-4001-8001-000000000001', 'c1111111-1111-4111-8111-111111111111', null, 'San José', 'province', 1, 'SJ'),
  ('d1c10002-0002-4002-8002-000000000002', 'c1111111-1111-4111-8111-111111111111', null, 'Alajuela', 'province', 1, 'AL'),
  ('d1c10003-0003-4003-8003-000000000003', 'c1111111-1111-4111-8111-111111111111', null, 'Cartago', 'province', 1, 'CA'),
  ('d1c10004-0004-4004-8004-000000000004', 'c1111111-1111-4111-8111-111111111111', null, 'Heredia', 'province', 1, 'HE'),
  ('d1c10005-0005-4005-8005-000000000005', 'c1111111-1111-4111-8111-111111111111', null, 'Guanacaste', 'province', 1, 'GU'),
  ('d1c10006-0006-4006-8006-000000000006', 'c1111111-1111-4111-8111-111111111111', null, 'Puntarenas', 'province', 1, 'PU'),
  ('d1c10007-0007-4007-8007-000000000007', 'c1111111-1111-4111-8111-111111111111', null, 'Limón', 'province', 1, 'LI')
on conflict (id) do nothing;

-- Cantones CR completos: ver migración 20260928003000_cr_cantons_full.sql

-- Distritos CR completos: ver migración 20260928004000_cr_districts_full.sql

-- Colombia: departamentos completos → 20260928006100_co_departments.sql
-- Antioquia municipios → 20260928006200_co_ant_municipalities.sql
-- México
insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)
values
  ('d1c30001-0001-4001-8001-000000000061', 'c3333333-3333-4333-8333-333333333333', null, 'Ciudad de México', 'state', 1, 'CMX'),
  ('d1c30002-0002-4002-8002-000000000062', 'c3333333-3333-4333-8333-333333333333', null, 'Jalisco', 'state', 1, 'JAL')
on conflict (id) do nothing;

-- Municipios Jalisco completos: ver migración 20260928005000_mx_jal_municipalities.sql

insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)
values
  ('d2c30001-0001-4001-8001-000000000071', 'c3333333-3333-4333-8333-333333333333', 'd1c30001-0001-4001-8001-000000000061', 'Cuauhtémoc', 'municipality', 2, '015'),
  ('d2c30002-0002-4002-8002-000000000072', 'c3333333-3333-4333-8333-333333333333', 'd1c30002-0002-4002-8002-000000000062', 'Guadalajara', 'municipality', 2, '039')
on conflict (id) do nothing;
