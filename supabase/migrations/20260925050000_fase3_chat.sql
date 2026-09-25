-- Conversaciones del usuario y barrido de mensajes vencidos.

create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

create index if not exists messages_receiver_created_idx
  on public.messages (receiver_id, created_at desc);

create or replace function public.list_my_conversations()
returns table (
  business_id uuid,
  business_name text,
  business_slug text,
  peer_id uuid,
  peer_name text,
  last_text text,
  last_at timestamptz,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select m.*
    from public.messages m
    where m.sender_id = (select auth.uid())
       or m.receiver_id = (select auth.uid())
  ),
  ranked as (
    select
      business_id,
      case
        when sender_id = (select auth.uid()) then receiver_id
        else sender_id
      end as peer_id,
      text as last_text,
      created_at as last_at,
      row_number() over (
        partition by business_id, case
          when sender_id = (select auth.uid()) then receiver_id
          else sender_id
        end
        order by created_at desc
      ) as rn
    from mine
  )
  select
    r.business_id,
    b.name,
    b.slug,
    r.peer_id,
    u.full_name,
    r.last_text,
    r.last_at,
    (
      select count(*)::integer
      from mine m
      where m.business_id = r.business_id
        and m.sender_id = r.peer_id
        and m.receiver_id = (select auth.uid())
        and not m.is_read
    ) as unread_count
  from ranked r
  join public.businesses b on b.id = r.business_id
  join public.users u on u.id = r.peer_id
  where r.rn = 1
  order by r.last_at desc;
$$;

revoke all on function public.list_my_conversations() from public, anon;
grant execute on function public.list_my_conversations() to authenticated, service_role;

create or replace function public.purge_expired_messages()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.messages m
  using public.businesses b
  where m.business_id = b.id
    and m.created_at < now() - make_interval(days => b.chat_retention_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_messages() from public, anon, authenticated;
grant execute on function public.purge_expired_messages() to service_role;
