-- Audit trail of every API call made by non-admin users: logins, token
-- refreshes, and each REST call with the HTTP status it came back with.
--
-- Rows are written exclusively by the service role (see the RLS block below):
-- a call that fails *because* the session expired still has to be recorded, and
-- at that moment the user has no valid JWT to write with. The ingest endpoint
-- (app/api/system-logs) holds SUPABASE_SECRET and inserts on their behalf.
create table public.system_logs (
    id bigint generated always as identity primary key,

    -- When the call actually happened, as measured where it was made. Kept
    -- separate from received_at because an entry that was queued offline can
    -- arrive hours later, and the tail of the log has to stay chronological.
    occurred_at timestamptz not null default now(),
    received_at timestamptz not null default now(),

    -- Who the call belonged to. user_id is only set once the ingest endpoint has
    -- matched the actor to a real user_data row, so the FK can never reject a
    -- log; an unrecognised actor keeps their email and leaves user_id null
    -- (a failed login with a typo'd address, for instance).
    -- ON DELETE RESTRICT, per the project-wide default: an audit row must not
    -- disappear because its user was removed.
    user_id uuid references public.user_data (id) on delete restrict,
    user_email text,
    doctor_office_id uuid references public.doctor_office (id) on delete restrict,
    user_role public.user_role,

    -- False when the actor is only *claimed* by the client — an expired or
    -- absent session leaves nothing to check the identity against. Unverified
    -- rows are still worth keeping (they are exactly the session-expiry cases
    -- this table exists to explain), but the admin UI marks them so they are
    -- never read as proof of who did something.
    actor_verified boolean not null default false,

    -- What was called: a stable camelCase name derived from the request
    -- (login, refreshToken, listOrders, createOrder, ...), plus the raw
    -- method/path it was derived from.
    action text not null,
    method text,
    path text,

    -- How it went. status is null when the request never reached the server at
    -- all (offline, DNS failure, aborted); ok carries the outcome either way so
    -- failures are still countable without special-casing null.
    status smallint,
    ok boolean not null,
    duration_ms integer,
    error_code text,
    error_message text,

    -- Where the call was made from. A check constraint rather than an enum, so
    -- adding a source later is a one-line change instead of a type migration.
    source text not null check (source in ('browser', 'server', 'proxy')),

    -- Client-assigned id, used to make ingest idempotent: the offline queue
    -- retries anything it has not seen acknowledged, which includes calls that
    -- did land but whose response was lost. The unique index below turns the
    -- retry into a no-op instead of a duplicate row.
    client_event_id uuid not null,
    -- True when the entry sat in the client's offline queue before it was sent.
    queued boolean not null default false,

    user_agent text,
    ip text,
    metadata jsonb
);

comment on table public.system_logs is
    'Audit trail of non-admin API activity. Written only by the service role.';

-- The list view is "newest first", always. id breaks ties so rows sharing an
-- occurred_at keep a fixed order and never shuffle between pages.
create index system_logs_occurred_at_idx
    on public.system_logs (occurred_at desc, id desc);

-- The admin page filters by user, by office, by status tab and by action, each
-- of them still ordered newest-first.
create index system_logs_user_idx
    on public.system_logs (user_id, occurred_at desc);
create index system_logs_office_idx
    on public.system_logs (doctor_office_id, occurred_at desc);
create index system_logs_status_idx
    on public.system_logs (status, occurred_at desc);
create index system_logs_action_idx
    on public.system_logs (action, occurred_at desc);

-- Idempotency key for retried batches. See client_event_id above.
create unique index system_logs_client_event_id_key
    on public.system_logs (client_event_id);

alter table public.system_logs enable row level security;

-- Admins read; nobody writes. There is deliberately no INSERT/UPDATE/DELETE
-- policy: with RLS on, that denies every write for the anon and authenticated
-- roles, leaving the service role (which bypasses RLS) as the only writer. That
-- is what stops a signed-in user from forging or erasing their own audit trail.
create policy "Admins can read system logs"
    on public.system_logs
    for select
    to authenticated
    using (public.is_admin());

-- The admin logs page lists every user so the log can be filtered by person and
-- by office, but until now user_data was only readable by the row's owner and
-- by their office colleagues — and an admin belongs to no office, so they could
-- see exactly one row: their own. Additive and permissive, so the existing two
-- policies are untouched.
create policy "Admins can view every user"
    on public.user_data
    for select
    to authenticated
    using (public.is_admin());

-- Counts for the admin page's status tabs and action filter, in one round-trip.
--
-- Each facet is counted with every filter *except its own* applied, which is
-- what makes the tabs usable: standing on the 401 tab still shows how many 200s
-- there are for the same user and action. SECURITY INVOKER so the policy above
-- applies — a non-admin calling this gets zeroes, not a leak.
create or replace function public.system_logs_facets(
    p_office uuid default null,
    p_user uuid default null,
    p_action text default null,
    p_status smallint default null,
    p_search text default null
)
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
    with base as (
        select *
        from public.system_logs l
        where (p_office is null or l.doctor_office_id = p_office)
          and (p_user is null or l.user_id = p_user)
          and (
              p_search is null
              or p_search = ''
              or l.action ilike '%' || p_search || '%'
              or l.user_email ilike '%' || p_search || '%'
              or l.path ilike '%' || p_search || '%'
              or l.error_message ilike '%' || p_search || '%'
          )
    )
    select jsonb_build_object(
        'statuses', coalesce((
            select jsonb_agg(
                jsonb_build_object('status', s.status, 'count', s.n)
                order by s.status nulls last
            )
            from (
                select b.status, count(*) as n
                from base b
                where (p_action is null or b.action = p_action)
                group by b.status
            ) s
        ), '[]'::jsonb),
        'actions', coalesce((
            select jsonb_agg(
                jsonb_build_object('action', a.action, 'count', a.n)
                order by a.action
            )
            from (
                select b.action, count(*) as n
                from base b
                where (p_status is null or b.status = p_status)
                group by b.action
            ) a
        ), '[]'::jsonb),
        'total', (
            select count(*)
            from base b
            where (p_action is null or b.action = p_action)
              and (p_status is null or b.status = p_status)
        )
    );
$$;

revoke execute on function public.system_logs_facets(uuid, uuid, text, smallint, text) from anon;
grant execute on function public.system_logs_facets(uuid, uuid, text, smallint, text) to authenticated;

-- Retention. The table grows with every request the app makes, so it needs a
-- way to be trimmed; this is deliberately a manual call rather than a schedule
-- so the retention window stays an explicit decision. SECURITY DEFINER to get
-- past the (absent) DELETE policy, with an admin check standing in for it.
create or replace function public.prune_system_logs(p_retain interval default '90 days')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    removed bigint;
begin
    if not public.is_admin() then
        raise exception 'only admins may prune system logs';
    end if;

    delete from public.system_logs where occurred_at < now() - p_retain;
    get diagnostics removed = row_count;
    return removed;
end;
$$;

revoke execute on function public.prune_system_logs(interval) from anon;
grant execute on function public.prune_system_logs(interval) to authenticated;
