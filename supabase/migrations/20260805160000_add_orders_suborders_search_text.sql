-- Denormalized haystack columns for order/suborder search, mirroring the
-- patients.search_text approach (see 20260805150000_add_patients_search_text):
-- a single text column per row that a search can `ilike` per typed token.
--
--   * A suborder's search_text is all of its patient's details — it simply
--     reuses the patient's own search_text (name, gender, dob, address,
--     insurance number, insurance company, id).
--   * An order's search_text is every one of its suborders' search_text joined
--     together, plus the order's own fields: medicine name, delivery date,
--     application (operation) date, and created_at — all formatted dd.mm.yyyy to
--     match how the dates are displayed.
--
-- Because an order's text depends on its suborders (inserted after the order),
-- and a suborder's text depends on its patient (which can be edited later),
-- the columns are kept current by a small web of triggers, below.

alter table public.suborders
    add column search_text text;

alter table public.orders
    add column search_text text;

-- ---------------------------------------------------------------------------
-- Suborders: search_text = the linked patient's search_text.
-- `stable` (not immutable): it reads the patients table.
-- ---------------------------------------------------------------------------
create or replace function public.suborders_build_search_text(s public.suborders)
returns text
language sql
stable
as $$
  select p.search_text
    from public.patients p
   where p.id = s.patient_id;
$$;

create or replace function public.suborders_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.suborders_build_search_text(new);
  return new;
end;
$$;

create trigger suborders_set_search_text
before insert or update on public.suborders
for each row execute function public.suborders_set_search_text();

-- ---------------------------------------------------------------------------
-- Orders: search_text = medicine name + delivery/application/created dates +
-- every suborder's search_text. concat_ws skips NULLs; the regexp collapses any
-- whitespace runs left by empty tokens. `stable`: it reads medicine + suborders.
-- ---------------------------------------------------------------------------
create or replace function public.orders_build_search_text(o public.orders)
returns text
language sql
stable
as $$
  select nullif(
    trim(regexp_replace(
      concat_ws(' ',
        (select m.name from public.medicine m where m.id = o.medicine_id),
        to_char(o.delivery_date, 'DD.MM.YYYY'),
        to_char(o.application_date, 'DD.MM.YYYY'),
        to_char(o.created_at, 'DD.MM.YYYY'),
        (select string_agg(sub.search_text, ' ')
           from public.suborders sub
          where sub.order_id = o.id)
      ),
      '\s+', ' ', 'g'
    )),
    ''
  );
$$;

create or replace function public.orders_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.orders_build_search_text(new);
  return new;
end;
$$;

create trigger orders_set_search_text
before insert or update on public.orders
for each row execute function public.orders_set_search_text();

-- ---------------------------------------------------------------------------
-- Keep an order's search_text current when its suborders change. The order is
-- usually inserted before its suborders, so its BEFORE trigger above sees no
-- suborders yet; this AFTER trigger recomputes the parent order(s) whenever a
-- suborder is inserted, updated, or deleted (handling a moved order_id too).
-- ---------------------------------------------------------------------------
create or replace function public.suborders_touch_order_search_text()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'INSERT' and old.order_id is not null then
    update public.orders o
       set search_text = public.orders_build_search_text(o.*)
     where o.id = old.order_id;
  end if;
  if tg_op <> 'DELETE'
     and new.order_id is not null
     and (tg_op = 'INSERT' or new.order_id is distinct from old.order_id) then
    update public.orders o
       set search_text = public.orders_build_search_text(o.*)
     where o.id = new.order_id;
  end if;
  return null;
end;
$$;

create trigger suborders_touch_order_search_text
after insert or update or delete on public.suborders
for each row execute function public.suborders_touch_order_search_text();

-- ---------------------------------------------------------------------------
-- When a patient is edited, cascade the new details into its suborders' (and
-- thus their orders') search_text. Re-updating each suborder fires the suborder
-- BEFORE trigger (rebuilds from the fresh patient) and its AFTER trigger
-- (rebuilds the parent order). Only runs when the patient's search_text
-- actually changed, so unrelated updates don't churn.
-- ---------------------------------------------------------------------------
create or replace function public.patients_propagate_search_text()
returns trigger
language plpgsql
as $$
begin
  if new.search_text is distinct from old.search_text then
    update public.suborders s
       set updated_at = now()
     where s.patient_id = new.id;
  end if;
  return null;
end;
$$;

create trigger patients_propagate_search_text
after update on public.patients
for each row execute function public.patients_propagate_search_text();

-- ---------------------------------------------------------------------------
-- Backfill existing rows: suborders first (from their patients), then orders
-- (which aggregate the now-populated suborders).
-- ---------------------------------------------------------------------------
update public.suborders as s
   set search_text = public.suborders_build_search_text(s.*);

update public.orders as o
   set search_text = public.orders_build_search_text(o.*);
