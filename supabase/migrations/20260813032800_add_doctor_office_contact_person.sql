-- The named person to contact at the office. Nullable, so the offices that
-- already exist keep working until each one is filled in.
alter table public.doctor_office
    add column contact_person text;
