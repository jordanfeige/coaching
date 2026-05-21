-- ════════════════════════════════════════════════════════════════════
-- Playvia M4 + M4.5 — Match results, school rosters, tennis programs
-- ════════════════════════════════════════════════════════════════════

-- ─── match_results ─────────────────────────────────────────────────
create table public.match_results (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references public.players(id) on delete cascade,
  match_utr_id           text not null,
  match_date             date not null,
  event_id               text,
  event_name             text,
  event_level            text check (event_level in (
    'national','sectional','itf','utr_event','utr_flex','college','other'
  )),
  opponent_utr_id        text not null,
  opponent_name          text not null,
  opponent_utr_at_time   numeric(4,2),
  result                 text not null check (result in ('W','L')),
  score                  text,
  round                  text,
  sets_played            integer,
  is_singles             boolean not null default true,
  source                 text not null default 'utr_api',
  synced_at              timestamptz not null default now(),

  unique(player_id, match_utr_id)
);

create index match_results_player_idx on public.match_results (player_id);
create index match_results_date_idx on public.match_results (player_id, match_date desc);
create index match_results_quality_idx on public.match_results (player_id, opponent_utr_at_time desc);

alter table public.match_results enable row level security;

create policy "players read own matches"
  on public.match_results for select
  to authenticated
  using (
    player_id in (
      select p.player_id
      from public.profiles p
      where p.id = auth.uid()
        and p.player_id is not null
    )
    or player_id in (
      select ap.player_id
      from public.account_players ap
      where ap.account_id = auth.uid()
    )
    or player_id in (
      select pl.id
      from public.players pl
      where pl.parent_id = auth.uid()
    )
  );

create policy "coaches read roster matches"
  on public.match_results for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'coach'
    )
  );

-- ─── school_rosters ────────────────────────────────────────────────
-- schools.pk is ipeds_id (text), not uuid
create table public.school_rosters (
  id                     uuid primary key default gen_random_uuid(),
  school_id              text not null references public.schools(ipeds_id) on delete cascade,
  school_utr_id          text,
  player_utr_id          text not null,
  player_name            text not null,
  player_utr             numeric(4,2) not null,
  class_year             integer,
  position               text,
  is_starter             boolean default false,
  as_of_date             date not null,
  synced_at              timestamptz not null default now(),

  unique(school_id, player_utr_id, as_of_date)
);

create index school_rosters_school_idx on public.school_rosters (school_id);
create index school_rosters_school_avg_idx on public.school_rosters (school_id, player_utr desc);

alter table public.school_rosters enable row level security;

create policy "school_rosters public read"
  on public.school_rosters for select
  to authenticated
  using (true);

-- ─── school_tennis_programs ────────────────────────────────────────
create table public.school_tennis_programs (
  school_id              text primary key references public.schools(ipeds_id) on delete cascade,
  school_utr_id          text,
  division               text check (division in (
    'd1_power','d1_mid_major','d2','d3','naia','juco'
  )),
  conference             text,
  roster_avg_utr         numeric(4,2),
  roster_min_utr         numeric(4,2),
  roster_max_utr         numeric(4,2),
  roster_starter_avg_utr numeric(4,2),
  roster_count           integer,
  last_synced_at         timestamptz not null default now()
);

create index school_tennis_programs_division_idx on public.school_tennis_programs (division);
create index school_tennis_programs_avg_idx on public.school_tennis_programs (roster_avg_utr desc);

alter table public.school_tennis_programs enable row level security;

create policy "school_tennis_programs public read"
  on public.school_tennis_programs for select
  to authenticated
  using (true);
