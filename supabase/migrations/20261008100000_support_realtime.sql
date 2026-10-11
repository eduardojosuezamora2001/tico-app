-- Live updates for platform support inbox (admin + user panels).
alter publication supabase_realtime add table public.support_threads;
alter publication supabase_realtime add table public.support_messages;
