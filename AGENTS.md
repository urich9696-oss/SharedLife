<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

SharedLife is a single Next.js 16 (App Router) app that splits shared household
expenses, backed by Prisma + a local SQLite database. There is only one service.

Standard commands live in `README.md` / `package.json` scripts (`pnpm dev`,
`pnpm build`, `pnpm lint`, `pnpm db:push`, `pnpm db:seed`). Non-obvious notes:

- The SQLite DB file (`prisma/dev.db`) is git-ignored, so it does not exist on a
  fresh clone. `pnpm install` runs `prisma generate` (postinstall), but it does
  NOT create the database. Run `pnpm db:push` once to create the tables (and
  optionally `pnpm db:seed` for demo data) before `pnpm dev`, otherwise pages
  crash with "no such table". `DATABASE_URL` is committed in `.env`. If you change
  `prisma/schema.prisma`, re-run `pnpm db:push`; the dev server does not create
  tables on its own.
- Pages use `export const dynamic = "force-dynamic"` and mutations use Server
  Actions in `app/actions.ts`; after DB writes they call `revalidatePath`, so the
  UI reflects changes without a manual refresh.
- Money is stored as integer cents everywhere (`lib/money.ts`); never store
  dollars as floats. Balance/settle-up logic is in `lib/balances.ts`.
- The seed script runs via `node --experimental-strip-types prisma/seed.ts`
  (configured under `package.json` → `prisma.seed`); it's idempotent and skips if
  the demo household already exists.
- pnpm build scripts for Prisma are pre-approved via
  `package.json` → `pnpm.onlyBuiltDependencies`, so installs are non-interactive
  (do NOT run `pnpm approve-builds`).
