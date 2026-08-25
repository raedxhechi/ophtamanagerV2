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

- **Push Supabase changes as part of making them — don't ask first.** A change
  that needs a push is not finished until it has been pushed. There is no local
  Supabase here (no Docker), so the linked project *is* the database: a
  migration file nobody has pushed is a schema the code does not have.

  - A new file in `supabase/migrations/` → `direnv exec . supabase db push`,
    then **`direnv exec . npm run typegen`** whenever the schema change is one
    `types/supabase.ts` reflects (a table, column, enum value, or function —
    which is nearly always). Never hand-edit the generated file as a substitute.
  - A change to `supabase/config.toml` or `supabase/templates/*.html` →
    `direnv exec . supabase config push`.

  Both push straight to production. Look before you leap, and say what happened
  afterwards:

  - Run `supabase migration list` (or read the remote config through the
    Management API) **first**, so you know exactly what is pending and are not
    pushing someone else's half-finished work along with your own.
  - `db push` prompts; `--yes` is fine when the pending list is what you just
    wrote and nothing else. `config push` applies immediately with no prompt and
    no dry run, so reading the remote first is the only safety there is.
  - Stop and ask when the pending list holds migrations you did not write, when
    a push would drop or rewrite existing data, or when it fails — report the
    error rather than retrying variations of the command.
  - `supabase db diff` and `db dump` need Docker and fail on this machine. For
    drift checks use `gen types` plus the Management API query endpoint. A
    "failed to cache migrations catalog / cannot connect to the Docker daemon"
    warning from a push is cosmetic: the migration still applied.
