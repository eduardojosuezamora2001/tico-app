-- Cola compartida: el cliente escribe al local, un miembro activo atiende
-- y el dueño puede leer los hilos de sus empleados sin tomarlos.

alter table public.business_users
  add column if not exists is_active boolean not null default true;

comment on column public.business_users.is_active is
  'Miembro que puede ver la cola y atender. El dueño permanece activo.';

create index if not exists business_users_active_idx
  on public.business_users (business_id, user_id)
  where is_active;

create or replace function private.protect_owner_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'owner' and new.is_active = false then
    raise exception 'El dueño no se puede desactivar';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_owner_membership on public.business_users;
create trigger protect_owner_membership
  before insert or update on public.business_users
  for each row execute function private.protect_owner_membership();

create or replace function private.is_active_business_member(p_business_id uuid)
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
      and bu.is_active
  );
$$;

comment on function private.is_active_business_member(uuid) is
  'Verdadero si el usuario actual es un miembro activo del negocio.';

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  assignee_id uuid references public.users (id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'open')),
  last_text text not null default '',
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_id)
);

comment on table public.conversations is
  'Hilo de un cliente con un local. assignee_id es quien lo atiende; nulo si sigue en espera.';

create index if not exists conversations_business_last_idx
  on public.conversations (business_id, last_at desc);

create index if not exists conversations_customer_idx
  on public.conversations (customer_id);

create index if not exists conversations_assignee_idx
  on public.conversations (assignee_id)
  where assignee_id is not null;

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create or replace function private.protect_conversation_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.customer_id is distinct from old.customer_id then
    raise exception 'No se puede cambiar el local ni el cliente de la conversación';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_conversation_identity on public.conversations;
create trigger protect_conversation_identity
  before update on public.conversations
  for each row execute function private.protect_conversation_identity();

alter table public.messages
  add column if not exists conversation_id uuid;

alter table public.messages
  alter column receiver_id drop not null;

-- Hilos ya existentes: el cliente es quien no pertenece al local.
insert into public.conversations (business_id, customer_id, assignee_id, status, last_text, last_at)
select
  p.business_id,
  case
    when not private.is_user_business_member(p.business_id, p.user_a) then p.user_a
    else p.user_b
  end as customer_id,
  case
    when private.is_user_business_member(p.business_id, p.user_a)
     and not private.is_user_business_member(p.business_id, p.user_b) then p.user_a
    when private.is_user_business_member(p.business_id, p.user_b)
     and not private.is_user_business_member(p.business_id, p.user_a) then p.user_b
    else (select b.owner_id from public.businesses b where b.id = p.business_id)
  end as assignee_id,
  'open',
  lm.text,
  lm.created_at
from (
  select distinct
    business_id,
    least(sender_id, receiver_id) as user_a,
    greatest(sender_id, receiver_id) as user_b
  from public.messages
  where receiver_id is not null
) p
join lateral (
  select m.text, m.created_at
  from public.messages m
  where m.business_id = p.business_id
    and m.sender_id in (p.user_a, p.user_b)
    and m.receiver_id in (p.user_a, p.user_b)
  order by m.created_at desc
  limit 1
) lm on true
on conflict (business_id, customer_id) do nothing;

update public.messages m
set conversation_id = c.id
from public.conversations c
where m.conversation_id is null
  and m.business_id = c.business_id
  and (
    (m.sender_id = c.customer_id and (m.receiver_id = c.assignee_id or m.receiver_id = c.customer_id))
    or (m.receiver_id = c.customer_id and (m.sender_id = c.assignee_id or m.sender_id = c.customer_id))
    or (m.sender_id = c.customer_id and m.receiver_id is null)
    or (m.receiver_id = c.customer_id and m.sender_id is not null and m.sender_id <> c.customer_id)
  );

do $$
begin
  if exists (select 1 from public.messages where conversation_id is null) then
    raise exception 'Hay mensajes sin conversación';
  end if;
end $$;

alter table public.messages
  alter column conversation_id set not null;

alter table public.messages
  drop constraint if exists messages_conversation_id_fkey;

alter table public.messages
  add constraint messages_conversation_id_fkey
  foreign key (conversation_id) references public.conversations (id) on delete cascade;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create or replace function private.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_text = new.text,
      last_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation_on_message on public.messages;
create trigger touch_conversation_on_message
  after insert on public.messages
  for each row execute function private.touch_conversation_on_message();

alter table public.conversations enable row level security;

drop policy if exists "conversations: parties can read" on public.conversations;
create policy "conversations: parties can read"
  on public.conversations for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or (select private.is_active_business_member(business_id))
  );

drop policy if exists "conversations: customer can start" on public.conversations;
create policy "conversations: customer can start"
  on public.conversations for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and assignee_id is null
    and status = 'waiting'
    and not (select private.is_user_business_member(business_id, (select auth.uid())))
  );

drop policy if exists "conversations: active member can claim or take" on public.conversations;
create policy "conversations: active member can claim or take"
  on public.conversations for update
  to authenticated
  using ((select private.is_active_business_member(business_id)))
  with check (
    assignee_id = (select auth.uid())
    and status = 'open'
    and (select private.is_active_business_member(business_id))
  );

revoke all on public.conversations from anon, authenticated;
grant select, insert on public.conversations to authenticated;
grant update (assignee_id, status) on public.conversations to authenticated;

drop policy if exists "messages: participants or chat:view_all can read" on public.messages;
create policy "messages: customer, assignee, or owner can read"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.customer_id = (select auth.uid())
          or (
            c.assignee_id = (select auth.uid())
            and (select private.is_active_business_member(c.business_id))
          )
          or (select private.is_business_owner(c.business_id))
        )
    )
  );

drop policy if exists "messages: sender can insert" on public.messages;
create policy "messages: customer or assignee can insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.business_id = messages.business_id
        and (
          c.customer_id = (select auth.uid())
          or (
            c.assignee_id = (select auth.uid())
            and (select private.is_active_business_member(c.business_id))
          )
        )
    )
  );

drop policy if exists "messages: receiver can mark as read" on public.messages;
create policy "messages: counterpart can mark as read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.customer_id = (select auth.uid())
          or (
            c.assignee_id = (select auth.uid())
            and (select private.is_active_business_member(c.business_id))
          )
        )
    )
  )
  with check (
    sender_id <> (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.customer_id = (select auth.uid())
          or (
            c.assignee_id = (select auth.uid())
            and (select private.is_active_business_member(c.business_id))
          )
        )
    )
  );

drop policy if exists "users: select conversation parties" on public.users;
create policy "users: select conversation parties"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where (c.customer_id = users.id or c.assignee_id = users.id)
        and (
          c.customer_id = (select auth.uid())
          or (select private.is_active_business_member(c.business_id))
          or (select private.is_business_owner(c.business_id))
        )
    )
  );

drop function if exists public.list_my_conversations();

create function public.list_my_conversations()
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  customer_id uuid,
  customer_name text,
  assignee_id uuid,
  assignee_name text,
  status text,
  last_text text,
  last_at timestamptz,
  unread_count integer,
  viewer_role text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.business_id,
    b.name,
    b.slug,
    c.customer_id,
    cu.full_name,
    c.assignee_id,
    au.full_name,
    c.status,
    c.last_text,
    c.last_at,
    (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and not m.is_read
        and (
          c.customer_id = (select auth.uid())
          or c.assignee_id = (select auth.uid())
        )
    ) as unread_count,
    case
      when c.customer_id = (select auth.uid()) then 'customer'
      when c.assignee_id = (select auth.uid()) then 'assignee'
      when (select private.is_business_owner(c.business_id)) then 'owner'
      else 'member'
    end as viewer_role
  from public.conversations c
  join public.businesses b on b.id = c.business_id
  left join public.users cu on cu.id = c.customer_id
  left join public.users au on au.id = c.assignee_id
  order by c.last_at desc;
$$;

revoke all on function public.list_my_conversations() from public, anon;
grant execute on function public.list_my_conversations() to authenticated, service_role;
