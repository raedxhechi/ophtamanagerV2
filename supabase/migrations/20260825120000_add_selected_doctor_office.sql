-- The doctor office an admin or manager is browsing in.
--
-- A doctor, assistant or pharmacist works in exactly one office and never picks
-- one: user_data.doctor_office_id is both where they are and all they can see.
-- An admin reaches every office and a manager reaches their access set (see
-- 20260811120100_create_user_office_access.sql), so for those two the app has
-- to know *which* of them they are currently working in — the private area
-- lists that office's patients and orders, and creates new ones there.
--
-- It lives in user_settings rather than user_data because it is a preference,
-- not a grant. Nothing about access is decided here: RLS still answers to
-- current_office_ids(), so a selection outside what the user may reach returns
-- nothing rather than more. The app re-checks it against the offices the user
-- can actually see on every read, and falls back to the first of them — which
-- is also what happens the first time, before anything has been chosen.
--
-- ON DELETE RESTRICT to match every other FK in the schema. In practice it
-- changes nothing: doctor_office is already pinned by patients, orders and
-- user_data with the same rule, so an office someone could still have selected
-- is an office that cannot be deleted anyway.
alter table public.user_settings
    add column selected_doctor_office uuid
        references public.doctor_office (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Indexes for reading one office's rows.
--
-- Until now every office-scoped list came back through RLS alone, and Postgres
-- had no index to answer `doctor_office_id = ...` with — a sequential scan of
-- the whole table, sorted, on every page view. With a selected office the
-- filter also becomes explicit in the query, and these three lists are the
-- app's hot path.
--
-- Composite rather than a plain FK index, and in exactly the shape the lists
-- ask for:
--
--   where doctor_office_id = $1 order by created_at desc, id desc limit 100
--
-- Leading with the office serves the equality; carrying the sort columns in
-- their sort order lets the index supply the ordering too, so a page is a range
-- scan of 100 rows instead of a sort of the office's whole history. The leading
-- column still answers a plain foreign-key lookup and the `= any (...)` RLS
-- checks, so no separate index is needed for those.
--
-- `id` is the tiebreaker the lists already order by, so that pagination cannot
-- shuffle rows sharing a created_at (see PatientsData / OrdersData).
create index patients_office_created_idx
    on public.patients (doctor_office_id, created_at desc, id desc);

create index orders_office_created_idx
    on public.orders (doctor_office_id, created_at desc, id desc);

-- Drafts are listed unpaginated and only by created_at, so no id column here.
create index draft_orders_office_created_idx
    on public.draft_orders (doctor_office_id, created_at desc);
