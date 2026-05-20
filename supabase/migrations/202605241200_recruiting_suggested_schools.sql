alter table public.recruiting_profiles
  add column if not exists via_suggested_schools jsonb;
