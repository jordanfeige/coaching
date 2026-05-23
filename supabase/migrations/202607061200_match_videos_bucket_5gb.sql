-- Raise match-videos storage bucket limit to 5 GB (5120 MB).
-- Raw match uploads use GCS; this bucket holds reference frames, thumbnails, and any Supabase paths.

update storage.buckets
set file_size_limit = 5368709120
where id = 'match-videos';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  5368709120,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
