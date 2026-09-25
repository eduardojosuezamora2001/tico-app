create table public.business_gallery (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index business_gallery_business_sort_idx
  on public.business_gallery (business_id, sort_order, created_at);

alter table public.business_gallery enable row level security;

create policy "business_gallery: public read"
  on public.business_gallery for select
  to anon, authenticated
  using (true);

create policy "business_gallery: uploaders can insert"
  on public.business_gallery for insert
  to authenticated
  with check (
    (select private.has_permission(business_id, 'gallery:upload'))
    or (select private.has_permission(business_id, 'business:edit'))
  );

create policy "business_gallery: uploaders can delete"
  on public.business_gallery for delete
  to authenticated
  using (
    (select private.has_permission(business_id, 'gallery:upload'))
    or (select private.has_permission(business_id, 'business:edit'))
  );

grant select on public.business_gallery to anon, authenticated;
grant insert, delete on public.business_gallery to authenticated;
