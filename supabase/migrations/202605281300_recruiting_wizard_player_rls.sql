-- Allow players (and linked family accounts) to complete the recruiting wizard

drop policy if exists "Player can insert own recruiting profile" on public.recruiting_profiles;
create policy "Player can insert own recruiting profile"
  on public.recruiting_profiles
  for insert
  to authenticated
  with check (
    player_id in (
      select p.player_id
      from public.profiles p
      where p.id = auth.uid()
        and p.player_id is not null
    )
    or player_id in (
      select ap.player_id
      from public.account_players ap
      where ap.account_id = auth.uid()
    )
  );

drop policy if exists "Player can update own recruiting profile" on public.recruiting_profiles;
create policy "Player can update own recruiting profile"
  on public.recruiting_profiles
  for update
  to authenticated
  using (
    player_id in (
      select p.player_id
      from public.profiles p
      where p.id = auth.uid()
        and p.player_id is not null
    )
    or player_id in (
      select ap.player_id
      from public.account_players ap
      where ap.account_id = auth.uid()
    )
  )
  with check (
    player_id in (
      select p.player_id
      from public.profiles p
      where p.id = auth.uid()
        and p.player_id is not null
    )
    or player_id in (
      select ap.player_id
      from public.account_players ap
      where ap.account_id = auth.uid()
    )
  );
