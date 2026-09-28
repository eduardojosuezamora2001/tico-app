-- Migra negocios existentes con provincia/cantón/distrito a addresses (Costa Rica).

do $$
declare
  rec record;
  addr_id uuid;
  div_id uuid;
  cr_country constant uuid := 'c1111111-1111-4111-8111-111111111111';
begin
  for rec in
    select b.*
    from public.businesses b
    where b.address_id is null
      and (
        b.province is not null
        or b.canton is not null
        or b.district is not null
        or b.address is not null
        or b.latitude is not null
      )
  loop
    div_id := null;

    if rec.district is not null and rec.canton is not null and rec.province is not null then
      select d.id into div_id
      from public.administrative_divisions p
      join public.administrative_divisions c on c.parent_id = p.id and c.name = rec.canton
      join public.administrative_divisions d on d.parent_id = c.id and d.name = rec.district
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    if div_id is null and rec.canton is not null and rec.province is not null then
      select c.id into div_id
      from public.administrative_divisions p
      join public.administrative_divisions c on c.parent_id = p.id and c.name = rec.canton
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    if div_id is null and rec.province is not null then
      select p.id into div_id
      from public.administrative_divisions p
      where p.country_id = cr_country and p.level = 1 and p.name = rec.province
      limit 1;
    end if;

    insert into public.addresses (
      country_id,
      administrative_division_id,
      address_line_1,
      latitude,
      longitude,
      formatted_address
    )
    values (
      cr_country,
      div_id,
      coalesce(nullif(trim(rec.address), ''), 'Sin dirección'),
      rec.latitude,
      rec.longitude,
      rec.address
    )
    returning id into addr_id;

    update public.businesses
    set address_id = addr_id
    where id = rec.id;
  end loop;
end $$;
