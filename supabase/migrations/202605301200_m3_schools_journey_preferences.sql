-- M3 — College Scorecard schools reference + journey preferences

create table public.schools (
  ipeds_id          text primary key,
  name              text not null,
  alias             text,
  city              text,
  state             text,
  region            text,
  zip               text,
  url               text,
  carnegie_basic    integer,
  control           text,
  size              integer,
  admission_rate    numeric(6,4),
  sat_25th          integer,
  sat_75th          integer,
  act_25th          integer,
  act_75th          integer,
  net_price         integer,
  academic_tier     text not null check (academic_tier in (
    'ivy', 'top_25_academic', 'top_100_academic', 'public_state', 'other'
  )),
  has_tennis_program boolean not null default false,
  scorecard_as_of   date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index schools_ipeds_idx     on public.schools (ipeds_id);
create index schools_state_idx     on public.schools (state);
create index schools_admission_idx on public.schools (admission_rate);
create index schools_tier_idx      on public.schools (academic_tier);
create index schools_tennis_idx    on public.schools (has_tennis_program)
  where has_tennis_program = true;

alter table public.schools enable row level security;

create policy "schools public read"
  on public.schools for select
  to authenticated
  using (true);

-- Per-player journey / recruiting preferences
create table public.journey_preferences (
  player_id                    uuid primary key references public.players(id) on delete cascade,

  primary_goal                 text check (primary_goal in (
    'recruited_college', 'scholarship_smaller', 'win_highest_level',
    'improve_have_fun', 'help_my_child', 'not_sure_yet'
  )),
  goal_set_at                  timestamptz,

  recruiting_banner_dismissed  boolean not null default false,
  not_recruiting               boolean not null default false,

  wizard_completed_at          timestamptz,
  wizard_skipped_at            timestamptz,

  target_division              text check (target_division in (
    'd1_power', 'd1_mid_major', 'd2', 'd3', 'naia', 'juco', 'not_sure'
  )),
  target_academic_tier         text check (target_academic_tier in (
    'ivy', 'top_25_academic', 'top_100_academic', 'public_state', 'no_preference'
  )),
  target_geography             text,
  target_state                 text,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

alter table public.journey_preferences enable row level security;

create policy "players manage own preferences"
  on public.journey_preferences for all
  to authenticated
  using (
    player_id in (
      select p.player_id from public.profiles p
      where p.id = auth.uid() and p.player_id is not null
    )
    or player_id in (
      select ap.player_id from public.account_players ap
      where ap.account_id = auth.uid()
    )
    or player_id in (
      select pl.id from public.players pl where pl.parent_id = auth.uid()
    )
  )
  with check (
    player_id in (
      select p.player_id from public.profiles p
      where p.id = auth.uid() and p.player_id is not null
    )
    or player_id in (
      select ap.player_id from public.account_players ap
      where ap.account_id = auth.uid()
    )
    or player_id in (
      select pl.id from public.players pl where pl.parent_id = auth.uid()
    )
  );

-- Coaches: same broad read as journey_ratings (any coach role)
create policy "coaches read roster preferences"
  on public.journey_preferences for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );
