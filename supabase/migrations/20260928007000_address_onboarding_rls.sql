-- Permite al dueño leer la dirección de su borrador al reabrir el wizard.

create policy "addresses: owner can read draft business address"
  on public.addresses for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.address_id = addresses.id
        and b.is_draft
        and (select private.is_business_owner(b.id))
    )
  );
