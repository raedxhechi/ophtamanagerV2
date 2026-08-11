-- Multi-office access.
--
-- Until now "the office a user belongs to" was a single column,
-- user_data.doctor_office_id, and every office-scoped policy compared against
-- public.current_office_id(). Managers work across several offices, so access
-- becomes a set. Two concepts now exist side by side:
--
--   user_data.doctor_office_id  -- the ACTIVE office: the one new rows are
--                                  created in (it is still the column default
--                                  for orders.doctor_office_id and
--                                  draft_orders.doctor_office_id) and the one
--                                  the app shows in the header.
--   user_office_access          -- the ACCESS SET: every office the user may
--                                  read and work in.
--
-- For a doctor / assistant the set holds exactly one row, equal to the active
-- office, so their experience is unchanged. For a manager it holds many, and
-- switching the active office (public.set_active_office) just moves a pointer
-- within the set.

-- ---------------------------------------------------------------------------
-- The access set
-- ---------------------------------------------------------------------------

create table public.user_office_access (
    user_id          uuid not null references public.user_data (id) on delete restrict,
    doctor_office_id uuid not null references public.doctor_office (id) on delete restrict,
    created_at       timestamptz not null default now(),
    primary key (user_id, doctor_office_id)
);

-- The primary key already indexes (user_id, ...), which is the lookup
-- public.current_office_ids() does on every query. This one covers the reverse
-- direction — "who has access to this office?" — for admin screens.
create index user_office_access_office_idx
    on public.user_office_access (doctor_office_id);

-- Seed the set from the office each existing user already belongs to.
insert into public.user_office_access (user_id, doctor_office_id)
select id, doctor_office_id
from public.user_data
where doctor_office_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Keeping the set in sync with the active office
-- ---------------------------------------------------------------------------

-- Users are provisioned out of band by the service_role, which sets
-- doctor_office_id directly. Without this trigger such a user would have an
-- active office but an empty access set — and would see nothing at all.
--
-- The invariant it maintains: a non-manager's access set is exactly their
-- active office. So moving a doctor to another office revokes the old one,
-- and demoting a manager collapses their set. For a manager the trigger only
-- ever adds, because changing which office is active must not drop the rest.
create or replace function public.user_data_sync_office_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.role <> 'manager' then
        delete from public.user_office_access
        where user_id = new.id
          and doctor_office_id is distinct from new.doctor_office_id;
    end if;

    if new.doctor_office_id is not null then
        insert into public.user_office_access (user_id, doctor_office_id)
        values (new.id, new.doctor_office_id)
        on conflict do nothing;
    end if;

    return new;
end;
$$;

create trigger user_data_sync_office_access_after_write
    after insert or update of doctor_office_id, role on public.user_data
    for each row
    execute function public.user_data_sync_office_access();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Every office the current user may access, as an array.
--
-- SECURITY DEFINER so it reads user_office_access regardless of RLS and never
-- recurses into the policies that call it — same contract as is_admin() and
-- current_office_id().
--
-- Returns an array rather than a set so callers can wrap it in a scalar
-- subquery: written as `col = any ((select public.current_office_ids()))` the
-- planner evaluates it once per query as an InitPlan instead of once per row.
-- The double parentheses are required — `= any (select ...)` parses as the
-- subquery form of ANY and fails on a uuid vs uuid[] type mismatch.
create or replace function public.current_office_ids()
returns uuid[]
language sql
security definer
set search_path = ''
stable
as $$
    select coalesce(array_agg(doctor_office_id), '{}'::uuid[])
    from public.user_office_access
    where user_id = (select auth.uid());
$$;

-- Helper: is the current user a manager? Mirrors is_admin(). An explicit
-- function rather than an enum comparison like `role >= 'doctor'`, which would
-- silently change meaning the next time a value is added to the enum.
create or replace function public.is_manager()
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
          and role = 'manager'
    );
$$;

-- Move the caller's active office within their access set.
--
-- An RPC rather than an UPDATE policy on user_data: RLS is row-level, so any
-- policy letting a user update their own row would also let them write their
-- own `role` column and promote themselves to admin. This function writes the
-- one column that is safe to write, and only to a value the caller already has
-- access to.
create or replace function public.set_active_office(p_office uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.user_office_access
        where user_id = (select auth.uid())
          and doctor_office_id = p_office
    ) then
        raise exception 'No access to doctor office %', p_office
            using errcode = '42501';
    end if;

    update public.user_data
    set doctor_office_id = p_office,
        updated_at = now()
    where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS on the access set itself
--
-- Read-only for the user it describes; only admins (and the service_role,
-- which bypasses RLS) may grant or revoke access. The self-read policy compares
-- auth.uid() directly instead of calling a helper, so it cannot recurse.
-- ---------------------------------------------------------------------------
alter table public.user_office_access enable row level security;

create policy "Admins have full access to office access rows"
    on public.user_office_access
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Users can view their own office access"
    on public.user_office_access
    for select
    to authenticated
    using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Widen the existing office-scoped policies from the active office to the
-- access set. For single-office users the set contains exactly that office, so
-- these are unchanged in effect.
--
-- Policies that derive access from a parent row need no change: suborders,
-- draft_suborders and the insurance_policy junction tables all gate on an
-- EXISTS against the parent, which runs under the parent's (now widened) RLS.
-- ---------------------------------------------------------------------------

alter policy "Users can view their connected doctor office"
    on public.doctor_office
    using (id = any ((select public.current_office_ids())));

alter policy "Office users can view their office's users"
    on public.user_data
    using (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users have full access to their patients"
    on public.patients
    using (doctor_office_id = any ((select public.current_office_ids())))
    with check (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can view their orders"
    on public.orders
    using (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can create orders for their office"
    on public.orders
    with check (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can view their draft orders"
    on public.draft_orders
    using (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can create draft orders for their office"
    on public.draft_orders
    with check (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can update their draft orders"
    on public.draft_orders
    using (doctor_office_id = any ((select public.current_office_ids())))
    with check (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can delete their draft orders"
    on public.draft_orders
    using (doctor_office_id = any ((select public.current_office_ids())));

alter policy "Office users can view their insurance policies"
    on public.insurance_policy
    using (doctor_office_id = any ((select public.current_office_ids())));

-- ---------------------------------------------------------------------------
-- What a manager gets beyond a doctor.
--
-- Office users may read and create orders but not change them; that has been
-- admin-only. A manager may now correct and remove orders across the offices
-- they cover. Suborders follow the parent order, as everywhere else.
--
-- This is the one piece not implied by the multi-office model itself — adjust
-- the block if the intended split is different.
-- ---------------------------------------------------------------------------

create policy "Managers can update orders in their offices"
    on public.orders
    for update
    to authenticated
    using (
        public.is_manager()
        and doctor_office_id = any ((select public.current_office_ids()))
    )
    with check (
        public.is_manager()
        and doctor_office_id = any ((select public.current_office_ids()))
    );

create policy "Managers can delete orders in their offices"
    on public.orders
    for delete
    to authenticated
    using (
        public.is_manager()
        and doctor_office_id = any ((select public.current_office_ids()))
    );

create policy "Managers can update suborders of their orders"
    on public.suborders
    for update
    to authenticated
    using (
        public.is_manager()
        and exists (
            select 1 from public.orders o
            where o.id = order_id
        )
    )
    with check (
        public.is_manager()
        and exists (
            select 1 from public.orders o
            where o.id = order_id
        )
    );

create policy "Managers can delete suborders of their orders"
    on public.suborders
    for delete
    to authenticated
    using (
        public.is_manager()
        and exists (
            select 1 from public.orders o
            where o.id = order_id
        )
    );
