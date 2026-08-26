-- Where to write to the pharmacy, next to the person and the phone number the
-- table already carries (contact_person came with
-- 20260826120000_add_pharmacy_contact_person_and_default).
--
-- Nullable, like every other contact detail here: the row that already exists
-- keeps working until someone fills it in, and an address is not something to
-- invent a placeholder for. No format constraint — the admin form checks the
-- shape, and a database that refuses a legal-but-unusual address is worse than
-- one that stores what the pharmacy actually gave.
alter table public.pharmacies
    add column contact_email text;
