-- The patient's insurance status, as it is typed into the "Status" box of the
-- Muster 16 form (the IVOM and GKV prescription pads print it there, beside the
-- Versicherten-Nr.). Free text rather than a code list: what belongs in that box
-- is whatever the practice writes on paper, and the form places no constraint on
-- it beyond fitting the space.
--
-- Nullable, with no default and no backfill: the patients that already exist
-- predate the column and nobody has recorded a status for them, so they stay
-- null — "no status recorded" — and the prescription simply leaves the box
-- empty, exactly as it does today.
alter table public.patients
    add column status text;

-- No new policy. The patients RLS (20260730234511_create_patients.sql) grants
-- admins and the patient's own office `for all`, so reading and writing the new
-- column follows the same rule as every other patient field.
