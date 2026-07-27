alter table clients add column slug text;
alter table suppliers add column slug text;

create table client_slug_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table supplier_slug_history (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table client_slug_history enable row level security;
create policy "authenticated full access" on client_slug_history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table supplier_slug_history enable row level security;
create policy "authenticated full access" on supplier_slug_history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Backfill slugs for any existing rows, de-duplicated
do $$
declare
  rec record;
  base_slug text;
  candidate text;
  suffix int;
begin
  for rec in select id, name from clients order by created_at loop
    base_slug := trim(both '-' from regexp_replace(lower(rec.name), '[^a-z0-9]+', '-', 'g'));
    candidate := base_slug;
    suffix := 1;
    while exists (select 1 from clients where slug = candidate) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;
    update clients set slug = candidate where id = rec.id;
  end loop;

  for rec in select id, name from suppliers order by created_at loop
    base_slug := trim(both '-' from regexp_replace(lower(rec.name), '[^a-z0-9]+', '-', 'g'));
    candidate := base_slug;
    suffix := 1;
    while exists (select 1 from suppliers where slug = candidate) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;
    update suppliers set slug = candidate where id = rec.id;
  end loop;
end $$;

alter table clients alter column slug set not null;
alter table suppliers alter column slug set not null;

create unique index clients_slug_idx on clients (slug);
create unique index suppliers_slug_idx on suppliers (slug);