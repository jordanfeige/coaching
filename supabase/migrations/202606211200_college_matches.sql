-- Playvia M5 — College match cache + saved schools

create table public.college_matches (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references public.players(id) on delete cascade,
  school_id              text not null references public.schools(ipeds_id) on delete cascade,

  match_score            numeric(5,2) not null,
  bucket                 text not null check (bucket in ('likely','target','reach','below')),

  tennis_fit             numeric(5,2),
  academic_fit           numeric(5,2),
  division_fit           numeric(5,2),
  geo_fit                numeric(5,2),

  player_utr_snapshot    numeric(4,2),
  player_gpa_snapshot    numeric(3,2),
  player_sat_snapshot    integer,
  school_roster_avg      numeric(4,2),
  rationale              text,

  computed_at            timestamptz not null default now(),
  inputs_version         integer not null default 1,

  unique (player_id, school_id)
);

create index college_matches_player_idx on public.college_matches (player_id, match_score desc);
create index college_matches_player_bucket_idx on public.college_matches (player_id, bucket);

alter table public.college_matches enable row level security;

create policy "players read own matches"
  on public.college_matches for select
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
      select pl.id from public.players pl
      where pl.parent_id = auth.uid()
    )
  );

create policy "coaches read roster matches"
  on public.college_matches for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

create table public.saved_schools (
  player_id              uuid not null references public.players(id) on delete cascade,
  school_id              text not null references public.schools(ipeds_id) on delete cascade,
  saved_at               timestamptz not null default now(),
  notes                  text,
  primary key (player_id, school_id)
);

create index saved_schools_player_idx on public.saved_schools (player_id, saved_at desc);

alter table public.saved_schools enable row level security;

create policy "players manage own saved schools"
  on public.saved_schools for all
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
      select pl.id from public.players pl
      where pl.parent_id = auth.uid()
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
      select pl.id from public.players pl
      where pl.parent_id = auth.uid()
    )
  );
