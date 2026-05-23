-- Repair Film Room Phase 3 if 202607031200 was skipped or had incomplete RLS

create table if not exists public.match_chunk_work_on_state (
  id uuid primary key default gen_random_uuid(),
  match_chunk_id uuid not null references public.match_chunks(id) on delete cascade,
  work_on_rank integer not null check (work_on_rank in (1, 2, 3)),
  archived_at timestamptz,
  restored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_chunk_id, work_on_rank)
);

create index if not exists idx_work_on_state_chunk on public.match_chunk_work_on_state(match_chunk_id);

alter table public.match_chunk_work_on_state enable row level security;

alter table public.drills
  add column if not exists film_room_match_chunk_id uuid references public.match_chunks(id) on delete set null;

alter table public.drills
  add column if not exists film_room_work_on_title text;

drop policy if exists "Players can see their work_on state" on public.match_chunk_work_on_state;
drop policy if exists "Players can manage their work_on state" on public.match_chunk_work_on_state;
drop policy if exists "Players can insert their work_on state" on public.match_chunk_work_on_state;
drop policy if exists "Players can update their work_on state" on public.match_chunk_work_on_state;

create policy "Players can see their work_on state" on public.match_chunk_work_on_state
  for select
  to authenticated
  using (match_chunk_id in (
    select id from public.match_chunks where match_id in (
      select id from public.matches where player_id in (
        select player_id from public.profiles where id = auth.uid()
      )
    )
  ));

create policy "Players can insert their work_on state" on public.match_chunk_work_on_state
  for insert
  to authenticated
  with check (match_chunk_id in (
    select id from public.match_chunks where match_id in (
      select id from public.matches where player_id in (
        select player_id from public.profiles where id = auth.uid()
      )
    )
  ));

create policy "Players can update their work_on state" on public.match_chunk_work_on_state
  for update
  to authenticated
  using (match_chunk_id in (
    select id from public.match_chunks where match_id in (
      select id from public.matches where player_id in (
        select player_id from public.profiles where id = auth.uid()
      )
    )
  ))
  with check (match_chunk_id in (
    select id from public.match_chunks where match_id in (
      select id from public.matches where player_id in (
        select player_id from public.profiles where id = auth.uid()
      )
    )
  ));

drop policy if exists "Players can delete their own matches" on public.matches;

create policy "Players can delete their own matches" on public.matches
  for delete
  to authenticated
  using (player_id in (
    select player_id from public.profiles where id = auth.uid()
  ));
