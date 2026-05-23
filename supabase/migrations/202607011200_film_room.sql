-- Film Room Phase 1: matches, chunks, syntheses + match-videos storage bucket

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,

  opponent_name text,
  match_context text,
  match_date date,

  raw_video_storage_path text,
  raw_video_size_bytes bigint,
  raw_video_duration_seconds integer,

  reference_frame_storage_path text,
  tap_x_percent numeric,
  tap_y_percent numeric,
  frame_captured_at_seconds numeric,
  player_description_hint text,

  status text not null default 'uploading' check (status in (
    'uploading',
    'chunking',
    'chunks_ready',
    'analyzing_first',
    'ready',
    'failed'
  )),
  status_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chunking_completed_at timestamptz,
  ready_at timestamptz
);

create index idx_matches_player_id on public.matches(player_id);
create index idx_matches_status on public.matches(status);

create table public.match_chunks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,

  sequence_number integer not null,
  start_seconds integer not null,
  end_seconds integer not null,
  duration_seconds integer not null,

  gcs_bucket text not null,
  gcs_path text not null,
  gcs_uri text not null,
  size_bytes bigint,

  thumbnail_storage_path text,

  analysis_status text not null default 'not_analyzed' check (analysis_status in (
    'not_analyzed',
    'analyzing',
    'analyzed',
    'failed'
  )),
  analysis_error text,
  analyzed_at timestamptz,

  analysis_result jsonb,
  analysis_version text,

  created_at timestamptz not null default now(),

  unique(match_id, sequence_number)
);

create index idx_match_chunks_match_id on public.match_chunks(match_id);
create index idx_match_chunks_status on public.match_chunks(analysis_status);

create table public.match_syntheses (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  chunks_included integer[] not null,
  synthesis_result jsonb not null,
  synthesis_version text,
  created_at timestamptz not null default now()
);

create index idx_match_syntheses_match_id on public.match_syntheses(match_id);

alter table public.matches enable row level security;
alter table public.match_chunks enable row level security;
alter table public.match_syntheses enable row level security;

create policy "Players can see their own matches" on public.matches
  for select using (player_id in (select player_id from public.profiles where id = auth.uid()));

create policy "Players can insert their own matches" on public.matches
  for insert with check (player_id in (select player_id from public.profiles where id = auth.uid()));

create policy "Players can update their own matches" on public.matches
  for update using (player_id in (select player_id from public.profiles where id = auth.uid()));

create policy "Players can see chunks of their matches" on public.match_chunks
  for select using (match_id in (
    select id from public.matches where player_id in (
      select player_id from public.profiles where id = auth.uid()
    )
  ));

create policy "Players can see syntheses of their matches" on public.match_syntheses
  for select using (match_id in (
    select id from public.matches where player_id in (
      select player_id from public.profiles where id = auth.uid()
    )
  ));

-- Private bucket for raw uploads, reference frames, thumbnails (deleted after chunking for raw)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  1073741824,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.foldername(name) returns {matches, <match_id>, ...}
create policy "Players upload own match videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = 'matches'
    and exists (
      select 1 from public.matches m
      inner join public.profiles p on p.player_id = m.player_id
      where p.id = auth.uid()
        and m.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Players read own match videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = 'matches'
    and exists (
      select 1 from public.matches m
      inner join public.profiles p on p.player_id = m.player_id
      where p.id = auth.uid()
        and m.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Players update own match videos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = 'matches'
    and exists (
      select 1 from public.matches m
      inner join public.profiles p on p.player_id = m.player_id
      where p.id = auth.uid()
        and m.id::text = (storage.foldername(name))[2]
    )
  );

create policy "Players delete own match videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'match-videos'
    and (storage.foldername(name))[1] = 'matches'
    and exists (
      select 1 from public.matches m
      inner join public.profiles p on p.player_id = m.player_id
      where p.id = auth.uid()
        and m.id::text = (storage.foldername(name))[2]
    )
  );
