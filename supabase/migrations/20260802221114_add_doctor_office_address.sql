-- Address fields carried over from the legacy Directus doctorOffice records.
alter table public.doctor_office
    add column street text,
    add column house_number text,
    add column zipcode text,
    add column city text;
