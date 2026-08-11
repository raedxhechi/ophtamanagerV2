# OptaManager — Project Context

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
  - `(auth)/login` — auth pages
  - `(private)/` — order & suborder detail views (`order/[id]`, `suborder/[id]`)
  - `admin/` — admin dashboard: patients, policies, orders, settings, and
    `sync/` (Directus → Supabase migration screens per entity)
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
