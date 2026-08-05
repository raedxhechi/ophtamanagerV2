-- Draft ("parked") orders: the same shape as orders/suborders, but every column
-- is optional so a half-filled create-order form can be saved and resumed later.
-- The only required piece is a draft suborder's patient — a suborder without a
-- patient carries no information at all. Mirrors the legacy Directus
-- draftOrders / draftSubOrders collections (see directus/snapshot.json).
--
-- A draft is deleted (children first, see api/browser/draftOrders.ts) once a
-- real order has been created from it.
create table public.draft_orders (
    id uuid primary key default gen_random_uuid(),
    medicine_id uuid references public.medicine (id) on delete restrict,
    quantity integer,
    application_date date,
    delivery_date date,
    doctor_office_id uuid not null default public.current_office_id() references public.doctor_office (id) on delete restrict,
    created_by uuid default auth.uid() references public.user_data (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Draft suborders belong to a draft order and a patient. `patient_id` is the one
-- non-nullable field (besides the parent link); the eyes and the invoice type can
-- all still be undecided while the draft is being filled in.
create table public.draft_suborders (
    id uuid primary key default gen_random_uuid(),
    draft_order_id uuid not null references public.draft_orders (id) on delete restrict,
    patient_id uuid not null references public.patients (id) on delete restrict,
    left_eye boolean default false,
    right_eye boolean default false,
    invoice_type public.invoice_types,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Draft orders RLS: admins full access; office users get full access to their
-- own office's drafts. Unlike real orders (read/create only for office users),
-- drafts are scratch data the office owns: they must be editable while being
-- filled in and deletable once turned into an order.
-- ---------------------------------------------------------------------------
alter table public.draft_orders enable row level security;

create policy "Admins have full access to draft orders"
    on public.draft_orders
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Office users can view their draft orders"
    on public.draft_orders
    for select
    to authenticated
    using (doctor_office_id = public.current_office_id());

create policy "Office users can create draft orders for their office"
    on public.draft_orders
    for insert
    to authenticated
    with check (doctor_office_id = public.current_office_id());

create policy "Office users can update their draft orders"
    on public.draft_orders
    for update
    to authenticated
    using (doctor_office_id = public.current_office_id())
    with check (doctor_office_id = public.current_office_id());

create policy "Office users can delete their draft orders"
    on public.draft_orders
    for delete
    to authenticated
    using (doctor_office_id = public.current_office_id());

-- ---------------------------------------------------------------------------
-- Draft suborders RLS mirrors the suborders pattern: access is derived from the
-- parent draft order (the EXISTS runs under draft_orders' RLS, which is
-- office-scoped), extended with update/delete for the same reason as above.
-- ---------------------------------------------------------------------------
alter table public.draft_suborders enable row level security;

create policy "Admins have full access to draft suborders"
    on public.draft_suborders
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Office users can view suborders of their draft orders"
    on public.draft_suborders
    for select
    to authenticated
    using (
        exists (
            select 1 from public.draft_orders d
            where d.id = draft_order_id
        )
    );

create policy "Office users can create suborders for their draft orders"
    on public.draft_suborders
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.draft_orders d
            where d.id = draft_order_id
        )
    );

create policy "Office users can update suborders of their draft orders"
    on public.draft_suborders
    for update
    to authenticated
    using (
        exists (
            select 1 from public.draft_orders d
            where d.id = draft_order_id
        )
    )
    with check (
        exists (
            select 1 from public.draft_orders d
            where d.id = draft_order_id
        )
    );

create policy "Office users can delete suborders of their draft orders"
    on public.draft_suborders
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.draft_orders d
            where d.id = draft_order_id
        )
    );
