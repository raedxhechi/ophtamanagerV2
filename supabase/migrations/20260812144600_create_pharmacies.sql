-- Pharmacies that serve the doctor offices. One pharmacy serves many offices.
-- The address is kept as a single free-text line plus a separate zipcode, unlike
-- doctor_office (street / house_number / zipcode / city), which had to match the
-- shape of the legacy Directus records.
create table public.pharmacies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone_number text,
    address text,
    zipcode text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Link offices to a pharmacy: one pharmacy -> many doctor offices.
-- Nullable, so the offices that already exist keep working until each one is
-- assigned; restrict on delete, so a pharmacy still serving an office cannot be
-- deleted out from under it.
alter table public.doctor_office
    add column pharmacy_id uuid references public.pharmacies (id) on delete restrict;

-- Every office-scoped read of a pharmacy goes through this column.
create index doctor_office_pharmacy_idx
    on public.doctor_office (pharmacy_id);

-- Helper: which pharmacy is the current user's office attached to?
-- SECURITY DEFINER like current_office_id(), so the pharmacy policy below does
-- not depend on the caller also being able to read their own doctor_office row.
-- Returns null for a user without an office, or whose office has no pharmacy
-- assigned yet — and `id = null` is never true, so they see nothing.
create or replace function public.current_pharmacy_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
    select pharmacy_id
    from public.doctor_office
    where id = public.current_office_id();
$$;

alter table public.pharmacies enable row level security;

-- Office users only ever see the one pharmacy their office is attached to.
create policy "Users can view their office's pharmacy"
    on public.pharmacies
    for select
    to authenticated
    using (id = public.current_pharmacy_id());

-- Admins are the only ones who can create / update / delete entries, and this
-- policy is also what lets them read every pharmacy rather than just one.
create policy "Admins can manage pharmacies"
    on public.pharmacies
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- New tables are no longer auto-exposed through the Data API (see the
-- auto_expose_new_tables note in supabase/config.toml), so the API roles need
-- the privileges spelled out. RLS above still decides which rows they see.
grant select, insert, update, delete on public.pharmacies to authenticated;
