create type my_task_category as enum ('studio', 'sort', 'personal');
create type my_task_status as enum ('not_started', 'in_progress', 'waiting', 'done');

create table my_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  category my_task_category not null,
  title text,
  status my_task_status not null default 'not_started',
  project_task_id uuid references tasks (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Freeform items (SORT/Personal) need a title; Studio items get their title
-- from the linked project task instead, so title can be null only when linked.
alter table my_tasks add constraint my_tasks_title_check
  check (title is not null or project_task_id is not null);

-- Prevents duplicate Studio cards if assignment logic runs twice for the same user/task
create unique index my_tasks_user_project_task_idx
  on my_tasks (user_id, project_task_id)
  where project_task_id is not null;

create index my_tasks_user_id_idx on my_tasks (user_id);

alter table my_tasks enable row level security;

create policy "own my_tasks only" on my_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);