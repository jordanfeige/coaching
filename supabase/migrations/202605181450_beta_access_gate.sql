alter table profiles
  add column if not exists beta_status text default 'pending';

update profiles
set beta_status = 'approved'
where email in (
  'jordanfeige@gmail.com'
);
