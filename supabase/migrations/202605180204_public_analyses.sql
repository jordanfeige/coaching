create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  shot_type text,
  athlete_name text,
  rating text,
  top_issue text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table analyses enable row level security;
