-- Cohort benchmarks + goal trajectory tracks

create table public.cohort_benchmarks (
  id              uuid primary key default gen_random_uuid(),
  bracket         text not null check (bracket in ('10U','12U','14U','16U','18U')),
  year_in_bracket integer not null check (year_in_bracket in (1, 2)),
  age             integer not null,
  utr_threshold   numeric(4,2) not null,
  description     text,
  source          text not null default 'playvia_draft_v1',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (bracket, year_in_bracket)
);

create index cohort_benchmarks_age_idx on public.cohort_benchmarks (age);

alter table public.cohort_benchmarks enable row level security;

create policy "cohort_benchmarks public read"
  on public.cohort_benchmarks for select
  to authenticated
  using (true);

create table public.goal_tracks (
  id          uuid primary key default gen_random_uuid(),
  goal_key    text not null check (goal_key in (
    'recruited_college', 'scholarship_smaller',
    'win_highest_level', 'improve_have_fun'
  )),
  age         integer not null,
  utr_target  numeric(4,2) not null,
  label       text not null,
  source      text not null default 'playvia_draft_v1',
  created_at  timestamptz not null default now(),
  unique (goal_key, age)
);

create index goal_tracks_goal_idx on public.goal_tracks (goal_key, age);

alter table public.goal_tracks enable row level security;

create policy "goal_tracks public read"
  on public.goal_tracks for select
  to authenticated
  using (true);

insert into public.cohort_benchmarks (bracket, year_in_bracket, age, utr_threshold, description) values
  ('10U', 1, 9,  5.5, 'First-year 10U top-of-bracket'),
  ('10U', 2, 10, 6.0, 'Second-year 10U top-of-bracket'),
  ('12U', 1, 11, 6.5, 'First-year 12U top-of-bracket'),
  ('12U', 2, 12, 7.5, 'Second-year 12U top-of-bracket'),
  ('14U', 1, 13, 8.5, 'First-year 14U top-of-bracket'),
  ('14U', 2, 14, 9.0, 'Second-year 14U top-of-bracket'),
  ('16U', 1, 15, 9.5, 'First-year 16U top-of-bracket'),
  ('16U', 2, 16, 10.0, 'Second-year 16U top-of-bracket'),
  ('18U', 1, 17, 10.5, 'First-year 18U top-of-bracket'),
  ('18U', 2, 18, 11.0, 'Second-year 18U top-of-bracket')
on conflict (bracket, year_in_bracket) do nothing;

insert into public.goal_tracks (goal_key, age, utr_target, label) values
  ('recruited_college', 10, 6.0, 'D1 mid-major target'),
  ('recruited_college', 12, 8.0, 'D1 mid-major target'),
  ('recruited_college', 14, 9.5, 'D1 mid-major target'),
  ('recruited_college', 16, 10.7, 'D1 mid-major target'),
  ('recruited_college', 17, 11.3, 'D1 mid-major target'),
  ('scholarship_smaller', 10, 5.5, 'D2/D3/NAIA target'),
  ('scholarship_smaller', 12, 7.0, 'D2/D3/NAIA target'),
  ('scholarship_smaller', 14, 8.5, 'D2/D3/NAIA target'),
  ('scholarship_smaller', 16, 9.5, 'D2/D3/NAIA target'),
  ('scholarship_smaller', 17, 10.0, 'D2/D3/NAIA target'),
  ('win_highest_level', 10, 6.2, 'National-level competitor'),
  ('win_highest_level', 12, 8.3, 'National-level competitor'),
  ('win_highest_level', 14, 9.8, 'National-level competitor'),
  ('win_highest_level', 16, 11.0, 'National-level competitor'),
  ('win_highest_level', 17, 11.8, 'National-level competitor'),
  ('improve_have_fun', 10, 4.5, 'Steady growth'),
  ('improve_have_fun', 12, 6.0, 'Steady growth'),
  ('improve_have_fun', 14, 7.5, 'Steady growth'),
  ('improve_have_fun', 16, 8.5, 'Steady growth'),
  ('improve_have_fun', 17, 9.0, 'Steady growth')
on conflict (goal_key, age) do nothing;
