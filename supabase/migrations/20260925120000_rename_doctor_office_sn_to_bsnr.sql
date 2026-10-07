-- `sn` was always the office's Betriebsstätten-Nummer; give the column the name
-- the form and the prescriptions call it. A rename keeps the values and the
-- column's type, so nothing has to be backfilled.
alter table public.doctor_office
    rename column sn to bsnr;

comment on column public.doctor_office.bsnr is
    'Betriebsstätten-Nummer, filled in by an admin on /admin/doctor-offices. Nullable free text.';
