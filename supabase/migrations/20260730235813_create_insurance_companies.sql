-- Type of insurance.
create type public.insurance_type as enum ('Privat', 'Gesetzlich');

-- Global insurance company catalog shared across all offices.
create table public.insurance_companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    insurance_type public.insurance_type not null,
    iknumber text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Link patients to an insurance company: one company -> many patients.
alter table public.patients
    add column insurance_company_id uuid references public.insurance_companies (id) on delete restrict;

alter table public.insurance_companies enable row level security;

-- Any authenticated user can read the catalog.
create policy "Authenticated users can view insurance companies"
    on public.insurance_companies
    for select
    to authenticated
    using (true);

-- Only admins can create / update / delete catalog entries.
create policy "Admins can manage insurance companies"
    on public.insurance_companies
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
