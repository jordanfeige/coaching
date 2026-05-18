alter table videos add column if not exists thumbnail_url text;

alter table lessons add column if not exists player_viewed_at timestamptz;
