-- The office's SN, filled in by an admin on /admin/doctor-offices. Nullable
-- free text, so the offices that already exist keep working without one.
alter table public.doctor_office
    add column sn text;
