-- A suborder can be swapped out for replacement suborders. `swapped_from_id`
-- points at the suborder this one directly replaced, which makes the relation a
-- many-to-one between rows of the same table:
--
--     A (id_1)  <-  B (swapped_from_id: id_1)
--               <-  C (swapped_from_id: id_1)
--
-- One original can be swapped by several suborders at once (B and C above both
-- replace A), and a replacement names exactly one original — hence a single
-- column and no join table. There is deliberately no unique constraint on
-- swapped_from_id: that would forbid the fan-out, which is the normal case.
--
-- A replacement can itself be swapped later, so each original's history is a
-- tree rather than a flat list. Nothing here depends on the depth; reading a
-- whole tree in one go needs a recursive query, which can come when there is a
-- view that wants it.
--
-- Nullable, with no default and no backfill. Every suborder that exists today
-- predates swapping and was not swapped from anything, so it stays null — "this
-- is an original, not a replacement" — and every query that does not mention
-- the column behaves exactly as it does now.
alter table public.suborders
    add column swapped_from_id uuid
        references public.suborders (id) on delete restrict;

-- A suborder cannot have swapped itself. `is distinct from` rather than `<>` so
-- the check holds for the null case too: `null <> id` is null, which a check
-- constraint accepts, but spelling it this way says what is meant instead of
-- relying on that.
--
-- This catches the one-row cycle only. A longer cycle (B <- C and C <- B) can
-- only be created by an update that re-points a row that already exists, and
-- nothing writes the column that way: it is set when a replacement is inserted,
-- against an original that is already there.
alter table public.suborders
    add constraint suborders_swapped_from_not_self
        check (swapped_from_id is distinct from id);

-- Postgres indexes the referenced side of a foreign key, never the referencing
-- column. Both things that read this column scan it: "which suborders swapped
-- this one" (the point of the relation), and the ON DELETE RESTRICT check, which
-- runs on every suborder delete whether or not swaps exist.
create index suborders_swapped_from_id_idx
    on public.suborders (swapped_from_id);

-- ON DELETE RESTRICT, matching every other foreign key here: a suborder that has
-- swaps attached cannot be deleted while they point at it. Deleting the original
-- out from under its replacements would leave rows claiming to replace something
-- that is gone, so the database refuses instead of guessing.
--
-- This means the admin delete paths (deleteSubOrderAsAdmin, and the suborder
-- sweep in deleteOrderAsAdmin) will surface a foreign key error once swaps
-- exist, where today they cannot. They are unaffected until something writes the
-- column — every suborder is null here for now — and what should happen to the
-- replacements when an original is deleted is a separate decision, to be made
-- where those actions live rather than hidden in a trigger.

-- No new policy. The suborders RLS (20260731001951_create_orders.sql) is written
-- per row, not per column: admins have full access and office users read and
-- create through their order, so the new column follows the same rule as
-- left_eye or patient_id. The foreign key points back at the same table, so a
-- replacement is visible to exactly the users its own row is visible to.
