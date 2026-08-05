-- A single denormalized haystack column used for patient search. It bundles the
-- patient's name, gender label (German and English so either matches), date of
-- birth (dd.mm.yyyy), address, insurance number, insurance company name, and id
-- into one text field so a search can `ilike` per typed token instead of OR-ing
-- across many columns.
--
-- Example value:
--   "Alfred Wüstefeld Männlich 26.10.1933 Heckschenstr. 99 47809 Krefeld
--    G618982925 Techniker Krankenkasse a92c5ee2-8719-4d70-97fe-86f64a81794a"
alter table public.patients
    add column search_text text;

-- Builds the search_text for a given patient row. `stable` (not immutable): it
-- reads insurance_companies to resolve the company name. concat_ws skips NULLs;
-- the regexp collapses any runs of whitespace left by empty tokens.
create or replace function public.patients_build_search_text(p public.patients)
returns text
language sql
stable
as $$
  select nullif(
    trim(regexp_replace(
      concat_ws(' ',
        p.first_name,
        p.last_name,
        case p.gender
          when 'male' then 'Männlich male'
          when 'female' then 'Weiblich female'
          when 'other' then 'Divers other'
        end,
        -- date_of_birth is stored as text (yyyy-mm-dd); reformat to dd.mm.yyyy
        -- without a date cast so malformed values pass through untouched.
        regexp_replace(p.date_of_birth, '^(\d{4})-(\d{2})-(\d{2})$', '\3.\2.\1'),
        p.street,
        p.house_number,
        p.zipcode,
        p.city,
        p.insurance_number,
        (select ic.name
           from public.insurance_companies ic
          where ic.id = p.insurance_company_id),
        p.id::text
      ),
      '\s+', ' ', 'g'
    )),
    ''
  );
$$;

-- Keep search_text in sync on every insert and update. The id column default is
-- resolved before this BEFORE trigger fires, so new.id is available on insert.
create or replace function public.patients_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.patients_build_search_text(new);
  return new;
end;
$$;

create trigger patients_set_search_text
before insert or update on public.patients
for each row execute function public.patients_set_search_text();

-- Backfill existing rows.
update public.patients as p
   set search_text = public.patients_build_search_text(p.*);
