-- Insurance policies belong to a doctor office: one office -> many policies.
-- doctor_office_id is nullable so a policy can be created first and attached later.
create table public.insurance_policy (
    id uuid primary key default gen_random_uuid(),
    doctor_office_id uuid references public.doctor_office (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Junction: many-to-many between policies and medicines.
create table public.insurance_policy_medicines (
    insurance_policy_id uuid not null references public.insurance_policy (id) on delete cascade,
    medicine_id uuid not null references public.medicine (id) on delete restrict,
    primary key (insurance_policy_id, medicine_id)
);

-- Junction: many-to-many between policies and insurance companies.
create table public.insurance_policy_insurance_companies (
    insurance_policy_id uuid not null references public.insurance_policy (id) on delete cascade,
    insurance_company_id uuid not null references public.insurance_companies (id) on delete restrict,
    primary key (insurance_policy_id, insurance_company_id)
);

-- ---------------------------------------------------------------------------
-- RLS: admins manage policies; office users may only read their office's.
-- ---------------------------------------------------------------------------
alter table public.insurance_policy enable row level security;

create policy "Admins have full access to insurance policies"
    on public.insurance_policy
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Office users can view their insurance policies"
    on public.insurance_policy
    for select
    to authenticated
    using (doctor_office_id = public.current_office_id());

-- ---------------------------------------------------------------------------
-- Junction tables: reads follow parent-policy visibility (so office users can
-- read the links of policies they can see), while writes are admin-only.
-- The EXISTS subquery is itself subject to insurance_policy's RLS.
-- ---------------------------------------------------------------------------
alter table public.insurance_policy_medicines enable row level security;

create policy "Admins can manage policy-medicine links"
    on public.insurance_policy_medicines
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Read policy-medicine links via the parent policy"
    on public.insurance_policy_medicines
    for select
    to authenticated
    using (
        exists (
            select 1 from public.insurance_policy p
            where p.id = insurance_policy_id
        )
    );

alter table public.insurance_policy_insurance_companies enable row level security;

create policy "Admins can manage policy-company links"
    on public.insurance_policy_insurance_companies
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Read policy-company links via the parent policy"
    on public.insurance_policy_insurance_companies
    for select
    to authenticated
    using (
        exists (
            select 1 from public.insurance_policy p
            where p.id = insurance_policy_id
        )
    );
