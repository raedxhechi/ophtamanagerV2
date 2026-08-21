-- Replace the pharmacies free-text `address` with the same street /
-- house_number / city columns doctor_office already uses (see
-- 20260802221114_add_doctor_office_address). The two addresses print side by
-- side on the order receipt, so matching their shape lets both render through
-- one code path instead of special-casing the pharmacy.
-- `zipcode` already exists on the table and is left alone.
alter table public.pharmacies
    add column street text,
    add column house_number text,
    add column city text;



alter table public.pharmacies
    drop column address;
