-- Track which user created an order. References user_data (not auth.users
-- directly) so PostgREST can embed the creator's profile, e.g.
-- select=..., created_by:user_data(*). Defaults to the calling user, so office
-- users don't set it manually; nullable for rows inserted out-of-band (e.g. by
-- the service_role, where auth.uid() is null) and for pre-existing orders.
alter table public.orders
    add column created_by uuid
        references public.user_data (id) on delete restrict
        default auth.uid();
