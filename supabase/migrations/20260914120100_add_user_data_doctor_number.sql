-- A doctor's number, filled in by an admin on /admin/users. Nullable free text:
-- the accounts that exist today have none, and only doctors are given one.
alter table public.user_data
    add column doctor_number text;
