alter table public.recruiting_profiles
  add column if not exists utr_player_id text,
  add column if not exists utr_display_name text,
  add column if not exists utr_doubles numeric,
  add column if not exists utr_status text,
  add column if not exists utr_raw jsonb;
