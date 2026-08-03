-- Enum describing the role a user holds within the application.
create type public.user_role as enum ('admin', 'doctor', 'assistant', 'pharmacist');

-- Per-user application data, one row per auth user.
-- The primary key doubles as the foreign key to auth.users so the relationship is 1:1.
create table public.user_data (
    id uuid primary key references auth.users (id) on delete restrict,
    role public.user_role not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Lock the table down: with RLS enabled and only the SELECT policy below,
-- insert / update / delete are denied for the anon and authenticated roles.
-- Rows are managed out-of-band (e.g. by the service_role, which bypasses RLS).
alter table public.user_data enable row level security;

-- A user may read only their own row.
create policy "Users can view their own data"
    on public.user_data
    for select
    to authenticated
    using ((select auth.uid()) = id);
