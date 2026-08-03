-- Type of medicine.
create type public.medicine_type as enum ('Rezeptur', 'Fertigarzneimittel');

-- Global medicine catalog shared across all offices.
create table public.medicine (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    medicine_type public.medicine_type not null,
    background_color text,
    text_color text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.medicine enable row level security;

-- Any authenticated user can read the catalog.
create policy "Authenticated users can view medicine"
    on public.medicine
    for select
    to authenticated
    using (true);

-- Only admins can create / update / delete catalog entries.
create policy "Admins can manage medicine"
    on public.medicine
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
