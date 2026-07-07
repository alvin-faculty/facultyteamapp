-- Faculty Team App: admin/employee roles + account enable/disable
-- Run this in the Supabase SQL editor for your project.

create type user_role as enum ('admin', 'employee');

alter table profiles add column role user_role not null default 'employee';
alter table profiles add column disabled boolean not null default false;

-- One-time bootstrap: make the existing owner an admin.
update profiles set role = 'admin' where email = 'alvin@studiofaculty.com';
