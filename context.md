# OptaManager — Project Context

Internal management app for an ophthalmology/pharmacy workflow: patients, insurance
policies, medicines, and orders (with suborders). Data is being migrated from a
legacy **Directus** backend onto **Supabase** (Postgres).

## Stack

- **Next.js 16** (App Router, React 19) — package name `supabase-ophta`
- **Supabase** (Postgres + SSR auth) — primary datastore
- **Directus SDK** — legacy backend, used for one-way sync/migration into Supabase
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
- `directus/` — legacy client (`api.ts`, `server.ts`) + `snapshot.json`
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
- Directus is read/migrate-only; new writes target Supabase.

## Commands

```bash
npm run dev       # dev server on :3000 (launch config: optamanager-dev)
npm run build     # production build
npm run lint      # eslint
npm run typegen   # regenerate types/supabase.ts from the Supabase project
```

Environment lives in `.env.local` (Supabase project id/keys, `DIRECTUS_API_URL`,
`DIRECTUS_ADMIN_STATIC_TOKEN`).
