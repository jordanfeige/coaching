alter table public.players
  add column if not exists utr_player_id text,
  add column if not exists utr_singles numeric,
  add column if not exists utr_doubles numeric,
  add column if not exists utr_status text,
  add column if not exists utr_last_synced timestamptz;

alter table public.recruiting_profiles
  add column if not exists schedule_total_matches integer;
