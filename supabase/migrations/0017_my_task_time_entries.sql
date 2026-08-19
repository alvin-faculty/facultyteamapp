alter table time_entries alter column project_id drop not null;

alter table time_entries add column my_task_id uuid references my_tasks (id) on delete cascade;

alter table time_entries add constraint time_entries_project_or_my_task
  check (project_id is not null or my_task_id is not null);

create index time_entries_my_task_id_idx on time_entries (my_task_id);