-- Where an order has got to: placed, being made up, waiting for collection,
-- gone. It is the pharmacy side's view of the order, which is why it is a
-- column on the order rather than something derived from the dates — an order
-- can sit ready for a week past its delivery_date.
--
-- A new type rather than a value added to an existing one, so it can be used in
-- the same migration that creates it. (Only `alter type ... add value` has to
-- wait for its transaction to commit — see 20260811120000_add_manager_role.sql.)
create type public.order_status as enum (
    'pending',
    'processing',
    'ready',
    'delivered'
);

-- Nullable, and added in two steps on purpose.
--
-- `add column ... default` would backfill every existing row with 'pending',
-- which would be a claim about history that nobody made: these orders predate
-- the column and their real state is unknown, and most of them are long since
-- delivered. Adding the column bare leaves them null — "no status recorded" —
-- and setting the default afterwards applies it only to rows inserted from now
-- on, which is what "new orders start as pending" means.
--
-- To adopt the existing rows instead, backfill them deliberately in their own
-- migration; that is a decision about the data, not a side effect of a DDL
-- default.
alter table public.orders
    add column status public.order_status;

alter table public.orders
    alter column status set default 'pending';

-- No new policy. Who may set a status is already answered by the orders RLS:
-- "Admins have full access to orders" and "Managers can update orders in their
-- offices" (20260811120100_create_user_office_access.sql) are the only UPDATE
-- policies on the table, so an office user with neither role can read a status
-- and never write one. That is exactly the intended split, and stating it again
-- as a column-level rule would only create a second place to keep in step.
