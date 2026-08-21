# CLAUDE.md

Project documentation lives in [context.md](context.md) — stack, layout, domain
model, and conventions.

## Rules

- **Do not test UI changes yourself.** No browser driving, no preview pages, no
  clicking through the app. Make the change, check it compiles (`npx tsc
  --noEmit`, `npm run lint`), and hand it over — the user verifies it in the
  running app.
