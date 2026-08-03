-- Patient gender.
create type public.gender as enum ('male', 'female', 'other');

-- Patients belong to a doctor office: one office -> many patients.
create table public.patients (
    id uuid primary key default gen_random_uuid(),
    doctor_office_id uuid not null references public.doctor_office (id) on delete restrict,
    first_name text not null,
    last_name text not null,
    date_of_birth text not null,
    gender public.gender,
    insurance_number text,
    city text,
    street text,
    house_number text,
    zipcode text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Helper: the office the current user is connected to.
-- SECURITY DEFINER so it reads user_data regardless of RLS and never recurses
-- into the policies that call it.
create or replace function public.current_office_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
    select doctor_office_id
    from public.user_data
    where id = (select auth.uid());
$$;

alter table public.patients enable row level security;

-- Admins can do anything to any patient.
create policy "Admins have full access to patients"
    on public.patients
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- Office users have full access to patients of their own office.
create policy "Office users have full access to their patients"
    on public.patients
    for all
    to authenticated
    using (doctor_office_id = public.current_office_id())
    with check (doctor_office_id = public.current_office_id());
