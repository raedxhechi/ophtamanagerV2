-- A doctor office that groups together many users.
create table public.doctor_office (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text,
    phone_number text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Link users to an office: many users -> one office.
-- Nullable so a user (e.g. an admin) need not belong to an office;
-- set null on delete so removing an office doesn't remove its users.
alter table public.user_data
    add column doctor_office_id uuid references public.doctor_office (id) on delete set null;

-- Helper: is the current user an admin?
-- SECURITY DEFINER so it reads user_data regardless of RLS and never recurses
-- into the policies that call it.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1
        from public.user_data
        where id = (select auth.uid())
          and role = 'admin'
    );
$$;

alter table public.doctor_office enable row level security;

-- Admins can do anything to any office.
create policy "Admins have full access to doctor offices"
    on public.doctor_office
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- Everyone else may only read the office they're connected to.
create policy "Users can view their connected doctor office"
    on public.doctor_office
    for select
    to authenticated
    using (
        id in (
            select doctor_office_id
            from public.user_data
            where id = (select auth.uid())
        )
    );
