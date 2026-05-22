-- Link player drill assignments to library templates

alter table public.drills
  add column if not exists library_drill_id uuid references public.drills_library(id) on delete set null;

alter table public.drills
  add column if not exists instantiated_at timestamptz not null default now();

create index if not exists idx_drills_library_drill_id
  on public.drills (library_drill_id)
  where library_drill_id is not null;
