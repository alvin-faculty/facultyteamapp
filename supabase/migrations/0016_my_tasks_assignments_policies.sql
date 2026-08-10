drop policy "own my_tasks only" on my_tasks;

create policy "select own my_tasks" on my_tasks
  for select using (auth.uid() = user_id);

create policy "update own my_tasks" on my_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "insert own or assigned studio card" on my_tasks
  for insert
  with check (
    auth.uid() = user_id
    or (
      category = 'studio'
      and project_task_id is not null
      and exists (
        select 1 from task_assignees
        where task_assignees.task_id = my_tasks.project_task_id
        and task_assignees.user_id = my_tasks.user_id
      )
    )
  );

create policy "delete own or unassigned studio card" on my_tasks
  for delete
  using (
    auth.uid() = user_id
    or (
      category = 'studio'
      and project_task_id is not null
      and exists (
        select 1 from task_assignees
        where task_assignees.task_id = my_tasks.project_task_id
        and task_assignees.user_id = my_tasks.user_id
      )
    )
  );