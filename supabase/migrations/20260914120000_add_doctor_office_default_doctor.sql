-- A doctor office may name a default doctor: one of the doctors who work in it.
-- Nullable, so every office that exists today keeps working until an admin picks
-- one on /admin/doctor-offices.
--
-- A reference to user_data, like every other link to a person in this schema,
-- and ON DELETE RESTRICT like all of them — which is why public.delete_app_user()
-- is redefined at the bottom of this file.
alter table public.doctor_office
    add column default_doctor_id uuid references public.user_data (id) on delete restrict;

-- The reverse lookup — "which office has this user as its default doctor?" —
-- that both the RESTRICT check on a user delete and the release trigger below do.
create index doctor_office_default_doctor_idx
    on public.doctor_office (default_doctor_id);

-- ---------------------------------------------------------------------------
-- The default doctor is a doctor in this office
-- ---------------------------------------------------------------------------

-- The foreign key only says the user exists. What the column means is
-- narrower: a user whose role is doctor and whose office is this one. Checked
-- where every write has to pass, so the dashboard and any later screen are held
-- to it as well as the admin drawer.
--
-- SECURITY DEFINER so the lookup sees the doctor's row whoever is writing,
-- rather than whatever user_data RLS happens to show them.
create or replace function public.doctor_office_check_default_doctor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.default_doctor_id is not null and not exists (
        select 1
        from public.user_data
        where id = new.default_doctor_id
          and role = 'doctor'
          and doctor_office_id = new.id
    ) then
        raise exception 'Only a doctor who works in this office can be its default doctor'
            using errcode = '23514';
    end if;

    return new;
end;
$$;

-- `update of default_doctor_id`, so saving an office's address — or the
-- Directus importer upserting one — never re-runs the check.
create trigger doctor_office_check_default_doctor
    before insert or update of default_doctor_id on public.doctor_office
    for each row
    execute function public.doctor_office_check_default_doctor();

-- ---------------------------------------------------------------------------
-- A doctor who leaves stops being the default
-- ---------------------------------------------------------------------------

-- The check above holds the office's side; this holds the user's. Moving a
-- doctor to another office (from either admin screen — ticking a doctor into an
-- office is a move) or giving them another role would otherwise leave their old
-- office naming someone who no longer works there, and nothing would say so
-- until the default was used. The office goes back to having none rather than
-- being handed another doctor: picking one is the admin's call.
--
-- SECURITY DEFINER so the release happens whoever made the change, rather than
-- depending on that caller also being allowed to write the office.
create or replace function public.user_data_release_default_doctor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.doctor_office
    set default_doctor_id = null,
        updated_at = now()
    where default_doctor_id = new.id
      and (new.role <> 'doctor' or id is distinct from new.doctor_office_id);

    return null;
end;
$$;

create trigger user_data_release_default_doctor_after_update
    after update of doctor_office_id, role on public.user_data
    for each row
    when (
        old.doctor_office_id is distinct from new.doctor_office_id
        or old.role is distinct from new.role
    )
    execute function public.user_data_release_default_doctor();

-- ---------------------------------------------------------------------------
-- Deleting a user who is an office's default doctor
-- ---------------------------------------------------------------------------

-- Unchanged from 20260822140000_delete_app_user.sql but for one statement: the
-- new foreign key is RESTRICT too, so the office lets go of the user before the
-- profile goes. It is released like the orders are unlinked, not counted — the
-- office simply has no default doctor until an admin picks another.
--
-- CREATE OR REPLACE keeps the function's existing grants.
create or replace function public.delete_app_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_orders bigint;
    v_drafts bigint;
    v_logs   bigint;
begin
    if not public.is_admin() then
        raise exception 'Only admins can delete users'
            using errcode = '42501';
    end if;

    -- Deleting yourself would drop your own admin row and lock the admin area
    -- behind an account that no longer exists.
    if p_user = (select auth.uid()) then
        raise exception 'You cannot delete your own account'
            using errcode = '42501';
    end if;

    update public.orders set created_by = null where created_by = p_user;
    get diagnostics v_orders = row_count;

    update public.draft_orders set created_by = null where created_by = p_user;
    get diagnostics v_drafts = row_count;

    update public.system_logs set user_id = null where user_id = p_user;
    get diagnostics v_logs = row_count;

    update public.doctor_office
    set default_doctor_id = null,
        updated_at = now()
    where default_doctor_id = p_user;

    delete from public.user_settings where user_id = p_user;
    delete from public.user_office_access where user_id = p_user;

    delete from public.user_data where id = p_user;

    -- Counts for the confirmation the admin gets back: what was kept, not what
    -- was removed.
    return jsonb_build_object(
        'orders', v_orders,
        'draft_orders', v_drafts,
        'system_logs', v_logs
    );
end;
$$;
