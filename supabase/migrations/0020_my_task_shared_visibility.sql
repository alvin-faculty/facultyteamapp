drop policy "select own my_tasks" on my_tasks;
drop policy "insert own or assigned studio card" on my_tasks;

create policy "authenticated select all my_tasks" on my_tasks
  for select using (auth.role() = 'authenticated');

create policy "authenticated insert any my_tasks" on my_tasks
  for insert with check (auth.role() = 'authenticated');