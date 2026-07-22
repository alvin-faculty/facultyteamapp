create table project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_comments_project_id_idx on project_comments (project_id);

alter table project_comments enable row level security;

-- Anyone authenticated can read all comments (matches app-wide read pattern)
create policy "authenticated read access" on project_comments
  for select using (auth.role() = 'authenticated');

-- Anyone authenticated can create a comment, but only as themselves
create policy "insert own comments" on project_comments
  for insert with check (auth.uid() = user_id);

-- Only the author can edit their own comment
create policy "update own comments" on project_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Author can delete their own; admins can delete any
create policy "delete own or admin" on project_comments
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );