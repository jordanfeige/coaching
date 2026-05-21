-- Birth date for age-based trajectory forecasting and USTA bracket math.
alter table public.players
  add column if not exists birth_date date;

comment on column public.players.birth_date is
  'Player birth date for trajectory forecasting, USTA bracket assignment, and graduation age. Optional — fuzzy fallback uses grad_year when null.';
