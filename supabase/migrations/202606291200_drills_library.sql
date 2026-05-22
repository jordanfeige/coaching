-- Drill templates (library). Player assignments stay in public.drills.

create table if not exists public.drills_library (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  primary_category text not null,
  drill_type text,
  checkpoints text[],
  skill_level text not null,
  bracket_recommendation text,
  utr_recommendation text,
  duration_minutes integer not null,
  mode text not null,
  requires text[],
  description text not null,
  steps text[],
  success_criteria text,
  coaching_cue text,
  source text not null,
  source_attribution text,
  created_by_player_id uuid references public.players(id) on delete set null,
  created_by_coach_id uuid references public.profiles(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.drills_library is
  'Drill templates: curated public drills plus private player/coach-authored drills';

create index if not exists idx_drills_library_category
  on public.drills_library (primary_category);

create index if not exists idx_drills_library_skill
  on public.drills_library (skill_level);

create index if not exists idx_drills_library_checkpoints
  on public.drills_library using gin (checkpoints);

create index if not exists idx_drills_library_creator_player
  on public.drills_library (created_by_player_id)
  where created_by_player_id is not null;

create index if not exists idx_drills_library_creator_coach
  on public.drills_library (created_by_coach_id)
  where created_by_coach_id is not null;

alter table public.drills_library enable row level security;

create policy "Public library drills are readable by all authenticated users"
  on public.drills_library
  for select
  to authenticated
  using (is_public = true);

create policy "Players see own custom drills"
  on public.drills_library
  for select
  to authenticated
  using (
    created_by_player_id in (
      select player_id from public.profiles
      where id = auth.uid() and player_id is not null
    )
  );

create policy "Coaches see drills by their players"
  on public.drills_library
  for select
  to authenticated
  using (
    created_by_player_id in (
      select player_id from public.recruiting_profiles
      where coach_id = auth.uid() and player_id is not null
    )
  );

create policy "Coaches see own coach-created drills"
  on public.drills_library
  for select
  to authenticated
  using (created_by_coach_id = auth.uid());

create policy "Players insert own drills"
  on public.drills_library
  for insert
  to authenticated
  with check (
    created_by_player_id in (
      select player_id from public.profiles
      where id = auth.uid() and player_id is not null
    )
    and created_by_coach_id is null
    and is_public = false
    and source = 'player'
  );

create policy "Coaches insert own drills"
  on public.drills_library
  for insert
  to authenticated
  with check (
    created_by_coach_id = auth.uid()
    and created_by_player_id is null
    and source = 'coach'
  );

create policy "Players update own drills"
  on public.drills_library
  for update
  to authenticated
  using (
    created_by_player_id in (
      select player_id from public.profiles
      where id = auth.uid() and player_id is not null
    )
  );

create policy "Coaches update own coach drills"
  on public.drills_library
  for update
  to authenticated
  using (created_by_coach_id = auth.uid());

-- AI-generated drills saved for a player
create policy "Players insert ai_generated drills"
  on public.drills_library
  for insert
  to authenticated
  with check (
    source = 'ai_generated'
    and created_by_player_id in (
      select player_id from public.profiles
      where id = auth.uid() and player_id is not null
    )
    and created_by_coach_id is null
    and is_public = false
  );
