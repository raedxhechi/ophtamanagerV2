# Ophtamanager

Internal management app for an ophthalmology/pharmacy workflow: patients,
insurance policies, medicines, and orders (with suborders). Built on Next.js 16
and Supabase, with data being migrated from a legacy Directus backend.

For an overview of the architecture, directory layout, domain model, and
conventions, see [context.md](./context.md).

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Environment variables live in `.env.local` (Supabase project id/keys,
`DIRECTUS_API_URL`, `DIRECTUS_ADMIN_STATIC_TOKEN`).

## Scripts

```bash
npm run dev       # dev server on :3000
npm run build     # production build
npm run start     # serve the production build
npm run lint      # eslint
npm run typegen   # regenerate types/supabase.ts from the Supabase project
```

## Stack

- **Next.js 16** (App Router, React 19)
- **Supabase** (Postgres + SSR auth) — primary datastore
- **Directus SDK** — legacy backend, read/migrate-only
- **TanStack Query** (data) & **TanStack Table** (tables)
- **Zustand** (client state)
- **shadcn/ui** + Radix + **Tailwind v4**, **next-themes**
- **next-intl** i18n (`de` default, `en`)
- **react-hook-form** + **zod**
