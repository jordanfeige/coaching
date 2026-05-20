alter table public.recruiting_profiles
  add column if not exists projection_generated_at timestamptz,
  add column if not exists last_reel_assessment text,
  add column if not exists last_reel_assessment_date timestamptz,
  add column if not exists last_reel_assessment_session_id uuid;
