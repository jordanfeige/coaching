-- M4 exposure honesty — player UTR at match time

alter table public.match_results
  add column if not exists player_utr_at_time numeric(4,2);

create index if not exists match_results_player_utr_idx
  on public.match_results (player_id, player_utr_at_time);

comment on column public.match_results.player_utr_at_time is
  'Player UTR at match time. Quality-win threshold vs opponent_utr_at_time.';
