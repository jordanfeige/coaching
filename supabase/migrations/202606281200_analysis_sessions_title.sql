-- Custom display names for player reels (analysis_sessions)

alter table public.analysis_sessions
  add column if not exists title text;

comment on column public.analysis_sessions.title is
  'Player-chosen reel name shown in UI and referenced by Ask Via';

create index if not exists idx_analysis_sessions_player_title
  on public.analysis_sessions (player_id, title)
  where title is not null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Users can update own sessions'
  ) then
    create policy "Users can update own sessions"
      on public.analysis_sessions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_sessions'
      and policyname = 'Linked players can update own sessions'
  ) then
    create policy "Linked players can update own sessions"
      on public.analysis_sessions
      for update
      to authenticated
      using (
        player_id in (
          select player_id from public.profiles
          where id = auth.uid() and player_id is not null
        )
      )
      with check (
        player_id in (
          select player_id from public.profiles
          where id = auth.uid() and player_id is not null
        )
      );
  end if;
end $$;
