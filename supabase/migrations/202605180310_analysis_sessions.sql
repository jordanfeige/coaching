create table if not exists analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  player_id uuid,
  sport text not null,
  shot_type text,
  overall_score int,
  rating text,
  strengths_count int default 0,
  critical_count int default 0,
  moderate_count int default 0,
  minor_count int default 0,
  top_issue text,
  biggest_win text,
  checkpoint_scores jsonb default '{}',
  full_result jsonb,
  video_id uuid,
  analyzed_at timestamptz default now()
);

alter table analysis_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Users can view own sessions'
  ) then
    create policy "Users can view own sessions" on analysis_sessions
      for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Users can insert own sessions'
  ) then
    create policy "Users can insert own sessions" on analysis_sessions
      for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

alter table profiles add column if not exists analyses_used int default 0;
alter table profiles add column if not exists is_subscribed boolean default false;
alter table profiles add column if not exists subscription_tier text default 'free';
