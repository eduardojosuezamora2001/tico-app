-- Cantones 612 Monteverde y 613 Puerto Jiménez (Puntarenas, creados 2021–2022).

insert into public.administrative_divisions (id, country_id, parent_id, name, type, level, code)
values
  ('d2c10612-0001-4001-8001-000000000612', 'c1111111-1111-4111-8111-111111111111', 'd1c10006-0006-4006-8006-000000000006', 'Monteverde', 'canton', 2, '612'),
  ('d2c10613-0001-4001-8001-000000000613', 'c1111111-1111-4111-8111-111111111111', 'd1c10006-0006-4006-8006-000000000006', 'Puerto Jiménez', 'canton', 2, '613')
on conflict (id) do nothing;
