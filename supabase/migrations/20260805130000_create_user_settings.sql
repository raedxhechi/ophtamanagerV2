-- Per-user UI preferences, one row per user. Like user_data -> auth.users, the
-- primary key doubles as the foreign key so the relationship is 1:1.
--
-- Both settings columns hold one table's column-selector state:
--   {
--     "columnOrder": ["name", "date_of_birth", ...],
--     "columnVisibility": { "street": false, "zipcode": false }
--   }
-- They are nullable: a user who has never touched a column selector has no
-- stored preference and the table falls back to its built-in defaults.
create table public.user_settings (
    user_id uuid primary key default auth.uid() references public.user_data (id) on delete restrict,
    orders_table_settings jsonb,
    patient_table_settings jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Admins have full access to user settings"
    on public.user_settings
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "Users can view their own settings"
    on public.user_settings
    for select
    to authenticated
    using (user_id = (select auth.uid()));

create policy "Users can update their own settings"
    on public.user_settings
    for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

-- Settings are written with an upsert the first time a user rearranges a
-- table's columns, so every user needs INSERT for their own row — otherwise
-- that first save fails for everyone who isn't an admin and rows would have to
-- be provisioned out of band. The policy stays self-scoped: a user can only
-- insert a row keyed to their own id.
create policy "Users can create their own settings"
    on public.user_settings
    for insert
    to authenticated
    with check (user_id = (select auth.uid()));
