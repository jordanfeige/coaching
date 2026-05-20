-- ════════════════════════════════════════════════════════════════════
-- Playvia M1 — Journey Foundation
-- Tables: journey_ratings, journey_score_inputs, journey_score_events,
--         journey_benchmarks
-- ════════════════════════════════════════════════════════════════════

-- ─── journey_ratings ────────────────────────────────────────────────
-- One row per calculation. Never updated, only inserted.
-- The full breakdown JSON lets us audit exactly how a rating was
-- produced at any point in history, even if weights or formulas change.
create table public.journey_ratings (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references public.players(id) on delete cascade,
  total           numeric(5,2) not null,
  tier            text not null,
  tier_progress   numeric(4,3) not null default 0,
  weights_version text not null,
  breakdown       jsonb not null,
  computed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index journey_ratings_player_id_idx on public.journey_ratings (player_id, computed_at desc);
create index journey_ratings_computed_at_idx on public.journey_ratings (computed_at desc);

-- ─── journey_score_inputs ──────────────────────────────────────────
-- The raw signals. One row per input per player.
-- "current" inputs are what the calc engine reads. History sits in events.
create table public.journey_score_inputs (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players(id) on delete cascade,
  category      text not null check (category in ('tennis','academics','exposure','coachability')),
  input_key     text not null,
  value_numeric numeric,
  value_text    text,
  unit          text,
  source        text not null,
  verified      boolean not null default false,
  captured_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (player_id, category, input_key)
);

create index journey_inputs_player_idx on public.journey_score_inputs (player_id);
create index journey_inputs_category_idx on public.journey_score_inputs (player_id, category);

-- ─── journey_score_events ──────────────────────────────────────────
-- Append-only audit log. Every input change, every rating update,
-- every coach override (later) writes a row here.
create table public.journey_score_events (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players(id) on delete cascade,
  event_type   text not null check (event_type in (
    'input_updated','input_added','input_verified',
    'rating_recalculated','tier_changed','weights_changed','manual_correction'
  )),
  category     text,
  label        text not null,
  detail       text,
  before_value text,
  after_value  text,
  delta_score  numeric(5,2),
  metadata     jsonb,
  actor        text not null default 'system',
  created_at   timestamptz not null default now()
);

create index journey_events_player_idx on public.journey_score_events (player_id, created_at desc);
create index journey_events_category_idx on public.journey_score_events (player_id, category, created_at desc);

-- ─── journey_benchmarks ────────────────────────────────────────────
create table public.journey_benchmarks (
  id          uuid primary key default gen_random_uuid(),
  sport       text not null,
  division    text not null,
  category    text not null,
  metric      text not null,
  value       numeric(8,2) not null,
  unit        text not null,
  sample_size integer,
  source      text not null,
  as_of_date  date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index journey_benchmarks_lookup_idx on public.journey_benchmarks (sport, division, category, metric, active);
create unique index journey_benchmarks_active_unique on public.journey_benchmarks (sport, division, category, metric) where active = true;

-- ════════════════════════════════════════════════════════════════════
-- RLS Policies
-- Playvia links players via profiles.player_id, account_players, and
-- legacy players.parent_id — not players.auth_user_id.
-- Coaches use profiles.id = auth.uid() with role = 'coach' (no coaches table).
-- ════════════════════════════════════════════════════════════════════

alter table public.journey_ratings enable row level security;
alter table public.journey_score_inputs enable row level security;
alter table public.journey_score_events enable row level security;
alter table public.journey_benchmarks enable row level security;

-- Helper: player ids visible to the signed-in athlete / family account
-- (inline subquery used in policies below)

create policy "players read own ratings"
  on public.journey_ratings for select
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

create policy "players read own inputs"
  on public.journey_score_inputs for select
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

create policy "players read own events"
  on public.journey_score_events for select
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

create policy "coaches read roster ratings"
  on public.journey_ratings for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'coach'
    )
  );

create policy "coaches read roster inputs"
  on public.journey_score_inputs for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'coach'
    )
  );

create policy "coaches read roster events"
  on public.journey_score_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'coach'
    )
  );

create policy "benchmarks public read"
  on public.journey_benchmarks for select
  to authenticated
  using (true);

-- All writes via service role (calc engine, cron, sync jobs).
