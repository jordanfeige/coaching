-- Consumer self-serve analysis history.
-- Consumer players do not need a linked player record, so history is attached to the auth/profile id.

create table if not exists public.consumer_analysis_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null,
  shot_type text,
  camera_angle text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.consumer_analysis_history enable row level security;

create index if not exists consumer_analysis_history_profile_created_idx
  on public.consumer_analysis_history (profile_id, created_at desc);

drop policy if exists "Consumers can view their own analysis history" on public.consumer_analysis_history;
create policy "Consumers can view their own analysis history"
  on public.consumer_analysis_history
  for select
  to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "Consumers can insert their own analysis history" on public.consumer_analysis_history;
create policy "Consumers can insert their own analysis history"
  on public.consumer_analysis_history
  for insert
  to authenticated
  with check (auth.uid() = profile_id);
