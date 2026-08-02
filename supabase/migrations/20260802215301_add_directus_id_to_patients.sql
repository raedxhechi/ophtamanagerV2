-- Origin id from the legacy Directus system, kept so imported patients can be
-- matched back to their Directus records (and to resolve future connections
-- that reference patients by their Directus id).
alter table public.patients
    add column directus_id bigint;

-- Unique so an import can upsert on it; nullable (app-created patients have
-- none), and Postgres treats NULLs as distinct so multiple app rows are fine.
create unique index patients_directus_id_key
    on public.patients (directus_id);
