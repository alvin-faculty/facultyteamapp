create type region as enum ('canada', 'usa', 'asia', 'uk_europe');

-- Clients: add phone, region, and contact title
alter table clients add column phone text;
alter table clients add column region region;
alter table clients add column contact_name_title text;

-- Suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_name_title text,
  contact_email text,
  phone text,
  address text,
  notes text,
  region region,
  created_at timestamptz not null default now()
);

create index suppliers_name_idx on suppliers (name);

alter table suppliers enable row level security;
create policy "authenticated full access" on suppliers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Additional contacts, one client can have many
create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create index client_contacts_client_id_idx on client_contacts (client_id);

alter table client_contacts enable row level security;
create policy "authenticated full access" on client_contacts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Additional contacts, one supplier can have many
create table supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create index supplier_contacts_supplier_id_idx on supplier_contacts (supplier_id);

alter table supplier_contacts enable row level security;
create policy "authenticated full access" on supplier_contacts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');