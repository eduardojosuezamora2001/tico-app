-- Cadenas multi-sucursal: marca + sedes (businesses.chain_id).

create table public.business_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null,
  description text,
  logo_url text,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_chains_slug_len check (char_length(slug) between 1 and 140)
);

create unique index business_chains_slug_idx on public.business_chains (slug);

comment on table public.business_chains is
  'Marca o cadena comercial que agrupa varias sedes (businesses).';

create trigger set_business_chains_updated_at
  before update on public.business_chains
  for each row execute function private.set_updated_at();

create table public.business_chain_admins (
  chain_id uuid not null references public.business_chains (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chain_id, user_id)
);

comment on table public.business_chain_admins is
  'Usuarios que pueden administrar la cadena y vincular sedes.';

alter table public.businesses
  add column if not exists chain_id uuid references public.business_chains (id) on delete set null;

create index if not exists businesses_chain_id_idx
  on public.businesses (chain_id)
  where chain_id is not null;

-- Slug automático para cadenas (misma lógica que negocios).
create or replace function private.set_business_chain_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  if tg_op = 'UPDATE'
    and new.name is not distinct from old.name
    and new.slug is not null
    and new.slug <> '' then
    return new;
  end if;

  base := private.slugify(new.name);
  if base = '' then
    base := 'cadena';
  end if;
  candidate := base;

  while exists (
    select 1
    from public.business_chains
    where slug = candidate
      and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

revoke all on function private.set_business_chain_slug() from public, anon, authenticated;

create trigger set_business_chain_slug
  before insert or update of name on public.business_chains
  for each row execute function private.set_business_chain_slug();

-- El creador queda como administrador de la cadena.
create or replace function private.handle_new_business_chain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_chain_admins (chain_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_business_chain() from public, anon, authenticated;

create trigger handle_new_business_chain
  after insert on public.business_chains
  for each row execute function private.handle_new_business_chain();

create or replace function private.is_business_chain_admin(p_chain_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_chain_admins ca
    where ca.chain_id = p_chain_id
      and ca.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.businesses b
    join public.business_users bu on bu.business_id = b.id
    where b.chain_id = p_chain_id
      and bu.user_id = (select auth.uid())
      and bu.role = 'owner'
  )
  or exists (
    select 1
    from public.businesses b
    where b.chain_id = p_chain_id
      and b.owner_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_business_for_chain(p_business_id uuid)
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
      and bu.user_id = (select auth.uid())
      and bu.role = 'owner'
  )
  or exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  );
$$;

alter table public.business_chains enable row level security;
alter table public.business_chain_admins enable row level security;

create policy "business_chains: admins and members can read"
  on public.business_chains
  for select
  to authenticated
  using (
    private.is_business_chain_admin(id)
    or exists (
      select 1
      from public.businesses b
      join public.business_users bu on bu.business_id = b.id
      where b.chain_id = business_chains.id
        and bu.user_id = (select auth.uid())
    )
  );

create policy "business_chains: authenticated can create"
  on public.business_chains
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "business_chains: admins can update"
  on public.business_chains
  for update
  to authenticated
  using (private.is_business_chain_admin(id))
  with check (private.is_business_chain_admin(id));

create policy "business_chain_admins: chain admins can read"
  on public.business_chain_admins
  for select
  to authenticated
  using (private.is_business_chain_admin(chain_id));

grant select, insert, update on public.business_chains to authenticated;
grant select on public.business_chain_admins to authenticated;
