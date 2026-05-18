create table if not exists analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid references analysis_sessions(id) on delete cascade,
  feedback_type text not null,
  rating text not null,
  comment text,
  sport text,
  shot_type text,
  full_analysis jsonb,
  chat_message text,
  chat_response text,
  created_at timestamptz default now()
);

alter table analysis_feedback enable row level security;

drop policy if exists "Users can insert own feedback" on analysis_feedback;
create policy "Users can insert own feedback"
  on analysis_feedback for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can read own feedback" on analysis_feedback;
create policy "Users can read own feedback"
  on analysis_feedback for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admin can read all feedback" on analysis_feedback;
create policy "Admin can read all feedback"
  on analysis_feedback for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'jordanfeige@gmail.com');
