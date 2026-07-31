-- Orders belong to a doctor office and reference a medicine.
-- doctor_office_id defaults to the caller's office so office users don't have to
-- (and, per the RLS below, can't) set it to anything else.
create table public.orders (
    id uuid primary key default gen_random_uuid(),
    medicine_id uuid not null references public.medicine (id) on delete restrict,
    quantity integer not null,
    application_date date,
    delivery_date date,
    doctor_office_id uuid not null default public.current_office_id() references public.doctor_office (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Suborders belong to an order and a patient.
create table public.suborders (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete restrict,
    patient_id uuid not null references public.patients (id) on delete restrict,
    left_eye boolean not null default false,
    right_eye boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders RLS: admins full access; office users may read their office's orders
-- and create new ones (auto-scoped to their office), but not edit or delete.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

create policy "Admins have full access to orders"
    on public.orders
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Office users can view their orders"
    on public.orders
    for select
    to authenticated
    using (doctor_office_id = public.current_office_id());

create policy "Office users can create orders for their office"
    on public.orders
    for insert
    to authenticated
    with check (doctor_office_id = public.current_office_id());

-- ---------------------------------------------------------------------------
-- Suborders RLS mirrors orders, derived from the parent order: a suborder is
-- readable/creatable iff its order is (the EXISTS runs under orders' RLS, which
-- is office-scoped). Editing and deleting remain admin-only.
-- ---------------------------------------------------------------------------
alter table public.suborders enable row level security;

create policy "Admins have full access to suborders"
    on public.suborders
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Office users can view suborders of their orders"
    on public.suborders
    for select
    to authenticated
    using (
        exists (
            select 1 from public.orders o
            where o.id = order_id
        )
    );

create policy "Office users can create suborders for their orders"
    on public.suborders
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.orders o
            where o.id = order_id
        )
    );
