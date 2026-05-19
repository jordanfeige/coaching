alter table analysis_sessions
  add column if not exists coach_verified boolean default false,
  add column if not exists coach_verified_at timestamptz,
  add column if not exists coach_verified_by uuid references auth.users(id),
  add column if not exists coach_overrides jsonb default '[]'::jsonb,
  add column if not exists coach_score_override integer,
  add column if not exists coach_notes text,
  add column if not exists source text default 'video',
  add column if not exists published_to_player boolean default false,
  add column if not exists published_at timestamptz,
  add column if not exists lesson_id uuid references lessons(id) on delete set null;

create index if not exists idx_analysis_sessions_lesson_id
  on analysis_sessions(lesson_id);

create index if not exists idx_analysis_sessions_player_published
  on analysis_sessions(player_id, published_to_player);

-- Coaches can update sessions for verification/publish
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Coaches can update player sessions'
  ) then
    create policy "Coaches can update player sessions" on analysis_sessions
      for update to authenticated
      using (
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.role = 'coach'
        )
      );
  end if;
end $$;

-- Coaches can view player sessions for review
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Coaches can view player sessions'
  ) then
    create policy "Coaches can view player sessions" on analysis_sessions
      for select to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.role = 'coach'
        )
      );
  end if;
end $$;
