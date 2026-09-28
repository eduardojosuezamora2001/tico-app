-- México y Colombia: dirección solo hasta municipio (sin colonia ni corregimiento).

-- Reasignar direcciones que apunten a nivel 3 hacia el municipio padre.
update public.addresses a
set administrative_division_id = d.parent_id
from public.administrative_divisions d
join public.countries c on c.id = d.country_id
where a.administrative_division_id = d.id
  and d.level = 3
  and c.code in ('MX', 'CO');

delete from public.administrative_divisions d
using public.countries c
where d.country_id = c.id
  and c.code in ('MX', 'CO')
  and d.level = 3;

delete from public.country_administrative_levels cal
using public.countries c
where cal.country_id = c.id
  and c.code in ('MX', 'CO')
  and cal.level = 3;
