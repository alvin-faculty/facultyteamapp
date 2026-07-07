-- Faculty Team App: interactive flow builder (per-project node graph)
-- Run this in the Supabase SQL editor after 0002_sections_subtasks.sql.

create type flow_node_type as enum ('task', 'note', 'document');

create table flow_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  type flow_node_type not null default 'note',
  label text not null,
  task_id uuid references tasks (id) on delete set null,
  url text,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  created_at timestamptz not null default now()
);

create index flow_nodes_project_id_idx on flow_nodes (project_id);

create table flow_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_node_id uuid not null references flow_nodes (id) on delete cascade,
  target_node_id uuid not null references flow_nodes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index flow_edges_project_id_idx on flow_edges (project_id);

alter table flow_nodes enable row level security;
alter table flow_edges enable row level security;

create policy "authenticated full access" on flow_nodes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on flow_edges
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
