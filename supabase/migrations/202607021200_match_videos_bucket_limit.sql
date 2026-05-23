-- Ensure match-videos bucket allows reference frames + thumbnails (Supabase Free max = 50MB).
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
where id = 'match-videos';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-videos',
  'match-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
