alter table public.college_matches
  add column if not exists player_projected_utr numeric(4,2),
  add column if not exists player_class_year integer;
