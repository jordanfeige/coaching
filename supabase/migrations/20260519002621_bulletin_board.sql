create table if not exists bulletin_listings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('camp','tournament','clinic','coach')),
  title text not null,
  sport text not null,
  description text,
  location_city text,
  location_state text,
  location_lat decimal,
  location_lng decimal,
  start_date date,
  end_date date,
  age_min int,
  age_max int,
  price decimal,
  spots_total int,
  spots_remaining int,
  registration_url text,
  source text default 'coach',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table bulletin_listings enable row level security;

drop policy if exists "Anyone can view active listings" on bulletin_listings;
create policy "Anyone can view active listings"
  on bulletin_listings for select
  using (is_active = true);

drop policy if exists "Coaches can insert own listings" on bulletin_listings;
create policy "Coaches can insert own listings"
  on bulletin_listings for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists "Coaches can update own listings" on bulletin_listings;
create policy "Coaches can update own listings"
  on bulletin_listings for update
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists "Coaches can delete own listings" on bulletin_listings;
create policy "Coaches can delete own listings"
  on bulletin_listings for delete
  to authenticated
  using (coach_id = auth.uid());

create table if not exists bulletin_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  listings jsonb not null,
  cached_at timestamptz default now()
);

alter table bulletin_cache enable row level security;

drop policy if exists "Authenticated users can view bulletin cache" on bulletin_cache;
create policy "Authenticated users can view bulletin cache"
  on bulletin_cache for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert bulletin cache" on bulletin_cache;
create policy "Authenticated users can insert bulletin cache"
  on bulletin_cache for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update bulletin cache" on bulletin_cache;
create policy "Authenticated users can update bulletin cache"
  on bulletin_cache for update
  to authenticated
  using (true);

create or replace function cleanup_bulletin_cache()
returns void as $$
  delete from bulletin_cache
  where cached_at < now() - interval '24 hours';
$$ language sql;
