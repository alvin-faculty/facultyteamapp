create table task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

alter table task_assignees enable row level security;

create policy "authenticated full access" on task_assignees
  for all to authenticated using (true) with check (true);
