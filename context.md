# Ophtamanager — Project Context

Internal management app for an ophthalmology/pharmacy workflow: patients, insurance
policies, medicines, and orders (with suborders). Data is being migrated from a
legacy **Directus** backend onto **Supabase** (Postgres).

## Stack

- **Next.js 16** (App Router, React 19) — package name `supabase-ophta`
- **Supabase** (Postgres + SSR auth) — primary datastore
- **Directus SDK** — legacy backend: the one-off migration reads *from* it, and
  newly created patients/orders are mirrored back *into* it
- **TanStack Query** for client data fetching, **TanStack Table** for tables
- **Zustand** for client state (see `zustand/user`)
- **shadcn/ui** + Radix + Tailwind v4; **next-themes** for dark mode
- **next-intl** i18n — locales `de` (default) and `en`, messages in `messages/`
- **react-hook-form** + **zod** for forms; **@react-pdf/renderer** for PDF output
- Import alias `@/*` → project root

## Layout

- `app/` — App Router routes
  - `(auth)/` — the logged-out screens: `login`, `forgot-password`, plus
    `update-password` and `accept-invite` (both need the session an auth email
    hands over); `app/auth/{confirm,callback}` are the route handlers behind
    them. See "Auth" below.
  - `(private)/` — order & suborder detail views (`order/[id]`, `suborder/[id]`)
  - `admin/` — admin dashboard: patients, policies, orders, users, settings,
    and `sync/` (Directus → Supabase migration screens per entity)
- `api/browser/` — client-side Supabase data access, one file per entity
  (orders, patients, medicines, insuranceCompanies, insurancePolicies,
  draftOrders, subOrders); `api/server/` — server-side client
- `react-query/` — TanStack Query hooks wrapping `api/browser` (query keys +
  mutations, one file per entity); `provider.tsx` holds the shared `queryClient`
- `supabase/` — `client.ts` / `server.ts` clients, `config.toml`, and
  `migrations/` (schema is migration-driven)
- `lib/logging/` — system audit log: an instrumented `fetch` that records every
  Supabase call, a localStorage-backed offline outbox, and the server-side
  ingest; surfaced at `admin/logs`
- `directus/` — legacy client (`api.ts`, `server.ts`) + `snapshot.json`, plus
  `mirror.ts` (Supabase → Directus write-back, see below)
- `types/` — hand-written domain types plus generated `supabase.ts`
  (regenerate via `npm run typegen`); `enums.ts` holds domain enums
  (e.g. `MedicineType`)
- `lib/`, `hooks/`, `components/ui/` — shared utilities and UI primitives
- `i18n/` — locale config, request handling, server actions

## Domain model

Core entities: **patients**, **doctor offices**, **medicines** (type: Rezeptur /
Fertigarzneimittel), **insurance companies**, **insurance policies**, and
**orders**. An order has **suborders**; each suborder links a patient (with their
insurance company). See `types/orders.ts` and `api/browser/orders.ts` (the
`ORDER_SELECT` relation graph).

## Conventions

- Data flow: `api/browser/*` (raw Supabase queries) → `react-query/*` (hooks) →
  components. Keep entity logic in its matching file.
- **Foreign keys default to `ON DELETE RESTRICT`** — never CASCADE unless
  explicitly requested.
- Schema changes go through timestamped SQL files in `supabase/migrations/`.
- Supabase is the system of record; Directus is a mirror (see below).

## Auth

Supabase email + password, with **no registration**: `enable_signup = false` on
both `[auth]` and `[auth.email]`, and there is no sign-up screen. Accounts are
created by an admin on **`/admin/users`** (or from the Supabase dashboard —
"Send magic link" is still the way to get a locked-out user back in).

- **`/login`** is the only way in. `/forgot-password` sends the reset mail;
  `/update-password` sets a new one (it also works for a signed-in user who just
  wants to change theirs); `/accept-invite` is where an invited account picks its
  first password. The last two share `SetPasswordForm` — same call, different
  copy.
- Every auth email links to **`/auth/confirm?token_hash=…&type=…&next=…`**,
  which verifies the token server-side and redirects with the session cookies
  attached. That is what makes a link work on a different device than the one
  that started the flow — the stock `{{ .ConfirmationURL }}` links go through
  PKCE, whose code verifier only exists in the original browser.
  **`/auth/callback`** handles that PKCE case anyway, as a fallback for the day
  someone resets a template in the dashboard.
- **Emailed links live 72 hours** (`otp_expiry = 259200`). That single setting is
  the lifetime of every auth link — invitation, password reset, magic link —
  because GoTrue has no separate invite expiry, so the three days apply to all
  three templates and each one says so in its own copy. The dashboard refuses
  anything above 86400; the Management API does not, and `config push` goes
  through the Management API — so `config.toml` is the only place the value
  survives. A change made in the dashboard alone is overwritten by the next
  push, which is exactly how the repo and the project drifted apart once.
- The templates live in `supabase/templates/*.html` and are wired up in
  `config.toml` under `[auth.email.template.*]`. They build their links from
  `{{ .SiteURL }}`, so **`site_url` has to be the deployed app** or every emailed
  link points at localhost. All three share one card layout — table-based with
  inline styles, German first and English under a rule, and a plain-text copy of
  the link for clients that swallow the button.
- **Every emailed link is valid for 72 hours** (`otp_expiry = 259200` under
  `[auth.email]`). GoTrue has a single expiry for all of them, so invitations,
  password resets and magic links share it — the invite is what needs the room
  (it goes to someone who isn't waiting for it), and the default hour killed
  most of them before they were opened. The links are single-use and verified
  server-side, but a reset link does stay live for three days, and the Security
  Advisor flags the value. Only a `supabase config push` can set it: the
  dashboard's own field caps at 86400 and would quietly halve it.
- Mail goes out through **Resend** (`[auth.email.smtp]`), from
  noreply@ophtamanager.de. The API key is never in the repo: `env(RESEND_API_KEY)`
  is substituted by the CLI at `supabase config push` time. Supabase's built-in
  sender is capped at 2 emails/hour and the platform refuses a higher
  `email_sent` rate limit until custom SMTP is set, so SMTP and the 100/hour
  limit have to land in the same push.
- The logo in those emails is served by `app/email-logo.png/route.ts`, which
  holds the bytes inline rather than sitting in `public/`. The two hosts disagree
  about that directory — v2.ophtamanager.de serves it, the apex 404s every file
  in it — and an emailed image has to resolve for a stranger's mail client, so it
  goes through a route that answers on both. `public/logo.svg` is the vector
  master it was rasterised from.
- `proxy.ts` names the routes that answer without a session: `/login`,
  `/forgot-password`, `/auth/confirm`, `/auth/callback`. `/update-password` and
  `/accept-invite` are deliberately not among them — by the time the user gets
  there, `/auth/confirm` has given them a session, and a dead link should land on
  `/login` rather than on an empty password form.
- Failures never dead-end: the handlers redirect with `?error=<key>`, which the
  login and forgot-password pages render through `auth.errors.*` in
  `messages/`. `lib/auth/errors.ts` maps GoTrue's codes onto those keys, so the
  user never sees an English developer message.
- An account is only usable once it has a `public.user_data` row: that is where
  the role and the office live, and RLS scopes everything to them. The invite
  flow on `/admin/users` writes it in the same action that sends the invitation,
  so the two cannot drift apart — see "Admin users" below for what happens when
  they do anyway.

## Admin users

`/admin/users` is where accounts are managed. It lists **auth.users** — the
account list — left-joined onto `public.user_data`, which is the app's own
record of what those accounts may do.

- The two halves come from two clients on purpose. `auth.admin.listUsers()` and
  `auth.admin.inviteUserByEmail()` are service-role endpoints (`supabase/admin.ts`)
  with no session-based equivalent; everything touching `user_data` goes through
  the admin's own session, so the RLS policy added in
  `20260822120000_admin_manage_user_data.sql` is what authorises it. Each server
  action still checks `is_admin()` first, to turn "no rows matched" into a
  sentence.
- **Inviting** sends the Supabase invitation and writes the `user_data` row in
  one action. If the invitation goes out but the profile insert fails, the
  account is reported as invited-without-a-role rather than deleted: the table
  lists it as **No profile**, and opening it finishes the job. The edit drawer
  upserts for exactly this reason — it is also how an account created straight
  from the Supabase dashboard gets its row.
- **Resending an invitation** is a row action on every account that has never
  signed in, and the same button sits in the drawer. It calls
  `inviteUserByEmail` again, which GoTrue allows only while the address is
  unconfirmed — exactly the accounts that never accepted — and which issues a
  fresh token, so the link already in their inbox stops working. A confirmed
  account comes back as `email_exists`; the action turns that into "send a
  password reset instead" rather than repeating GoTrue's wording. `invited_at`
  is on the row for the same reason: it says how old the link they are holding
  is. See "Auth" above for how long that link lasts.
- **Role and office are the whole point of the form.** An admin reaches every
  office and needs none of their own; for everyone else the office *is* their
  access, so it is required. An admin cannot drop their own admin role — that
  would close the screen behind them.
- **Deleting** a user runs `public.delete_app_user()` (one transaction, admin
  check inside) and then `auth.admin.deleteUser()`. Every FK into `user_data` is
  ON DELETE RESTRICT, so the function decides what happens to each: table
  preferences and office grants describe nobody else and go with the user, while
  orders, draft orders and audit rows stay and lose their link — they are the
  practice's record, not the user's property. `system_logs` keeps `user_email`
  and `user_role` on the row, so an unlinked audit entry still says who acted.
  The auth account can only go after the profile has (that FK again), which is
  the one non-atomic step: if it fails, the account is left showing as
  "No profile" and running the delete again finishes it.
- Filtering is client-side here, unlike patients and orders: this table holds
  every account in the app (a few dozen), not a page out of thousands. The role
  select is driven by `Constants.public.Enums.user_role` in `types/supabase.ts`,
  so a role added by a migration appears as soon as the types are regenerated.

## Directus mirror

Patients and orders created in this app are also written to the legacy Directus
backend, so the pharmacy side keeps seeing them. `directus/mirror.ts` holds the
whole of it; the link is the `supabase_id` string field on the Directus
`patients`, `orders` and `subOrders` collections.

- It always runs **after** the Supabase insert has committed — that is where the
  id comes from — and is **best-effort**: nothing in `mirror.ts` throws, so a
  Directus outage or validation error can never undo or fail a create. Failures
  go to the server log as `[directus-mirror] …` and nowhere else.
- Relations are resolved through the ids the migration already preserved:
  `medicine.directus_id`, `insurance_companies.directus_id`, and doctor offices,
  which kept their uuid on both sides. A suborder's patient is resolved via
  `patients.directus_id`, then by `supabase_id`, and is mirrored on the spot if
  neither finds it.
- Entry points: the two patient server actions call `mirrorPatientToDirectus`
  directly; the browser create flows (`api/browser/orders.ts`,
  `api/browser/patients.ts`) post the new id to `app/api/directus-mirror`, which
  re-reads the row through the caller's own session so RLS decides what may be
  mirrored. Mirrored rows are attributed to the static token's admin user, since
  app users have no Directus account.
- Directus requires an `insuranceCompany` on every patient (NOT NULL), which is
  why the patient forms and actions require one too.

## System logging

Every API call made by a **non-admin** user is recorded in `public.system_logs`:
sign-ins, token refreshes, and each REST call with the HTTP status it returned.

- Instrumentation sits on the Supabase clients' `fetch`
  (`lib/logging/instrument.ts`), not on individual functions in `api/browser/*`
  — a query added later is covered without being wrapped, and the status is the
  real HTTP status. Action names are derived from method + URL (`login`,
  `refreshToken`, `listOrders`, `createOrder`, ...).
- All three clients are instrumented: browser, RSC (`source: server`), and the
  proxy (`source: proxy`, **failures only** — it runs on every navigation).
- Attribution comes from the access token on the outgoing request, so a call
  that fails *because* the session expired still names its owner. The ingest
  endpoint re-derives the identity from the session cookie; anything it can't
  confirm is stored with `actor_verified = false` and shown as "claimed".
- Writes go through the service role (`supabase/admin.ts`, `SUPABASE_SECRET`)
  via `POST /api/system-logs`, which deliberately accepts unauthenticated
  callers — a logged-out user is exactly who needs to report a 401. The table
  has no INSERT policy, so nothing else can write to it.
- The browser queues every event in localStorage *before* sending
  (`lib/logging/queue.ts`) and only drops it once acknowledged, so entries
  survive an offline spell, a reload, or a closed tab. Retries are idempotent
  via the unique `client_event_id`.
- Admins' own calls are filtered out server-side in `lib/logging/ingest.ts`.
- `select prune_system_logs('90 days')` trims the table; it is not scheduled.

## Commands

```bash
npm run dev       # dev server on :3000 (launch config: optamanager-dev)
npm run build     # production build
npm run lint      # eslint
npm run typegen   # regenerate types/supabase.ts from the Supabase project
```

Environment lives in `.env.local` (Supabase project id/keys, `DIRECTUS_API_URL`,
`DIRECTUS_ADMIN_STATIC_TOKEN`).
