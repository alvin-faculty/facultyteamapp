alter table projects add column project_number text;
alter table projects add column dropbox_folder_url text;
alter table projects add column proposal_scope_url text;

insert into storage.buckets (id, name, public)
values ('proposal-scopes', 'proposal-scopes', true)
on conflict (id) do nothing;

create policy "authenticated full access to proposal-scopes" on storage.objects
  for all to authenticated
  using (bucket_id = 'proposal-scopes')
  with check (bucket_id = 'proposal-scopes');
