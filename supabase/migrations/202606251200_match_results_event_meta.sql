-- Event division + location from UTR match sync (display only; not used in scoring).

alter table public.match_results
  add column if not exists event_division text,
  add column if not exists event_location text;

comment on column public.match_results.event_division is
  'Event division/category at match time from UTR draw name (e.g. Boys 14s).';

comment on column public.match_results.event_location is
  'Event location display string from UTR event metadata.';

create index if not exists match_results_event_division_idx
  on public.match_results (player_id, event_division);
