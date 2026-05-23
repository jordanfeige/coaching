-- Film Room Phase 4: match-level drill lineage

alter table public.drills
  add column if not exists film_room_match_id uuid references public.matches(id) on delete set null;

create index if not exists idx_drills_film_room_match
  on public.drills (film_room_match_id)
  where film_room_match_id is not null;
