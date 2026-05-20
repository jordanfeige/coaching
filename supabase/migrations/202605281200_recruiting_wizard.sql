alter table public.recruiting_profiles
  add column if not exists wizard_completed boolean default false,
  add column if not exists wizard_completed_at timestamptz,
  add column if not exists pro_interest text,
  add column if not exists scholarship_need text,
  add column if not exists campus_size text,
  add column if not exists intended_major text,
  add column if not exists sat_score integer,
  add column if not exists act_score integer,
  add column if not exists tournament_circuit text,
  add column if not exists career_goal text,
  add column if not exists reminder_sent_at timestamptz;

-- target_division, geographic_preference, gpa may already exist from earlier migrations
