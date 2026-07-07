-- Faculty Team App: explicit project team assignment
-- Run this in the Supabase SQL editor for your project.

create table project_members (
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table project_members enable row level security;

create policy "authenticated full access" on project_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
