-- Persist uploaded reel videos on analysis_sessions for playback in player Reels.

alter table public.analysis_sessions
  add column if not exists storage_path text,
  add column if not exists video_duration_seconds integer;

create index if not exists idx_analysis_sessions_storage_path
  on public.analysis_sessions (storage_path)
  where storage_path is not null;
