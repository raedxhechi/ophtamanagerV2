-- Every new doctor office joins the default pharmacy.
--
-- The link (doctor_office.pharmacy_id, added in 20260812144600) is nullable and
-- was filled in by hand. It isn't a choice any more: the project runs on one
-- pharmacy, the admin screen shows the offices it serves rather than offering to
-- pick them, and an office with no pharmacy prints no recipient on its order
-- receipts. So the assignment happens where every insert has to pass, instead of
-- in whichever code path created the office — the Directus importer, the
-- Supabase dashboard, or a screen that doesn't exist yet.
--
-- Only when the insert doesn't name a pharmacy, so an explicit one still wins,
-- and only on insert: moving an office to another pharmacy is a separate act and
-- this must never undo it. With no default pharmacy the column stays null, which
-- is the state it has always allowed.
create or replace function public.doctor_office_default_pharmacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.pharmacy_id is null then
        select id
        into new.pharmacy_id
        from public.pharmacies
        where default_pharmacy;
    end if;

    return new;
end;
$$;

create trigger doctor_office_default_pharmacy
    before insert on public.doctor_office
    for each row
    execute function public.doctor_office_default_pharmacy();

-- The same rule applied to the offices already here: a no-op today, since all
-- six point at the one pharmacy, and the statement that makes "every office is
-- served" true rather than only true so far.
update public.doctor_office
set pharmacy_id = (select id from public.pharmacies where default_pharmacy),
    updated_at = now()
where pharmacy_id is null
  and exists (select 1 from public.pharmacies where default_pharmacy);
