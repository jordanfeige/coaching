-- Recruiting profiles and school benchmarks for Playvia

create table if not exists public.recruiting_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  coach_id uuid references auth.users(id),

  grad_year integer,
  age integer,
  gpa decimal(3, 2),
  gender text default 'male',
  geographic_preference text,

  usta_uaid text,
  usta_profile_url text,

  wtn_singles decimal(5, 2),
  wtn_doubles decimal(5, 2),
  wtn_confidence integer,
  wtn_last_updated timestamptz,
  usta_national_rank integer,
  usta_section_rank integer,
  usta_district_rank integer,
  usta_section text,
  usta_state text,
  usta_age_category text,
  usta_win_record integer default 0,
  usta_loss_record integer default 0,
  usta_rankings_raw jsonb,

  utr_singles decimal(4, 2),
  utr_last_updated date,

  target_division text,
  coach_assessment text,
  coach_utr_notes text,

  via_projection jsonb,
  via_school_targets jsonb,
  via_timeline jsonb,
  via_what_needs_to_happen jsonb,
  via_summary text,
  via_generated_at timestamptz,

  published_to_family boolean default false,
  published_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists recruiting_profiles_player_id_key
  on public.recruiting_profiles (player_id);

create table if not exists public.school_benchmarks (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  division text not null,
  sport text not null default 'tennis',
  gender text not null,
  avg_wtn_singles decimal(5, 2),
  avg_utr decimal(4, 2),
  min_utr decimal(4, 2),
  max_utr decimal(4, 2),
  avg_gpa decimal(3, 2),
  scholarship_available boolean default true,
  regions text[],
  state text,
  notes text,
  source text default 'manual',
  updated_at timestamptz default now()
);

alter table public.recruiting_profiles enable row level security;
alter table public.school_benchmarks enable row level security;

drop policy if exists "Coach can manage recruiting profiles" on public.recruiting_profiles;
create policy "Coach can manage recruiting profiles"
  on public.recruiting_profiles
  for all
  to authenticated
  using (
    coach_id = auth.uid()
    or player_id in (
      select ap.player_id
      from public.account_players ap
      where ap.account_id = auth.uid()
    )
  )
  with check (coach_id = auth.uid());

drop policy if exists "Player can view own recruiting profile" on public.recruiting_profiles;
create policy "Player can view own recruiting profile"
  on public.recruiting_profiles
  for select
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
  );

drop policy if exists "Anyone authenticated can read benchmarks" on public.school_benchmarks;
create policy "Anyone authenticated can read benchmarks"
  on public.school_benchmarks
  for select
  to authenticated
  using (true);

-- Seed tennis school benchmarks (idempotent)
insert into public.school_benchmarks
  (school_name, division, sport, gender, avg_wtn_singles, avg_utr, min_utr, max_utr, avg_gpa, scholarship_available, regions, state)
values
  ('University of Florida', 'D1', 'tennis', 'male', 3.5, 14.5, 13.0, 16.5, 3.4, true, ARRAY['Southeast'], 'FL'),
  ('Florida State University', 'D1', 'tennis', 'male', 4.2, 13.8, 12.5, 15.8, 3.3, true, ARRAY['Southeast'], 'FL'),
  ('University of Miami', 'D1', 'tennis', 'male', 3.8, 14.2, 12.8, 16.0, 3.5, true, ARRAY['Southeast'], 'FL'),
  ('UCF', 'D1', 'tennis', 'male', 5.5, 12.5, 11.0, 14.5, 3.2, true, ARRAY['Southeast'], 'FL'),
  ('FIU', 'D1', 'tennis', 'male', 6.2, 11.8, 10.5, 13.5, 3.1, true, ARRAY['Southeast'], 'FL'),
  ('Georgia Tech', 'D1', 'tennis', 'male', 3.2, 15.0, 13.5, 17.0, 3.6, true, ARRAY['Southeast'], 'GA'),
  ('University of Georgia', 'D1', 'tennis', 'male', 3.5, 14.8, 13.2, 16.8, 3.4, true, ARRAY['Southeast'], 'GA'),
  ('Duke University', 'D1', 'tennis', 'male', 3.0, 15.2, 13.8, 17.2, 3.8, true, ARRAY['Mid-Atlantic', 'Southeast'], 'NC'),
  ('Wake Forest', 'D1', 'tennis', 'male', 3.8, 14.0, 12.5, 16.0, 3.5, true, ARRAY['Mid-Atlantic', 'Southeast'], 'NC'),
  ('University of Tennessee', 'D1', 'tennis', 'male', 4.5, 13.2, 11.8, 15.2, 3.2, true, ARRAY['Southeast'], 'TN'),
  ('Rollins College', 'D2', 'tennis', 'male', 8.5, 10.5, 9.0, 12.0, 3.3, true, ARRAY['Southeast'], 'FL'),
  ('Barry University', 'D2', 'tennis', 'male', 9.2, 9.8, 8.5, 11.5, 3.0, true, ARRAY['Southeast'], 'FL'),
  ('Lynn University', 'D2', 'tennis', 'male', 8.8, 10.2, 9.0, 11.8, 3.1, true, ARRAY['Southeast'], 'FL'),
  ('Nova Southeastern', 'D2', 'tennis', 'male', 9.5, 9.5, 8.2, 11.2, 3.0, true, ARRAY['Southeast'], 'FL'),
  ('Tampa University', 'D2', 'tennis', 'male', 9.8, 9.2, 8.0, 11.0, 3.0, true, ARRAY['Southeast'], 'FL'),
  ('Eckerd College', 'D3', 'tennis', 'male', 11.5, 8.0, 6.5, 9.5, 3.2, false, ARRAY['Southeast'], 'FL'),
  ('Stetson University', 'D3', 'tennis', 'male', 12.0, 7.5, 6.0, 9.0, 3.1, false, ARRAY['Southeast'], 'FL'),
  ('Emory University', 'D3', 'tennis', 'male', 8.5, 10.0, 8.5, 11.5, 3.7, false, ARRAY['Southeast'], 'GA'),
  ('University of Florida', 'D1', 'tennis', 'female', 5.5, 12.5, 11.0, 14.5, 3.4, true, ARRAY['Southeast'], 'FL'),
  ('Florida State University', 'D1', 'tennis', 'female', 6.2, 11.8, 10.5, 13.5, 3.3, true, ARRAY['Southeast'], 'FL'),
  ('University of Miami', 'D1', 'tennis', 'female', 5.8, 12.2, 10.8, 14.0, 3.5, true, ARRAY['Southeast'], 'FL'),
  ('Duke University', 'D1', 'tennis', 'female', 4.5, 13.5, 12.0, 15.5, 3.8, true, ARRAY['Mid-Atlantic', 'Southeast'], 'NC'),
  ('Rollins College', 'D2', 'tennis', 'female', 10.5, 8.5, 7.2, 10.0, 3.3, true, ARRAY['Southeast'], 'FL'),
  ('Barry University', 'D2', 'tennis', 'female', 11.2, 7.8, 6.5, 9.5, 3.0, true, ARRAY['Southeast'], 'FL'),
  ('Eckerd College', 'D3', 'tennis', 'female', 13.5, 6.5, 5.5, 8.0, 3.2, false, ARRAY['Southeast'], 'FL');
