-- RAG (pgvector), asistente y soporte plataforma
-- Embeddings: Voyage voyage-3-lite (512 dims)

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Conocimiento indexado (solo service role / Edge)
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('business', 'catalog_item', 'faq')),
  source_id text not null,
  business_id uuid references public.businesses (id) on delete cascade,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(512),
  content_hash text not null,
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists knowledge_chunks_business_id_idx
  on public.knowledge_chunks (business_id)
  where business_id is not null;

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_chunks enable row level security;

comment on table public.knowledge_chunks is
  'Fragmentos para RAG; embeddings Voyage 512d. Solo Edge/service_role.';

-- ---------------------------------------------------------------------------
-- FAQ estática (opcional seed)
-- ---------------------------------------------------------------------------
create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_faq_entries_updated_at on public.faq_entries;
create trigger set_faq_entries_updated_at
  before update on public.faq_entries
  for each row execute function private.set_updated_at();

alter table public.faq_entries enable row level security;

create policy "faq: read active"
  on public.faq_entries for select
  to authenticated, anon
  using (is_active = true);

create policy "faq: admin write"
  on public.faq_entries for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Asistente (historial bot)
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_threads_user_last_idx
  on public.assistant_threads (user_id, last_at desc);

drop trigger if exists set_assistant_threads_updated_at on public.assistant_threads;
create trigger set_assistant_threads_updated_at
  before update on public.assistant_threads
  for each row execute function private.set_updated_at();

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_thread_created_idx
  on public.assistant_messages (thread_id, created_at asc);

alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;

create policy "assistant_threads: own"
  on public.assistant_threads for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "assistant_messages: via thread"
  on public.assistant_messages for all
  to authenticated
  using (
    exists (
      select 1 from public.assistant_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.assistant_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Soporte plataforma (usuario <-> admin)
-- ---------------------------------------------------------------------------
create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'closed')),
  assignee_admin_id uuid references public.users (id) on delete set null,
  last_text text,
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists support_threads_status_last_idx
  on public.support_threads (status, last_at desc);

drop trigger if exists set_support_threads_updated_at on public.support_threads;
create trigger set_support_threads_updated_at
  before update on public.support_threads
  for each row execute function private.set_updated_at();

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at asc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy "support_threads: user own or admin"
  on public.support_threads for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy "support_threads: user insert own"
  on public.support_threads for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "support_threads: admin update"
  on public.support_threads for update
  to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()))
  with check ((select private.is_admin()) or user_id = (select auth.uid()));

create policy "support_messages: participant read"
  on public.support_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

create policy "support_messages: participant insert"
  on public.support_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

create policy "support_messages: participant update read"
  on public.support_messages for update
  to authenticated
  using (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

-- Rate limit simple (Edge / service)
create table if not exists public.assistant_rate_limits (
  user_id uuid primary key references public.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count int not null default 0
);

alter table public.assistant_rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- RPCs allowlisted
-- ---------------------------------------------------------------------------
create or replace function public.assistant_count_active_businesses(
  p_division_ids uuid[] default null
)
returns bigint
language sql
stable
security definer
set search_path = public, extensions
as $$
  select count(*)::bigint
  from public.businesses b
  where b.is_active = true
    and b.is_draft = false
    and (
      p_division_ids is null
      or cardinality(p_division_ids) = 0
      or exists (
        select 1
        from unnest(p_division_ids) as picked(id)
        join public.addresses a on a.id = b.address_id
        where a.administrative_division_id = picked.id
           or a.administrative_division_id in (
             select d.id from public.administrative_divisions d
             where d.parent_id = picked.id
           )
      )
    );
$$;

create or replace function public.assistant_business_exists(p_query text)
returns table (
  id uuid,
  name text,
  slug text,
  category text,
  address text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select b.id, b.name, b.slug, b.category, b.address
  from public.businesses b
  where b.is_active = true
    and b.is_draft = false
    and (
      b.id::text = btrim(p_query)
      or b.slug ilike btrim(p_query)
      or b.name ilike '%' || btrim(p_query) || '%'
    )
  order by
    case when b.id::text = btrim(p_query) then 0 when b.slug ilike btrim(p_query) then 1 else 2 end,
    b.name
  limit 5;
$$;

create or replace function public.assistant_match_chunks(
  query_embedding extensions.vector(512),
  match_count int default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  business_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    k.id,
    k.source_type,
    k.source_id,
    k.business_id,
    k.content,
    k.metadata,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks k
  where k.embedding is not null
    and (
      filter ->> 'source_type' is null
      or k.source_type = filter ->> 'source_type'
    )
    and (
      filter ->> 'business_id' is null
      or k.business_id::text = filter ->> 'business_id'
    )
  order by k.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

create or replace function public.assistant_list_embed_sources(p_limit int default 500)
returns table (
  source_type text,
  source_id text,
  business_id uuid,
  content text,
  metadata jsonb,
  content_hash text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  (
    select
      'business'::text,
      b.id::text,
      b.id,
      concat_ws(
        E'\n',
        'Negocio: ' || b.name,
        'Categoría: ' || coalesce(b.category, ''),
        'Dirección: ' || coalesce(b.address, ''),
        'Descripción: ' || coalesce(b.description, '')
      ),
      jsonb_build_object('name', b.name, 'slug', b.slug),
      md5(
        concat_ws(
          '|',
          b.name,
          coalesce(b.category, ''),
          coalesce(b.address, ''),
          coalesce(b.description, ''),
          b.updated_at::text
        )
      )
    from public.businesses b
    where b.is_active = true and b.is_draft = false
    order by b.updated_at desc
    limit p_limit
  )
  union all
  (
    select
      'catalog_item'::text,
      s.item_type || ':' || s.item_id::text,
      s.business_id,
      concat_ws(
        E'\n',
        'Ítem: ' || s.name,
        'Tipo: ' || s.item_type,
        'Negocio: ' || b.name,
        'Categoría negocio: ' || coalesce(b.category, '')
      ),
      jsonb_build_object(
        'item_type', s.item_type,
        'item_id', s.item_id,
        'business_name', b.name
      ),
      md5(
        concat_ws(
          '|',
          s.name,
          s.item_type,
          s.item_id::text,
          s.business_id::text,
          b.name,
          s.updated_at::text
        )
      )
    from public.business_catalog_search s
    join public.businesses b on b.id = s.business_id
    where b.is_active = true and b.is_draft = false
    limit p_limit
  )
  union all
  (
    select
      'faq'::text,
      f.id::text,
      null::uuid,
      concat_ws(E'\n', 'FAQ: ' || f.title, f.body),
      jsonb_build_object('slug', f.slug),
      md5(f.title || '|' || f.body)
    from public.faq_entries f
    where f.is_active = true
    limit 50
  );
$$;

create or replace function public.assistant_check_rate_limit(
  p_user_id uuid,
  p_max int default 30,
  p_window_seconds int default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.assistant_rate_limits%rowtype;
begin
  select * into row from public.assistant_rate_limits where user_id = p_user_id for update;
  if not found then
    insert into public.assistant_rate_limits (user_id, window_start, request_count)
    values (p_user_id, now(), 1);
    return true;
  end if;
  if row.window_start < now() - make_interval(secs => p_window_seconds) then
    update public.assistant_rate_limits
    set window_start = now(), request_count = 1
    where user_id = p_user_id;
    return true;
  end if;
  if row.request_count >= p_max then
    return false;
  end if;
  update public.assistant_rate_limits
  set request_count = row.request_count + 1
  where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.assistant_count_active_businesses(uuid[]) from public, anon;
revoke all on function public.assistant_business_exists(text) from public, anon;
revoke all on function public.assistant_match_chunks(extensions.vector, int, jsonb) from public, anon;
revoke all on function public.assistant_list_embed_sources(int) from public, anon;
revoke all on function public.assistant_check_rate_limit(uuid, int, int) from public, anon;

grant execute on function public.assistant_count_active_businesses(uuid[]) to service_role;
grant execute on function public.assistant_business_exists(text) to service_role;
grant execute on function public.assistant_match_chunks(extensions.vector, int, jsonb) to service_role;
grant execute on function public.assistant_list_embed_sources(int) to service_role;
grant execute on function public.assistant_check_rate_limit(uuid, int, int) to service_role;

grant select, insert, update, delete on public.knowledge_chunks to service_role;
grant select, insert, update, delete on public.assistant_rate_limits to service_role;

insert into public.faq_entries (slug, title, body, sort_order)
values
  (
    'directorio',
    'Directorio TicoApp',
    'TicoApp es un directorio de comercios locales en Costa Rica. Podés buscar negocios por nombre, categoría o provincia y ver su catálogo en la página pública de cada local.'
    , 1
  ),
  (
    'pedidos',
    'Pedidos y contacto',
    'Los pedidos se coordinan con cada negocio por WhatsApp o por el chat del local. TicoApp no procesa pagos entre usuarios y comercios en la v1.'
    , 2
  )
on conflict (slug) do nothing;
