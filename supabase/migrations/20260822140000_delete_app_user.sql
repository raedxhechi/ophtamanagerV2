-- Remove a user, and everything that is only about that user, in one
-- transaction.
--
-- A function rather than a handful of statements in the server action, for two
-- reasons. It is atomic: the alternative leaves a user half-deleted when the
-- fourth of six statements fails. And system_logs has no UPDATE policy at all —
-- deliberately, the table is service-role-write-only — so touching it from a
-- session needs SECURITY DEFINER with an admin check standing in for the absent
-- policy, exactly as public.prune_system_logs() does.
--
-- What survives, and why: every FK into user_data is ON DELETE RESTRICT, which
-- is the project-wide default and the reason this cannot be a plain DELETE.
-- Orders, draft orders and audit rows are not the user's property — they are the
-- practice's record of what happened — so they stay and lose their link instead.
-- `orders.created_by` and `draft_orders.created_by` are already nullable for
-- rows written out-of-band, and system_logs keeps `user_email`, `user_role` and
-- `doctor_office_id` alongside `user_id`, so an unlinked audit row still says
-- who did what. Table preferences and office grants describe nobody but the
-- user, and go with them.
--
-- The auth.users row is deleted by the caller afterwards, through the admin API
-- (see deleteUser in app/admin/users/actions.ts) — user_data references it with
-- ON DELETE RESTRICT, so it can only go once this function has committed.
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

-- SECURITY DEFINER runs as the owner, so the grant is the only gate besides the
-- is_admin() check above. anon has no business calling it.
revoke execute on function public.delete_app_user(uuid) from public, anon;
grant execute on function public.delete_app_user(uuid) to authenticated;
