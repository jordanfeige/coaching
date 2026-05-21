-- M6: drill completion for Coachability drill_completion signal
alter table public.drills
  add column if not exists completed_at timestamptz;

create index if not exists drills_player_completed_idx
  on public.drills (player_id, completed_at desc)
  where completed_at is not null;
