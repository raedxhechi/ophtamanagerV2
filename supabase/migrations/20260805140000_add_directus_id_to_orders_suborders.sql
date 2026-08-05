-- Origin ids from the legacy Directus system, kept so imported orders and
-- suborders can be matched back to their Directus records — and so suborders can
-- resolve their parent order (Directus `order`) and patient by Directus id.
alter table public.orders
    add column directus_id bigint;

-- Unique so an import can upsert on it; nullable (app-created orders have none),
-- and Postgres treats NULLs as distinct so multiple app rows are fine.
create unique index orders_directus_id_key
    on public.orders (directus_id);

alter table public.suborders
    add column directus_id bigint;

create unique index suborders_directus_id_key
    on public.suborders (directus_id);
