-- Family accounts, athlete ages, and group lesson bookings.
-- Safe to run more than once during early iteration.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text;

alter table public.players
  add column if not exists age integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_age_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_age_check check (age is null or (age >= 1 and age <= 120));
  end if;
end $$;

create table if not exists public.account_players (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_id, player_id)
);

alter table public.account_players enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_players'
      and policyname = 'account_players_select_own_or_coach'
  ) then
    create policy account_players_select_own_or_coach
      on public.account_players
      for select
      using (
        account_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'coach'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_players'
      and policyname = 'account_players_insert_own_or_coach'
  ) then
    create policy account_players_insert_own_or_coach
      on public.account_players
      for insert
      with check (
        account_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'coach'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_players'
      and policyname = 'account_players_delete_own_or_coach'
  ) then
    create policy account_players_delete_own_or_coach
      on public.account_players
      for delete
      using (
        account_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'coach'
        )
      );
  end if;
end $$;

alter table public.availability
  add column if not exists booking_tier text not null default 'private',
  add column if not exists max_players integer not null default 1;

update public.availability
set booking_tier = case coalesce(booking_tier, 'private')
      when 'group_2_3' then 'group_2'
      when 'group_4_5' then 'group_3_4'
      else coalesce(booking_tier, 'private')
    end,
    max_players = case coalesce(booking_tier, 'private')
      when 'group_2' then 2
      when 'group_2_3' then 2
      when 'group_3_4' then 4
      when 'group_4_5' then 4
      else 1
    end;

do $$
begin
  alter table public.availability drop constraint if exists availability_booking_tier_check;
  alter table public.availability
    add constraint availability_booking_tier_check
    check (booking_tier in ('private', 'group_2', 'group_3_4'));

  alter table public.availability drop constraint if exists availability_max_players_check;
  alter table public.availability
    add constraint availability_max_players_check check (max_players in (1, 2, 4));
end $$;

alter table public.lessons
  add column if not exists booking_group_id uuid,
  add column if not exists booked_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists booking_tier text not null default 'private';

update public.lessons
set booking_tier = case coalesce(booking_tier, 'private')
  when 'group_2_3' then 'group_2'
  when 'group_4_5' then 'group_3_4'
  else coalesce(booking_tier, 'private')
end;

do $$
begin
  alter table public.lessons drop constraint if exists lessons_booking_tier_check;
  alter table public.lessons
    add constraint lessons_booking_tier_check
    check (booking_tier in ('private', 'group_2', 'group_3_4'));
end $$;

update public.availability
set booking_tier = case coalesce(booking_tier, 'private')
      when 'group_2_3' then 'group_2'
      when 'group_4_5' then 'group_3_4'
      else coalesce(booking_tier, 'private')
    end,
    max_players = case coalesce(booking_tier, 'private')
      when 'group_2' then 2
      when 'group_2_3' then 2
      when 'group_3_4' then 4
      when 'group_4_5' then 4
      else 1
    end;

update public.lessons
set booking_tier = case coalesce(booking_tier, 'private')
  when 'group_2_3' then 'group_2'
  when 'group_4_5' then 'group_3_4'
  else coalesce(booking_tier, 'private')
end;

insert into public.account_players (account_id, player_id)
select p.id, p.player_id
from public.profiles p
where p.player_id is not null
on conflict (account_id, player_id) do nothing;

insert into public.account_players (account_id, player_id)
select pl.parent_id, pl.id
from public.players pl
where pl.parent_id is not null
on conflict (account_id, player_id) do nothing;
