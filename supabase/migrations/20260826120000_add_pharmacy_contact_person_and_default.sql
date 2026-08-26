-- The two fields the admin pharmacy screen adds, and the rule behind the second.
--
-- `contact_person` is the named person to ask for at the pharmacy — the same
-- column doctor_office got in 20260813032800, for the same reason, and nullable
-- for the same one: the row that already exists keeps working until it is filled
-- in.
--
-- `default_pharmacy` marks the one pharmacy this project runs on. Several
-- pharmacies is a shape the app is not ready for — the admin screen says so out
-- loud instead of offering a create form — so this flag is what "the pharmacy"
-- resolves to for anything that needs one and has no office to ask.
alter table public.pharmacies
    add column contact_person text,
    add column default_pharmacy boolean not null default false;

-- At most one default, enforced by the database rather than by whoever is
-- writing. A partial unique index and not a check constraint: a constraint only
-- ever sees the row in front of it, while this indexes the `true` rows alone —
-- so any number of pharmacies may be non-default and exactly one may be default.
create unique index pharmacies_one_default_idx
    on public.pharmacies (default_pharmacy)
    where default_pharmacy;

-- Moving the default has to clear the old one, and the client cannot do that in
-- two statements: whichever it sends first either trips the index above or, if
-- the second never lands, leaves the project with no default at all. So marking
-- a pharmacy as the default is itself what clears the others.
--
-- The update below writes default_pharmacy = false, which re-fires this trigger
-- for those rows — the WHEN clause is false for them, so it stops there instead
-- of recursing. SECURITY DEFINER for the same reason as the helpers in
-- 20260812144600: the trigger's own write must not depend on the caller's
-- policies, only on the one that let them update the row in the first place.
create or replace function public.pharmacies_clear_other_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.pharmacies
    set default_pharmacy = false
    where default_pharmacy
      and id <> new.id;

    return new;
end;
$$;

create trigger pharmacies_clear_other_defaults
    before insert or update of default_pharmacy on public.pharmacies
    for each row
    when (new.default_pharmacy)
    execute function public.pharmacies_clear_other_defaults();

-- The project has exactly one pharmacy and all six doctor offices already point
-- at it, so it is the default in everything but name. Written as "the only row"
-- rather than by id: nothing to guess against a project that has none, and a
-- no-op on one that has already chosen.
update public.pharmacies
set default_pharmacy = true
where (select count(*) from public.pharmacies) = 1
  and not exists (select 1 from public.pharmacies where default_pharmacy);
