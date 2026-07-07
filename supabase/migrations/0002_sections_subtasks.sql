-- Faculty Team App: sections, subtasks, completed flag
-- Run this in the Supabase SQL editor after 0001_init.sql.

create table sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index sections_project_id_idx on sections (project_id);

alter table tasks add column section_id uuid references sections (id) on delete set null;
alter table tasks add column completed boolean not null default false;
alter table tasks add column parent_task_id uuid references tasks (id) on delete cascade;

create index tasks_section_id_idx on tasks (section_id);
create index tasks_parent_task_id_idx on tasks (parent_task_id);

-- Backfill: create default sections per project and migrate status -> section_id/completed
do $$
declare
  proj record;
  sec_todo uuid;
  sec_in_progress uuid;
  sec_review uuid;
  sec_done uuid;
begin
  for proj in select id from projects loop
    insert into sections (project_id, name, position) values (proj.id, 'To do', 0) returning id into sec_todo;
    insert into sections (project_id, name, position) values (proj.id, 'In Progress', 1) returning id into sec_in_progress;
    insert into sections (project_id, name, position) values (proj.id, 'Review', 2) returning id into sec_review;
    insert into sections (project_id, name, position) values (proj.id, 'Done', 3) returning id into sec_done;

    update tasks
    set
      section_id = case status
        when 'todo' then sec_todo
        when 'in_progress' then sec_in_progress
        when 'review' then sec_review
        when 'done' then sec_done
      end,
      completed = (status = 'done')
    where project_id = proj.id;
  end loop;
end $$;

alter table tasks drop column status;
drop type task_status;

alter table sections enable row level security;
create policy "authenticated full access" on sections
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
