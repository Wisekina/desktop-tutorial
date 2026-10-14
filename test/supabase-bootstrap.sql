-- Isolated PostgreSQL fixture only; Supabase supplies these roles and auth.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key,email text unique);
create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001','test-organizer@example.com'),('00000000-0000-0000-0000-000000000002','test-outsider@example.com');
