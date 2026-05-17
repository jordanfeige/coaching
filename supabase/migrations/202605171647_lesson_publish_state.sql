-- Per-player lesson publishing.
-- Lesson details remain visible, but recap content is hidden until published.

alter table public.lessons
  add column if not exists published_at timestamptz,
  add column if not exists published_by_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists lessons_published_at_idx
  on public.lessons (published_at);

create index if not exists lessons_published_by_profile_id_idx
  on public.lessons (published_by_profile_id);
