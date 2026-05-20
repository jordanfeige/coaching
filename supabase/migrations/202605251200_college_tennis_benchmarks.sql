create table if not exists public.college_tennis_benchmarks (
  id uuid default gen_random_uuid() primary key,
  club_id text not null unique,
  school_name text,
  display_name text,
  gender text,
  division text,
  conference text,
  avg_utr numeric,
  min_utr numeric,
  max_utr numeric,
  power6_avg numeric,
  roster_size integer,
  international_pct integer,
  roster_year text,
  has_pro_players boolean default false,

  scorecard_id text,
  sat_25th integer,
  sat_75th integer,
  act_25th integer,
  act_75th integer,
  acceptance_rate numeric,
  graduation_rate numeric,
  tuition_in_state integer,
  tuition_out_of_state integer,
  median_earnings_10yr integer,
  student_size integer,
  school_type text,
  state text,
  city text,
  locale text,

  is_power_school boolean default false,
  is_ivy_league boolean default false,
  is_high_academic_d3 boolean default false,
  allows_pro_summers boolean,
  coaching_years_current integer,

  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ctb_division_gender
  on public.college_tennis_benchmarks (division, gender);

create index if not exists idx_ctb_avg_utr
  on public.college_tennis_benchmarks (avg_utr);

create index if not exists idx_ctb_school_name
  on public.college_tennis_benchmarks (school_name);

alter table public.college_tennis_benchmarks enable row level security;

drop policy if exists "Authenticated users can read college benchmarks"
  on public.college_tennis_benchmarks;
create policy "Authenticated users can read college benchmarks"
  on public.college_tennis_benchmarks
  for select
  to authenticated
  using (true);

-- Weekly cron (run manually in SQL editor after enabling pg_cron + pg_net):
-- select cron.schedule(
--   'utr-college-sync-weekly',
--   '0 6 * * 3',
--   $$
--   select net.http_post(
--     url := 'https://playvia.studio/api/utr-sync-colleges',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--     ),
--     body := '{"action":"sync_all"}'::jsonb
--   );
--   $$
-- );
