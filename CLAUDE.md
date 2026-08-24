# CLAUDE.md

Project documentation lives in [context.md](context.md) — stack, layout, domain
model, and conventions.

## Rules

- **Do not test UI changes yourself.** No browser driving, no preview pages, no
  clicking through the app. Make the change, check it compiles (`npx tsc
  --noEmit`, `npm run lint`), and hand it over — the user verifies it in the
  running app.

- **Supabase CLI commands run through direnv.** The credentials the CLI needs
  (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY` for
  `config push`) live in `.envrc` and are never passed on the command line.
  Prefix with `direnv exec .` — e.g. `direnv exec . supabase db diff --linked` —
  or `direnv allow` once and let the shell hook load them. A CLI command that
  asks for a password or a token means the environment wasn't loaded.
