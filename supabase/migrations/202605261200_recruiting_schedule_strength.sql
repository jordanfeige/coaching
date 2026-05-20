alter table public.recruiting_profiles
  add column if not exists schedule_strength_score integer,
  add column if not exists schedule_avg_opponent_utr numeric,
  add column if not exists schedule_highest_utr_beaten numeric,
  add column if not exists schedule_quality_wins integer,
  add column if not exists schedule_win_rate_vs_higher integer,
  add column if not exists schedule_sanctioned_pct integer,
  add column if not exists schedule_summary text,
  add column if not exists schedule_last_calculated timestamptz,
  add column if not exists utr_player_id_v4 text;
