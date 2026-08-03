-- Origin ids from Directus (integer PKs) kept so imports can upsert on them and
-- future connections (orders.medicine, patients.insuranceCompany) can resolve.
alter table public.medicine
    add column directus_id bigint;

create unique index medicine_directus_id_key
    on public.medicine (directus_id);

alter table public.insurance_companies
    add column directus_id bigint;

create unique index insurance_companies_directus_id_key
    on public.insurance_companies (directus_id);
