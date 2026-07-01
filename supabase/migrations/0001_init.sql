-- Faculty Team App: initial schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================

create type project_status as enum ('proposal', 'active', 'review', 'done', 'archived');
create type task_status as enum ('todo', 'in_progress', 'review', 'done');

-- ============================================================
-- Tables
-- ============================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  hourly_rate numeric(10, 2) not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  status project_status not null default 'proposal',
  budget_hours numeric(10, 2),
  budget_amount numeric(12, 2),
  hourly_rate_override numeric(10, 2),
  start_date date,
  end_date date,
  share_token uuid not null default gen_random_uuid(),
  asset_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index projects_share_token_idx on projects (share_token);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  assignee_id uuid references profiles (id) on delete set null,
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index tasks_project_id_idx on tasks (project_id);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_comments_task_id_idx on task_comments (task_id);

create table invoice_batches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  date_range_start date not null,
  date_range_end date not null,
  exported_at timestamptz not null default now(),
  exported_by uuid references profiles (id) on delete set null
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  task_id uuid references tasks (id) on delete set null,
  user_id uuid not null references profiles (id) on delete cascade,
  description text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  billable boolean not null default true,
  rate_snapshot numeric(10, 2) not null default 0,
  locked boolean not null default false,
  invoice_batch_id uuid references invoice_batches (id) on delete set null,
  created_at timestamptz not null default now()
);

create index time_entries_project_id_idx on time_entries (project_id);
create index time_entries_user_id_idx on time_entries (user_id);
create index time_entries_started_at_idx on time_entries (started_at);

-- Only one running timer (ended_at is null) per user at a time.
create unique index time_entries_one_running_per_user
  on time_entries (user_id)
  where ended_at is null;

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security
-- Internal tool for 4 trusted teammates: any authenticated user
-- has full read/write access. The public share view is served
-- server-side with the service-role key instead of a public policy.
-- ============================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table time_entries enable row level security;
alter table invoice_batches enable row level security;

create policy "authenticated full access" on profiles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on projects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on task_comments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on time_entries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on invoice_batches
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
