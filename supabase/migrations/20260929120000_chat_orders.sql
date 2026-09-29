-- Pedidos de chat: registro persistente con etapas de cumplimiento.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid not null unique references public.messages (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'denied')),
  fulfillment_stage text
    check (fulfillment_stage is null or fulfillment_stage in ('preparing', 'ready', 'delivered')),
  business_name text not null,
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  decided_at timestamptz,
  stage_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_fulfillment_status_check check (
    (status = 'accepted' and fulfillment_stage in ('preparing', 'ready', 'delivered'))
    or (status in ('pending', 'denied') and fulfillment_stage is null)
  )
);

comment on table public.orders is
  'Pedidos enviados por chat. El mensaje embebido es la vista; esta tabla es la fuente de verdad para estado y etapas.';

create index orders_conversation_created_idx
  on public.orders (conversation_id, created_at desc);

create index orders_business_status_idx
  on public.orders (business_id, status, created_at desc);

create index orders_customer_idx
  on public.orders (customer_id, created_at desc);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create or replace function private.protect_order_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.conversation_id is distinct from old.conversation_id
     or new.message_id is distinct from old.message_id
     or new.customer_id is distinct from old.customer_id
     or new.lines is distinct from old.lines
     or new.subtotal is distinct from old.subtotal
     or new.total is distinct from old.total
     or new.business_name is distinct from old.business_name then
    raise exception 'No se puede alterar la identidad del pedido';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_order_identity on public.orders;
create trigger protect_order_identity
  before update on public.orders
  for each row execute function private.protect_order_identity();

alter table public.orders enable row level security;

create policy "orders: customer or business can read"
  on public.orders for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or (select private.is_active_business_member(business_id))
    or (select private.is_business_owner(business_id))
  );

create policy "orders: customer can create for own conversation"
  on public.orders for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'pending'
    and fulfillment_stage is null
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.customer_id = (select auth.uid())
        and c.business_id = orders.business_id
    )
  );

create policy "orders: staff can decide or advance"
  on public.orders for update
  to authenticated
  using (
    (select private.is_active_business_member(business_id))
    or (select private.is_business_owner(business_id))
  )
  with check (
    (select private.is_active_business_member(business_id))
    or (select private.is_business_owner(business_id))
  );

revoke all on public.orders from anon, authenticated;
grant select, insert on public.orders to authenticated;
grant update (status, fulfillment_stage, decided_at, stage_updated_at) on public.orders to authenticated;
