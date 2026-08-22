-- Let admins manage every user_data row.
--
-- The table has carried only SELECT policies until now — your own row, and the
-- rows of your own office — because users were provisioned out of band by the
-- service_role, which bypasses RLS entirely. The admin users screen
-- (app/admin/users) moves that provisioning into the app, where it runs through
-- the caller's own session, so admins need the same full access they already
-- hold on doctor_office and user_office_access.
--
-- Scoped to admins on purpose. A policy that let users write their *own* row
-- would let anyone set their own `role` and promote themselves — which is why
-- public.set_active_office() exists as an RPC rather than an UPDATE policy (see
-- 20260811120100_create_user_office_access.sql).
create policy "Admins have full access to user data"
    on public.user_data
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
