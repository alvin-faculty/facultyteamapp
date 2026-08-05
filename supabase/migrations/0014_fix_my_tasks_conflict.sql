drop index my_tasks_user_project_task_idx;

create unique index my_tasks_user_project_task_idx
  on my_tasks (user_id, project_task_id);