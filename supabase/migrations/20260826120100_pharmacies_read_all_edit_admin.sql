-- Who may do what with a pharmacy, restated.
--
-- Reading: everyone signed in. The policy this replaces showed a user only the
-- pharmacy their own office is attached to, which was right while a pharmacy was
-- something an office had one of. It isn't: the project runs on a single
-- pharmacy serving every office (hence the default flag added alongside this),
-- and there is nothing in a pharmacy row — a name, an address, who to ask for —
-- that one signed-in user should be kept from while another sees it.
--
-- Writing: admins, and only ever an update. Nobody creates or deletes a pharmacy
-- from the app, which is why there is no policy for either.
drop policy "Users can view their office's pharmacy" on public.pharmacies;
drop policy "Admins can manage pharmacies" on public.pharmacies;

create policy "Authenticated users can view pharmacies"
    on public.pharmacies
    for select
    to authenticated
    using (true);

create policy "Admins can update pharmacies"
    on public.pharmacies
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- With no insert or delete policy, RLS already refuses both. Taking the
-- privileges away as well makes that refusal an outright 403 rather than a write
-- that matches no rows, and leaves nothing for a later policy to switch back on
-- by accident.
revoke insert, delete on public.pharmacies from authenticated;

-- public.current_pharmacy_id() is left in place but is no longer called by
-- anything: the select policy above needs no per-user narrowing, and it was that
-- policy's only caller. It stays because it still answers a real question — which
-- pharmacy serves the office I am in — for whoever needs it next.
