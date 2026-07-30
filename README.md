# SharedLife

SharedLife is a small web app for splitting shared household expenses. Create a
household, add the people you share costs with, log expenses (who paid, how much,
and who it's split between), and SharedLife works out each person's balance plus
the fewest payments needed to settle up.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components, Server Actions)
- TypeScript
- Tailwind CSS v4
- [Prisma](https://www.prisma.io) ORM with a local SQLite database
- pnpm

## Getting started

Prerequisites: Node.js 22+ and pnpm.

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
pnpm install

# 2. Create the SQLite database and tables
pnpm db:push

# 3. (optional) Seed demo data
pnpm db:seed

# 4. Start the dev server
pnpm dev
```

Then open http://localhost:3000.

The database connection string lives in `.env` (`DATABASE_URL="file:./dev.db"`);
see `.env.example`. The SQLite file is created at `prisma/dev.db` and is
git-ignored.

## Scripts

| Command          | Description                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Start the development server (http://localhost:3000) |
| `pnpm build`     | Production build                                    |
| `pnpm start`     | Run the production build                            |
| `pnpm lint`      | Run ESLint                                          |
| `pnpm db:push`   | Sync the Prisma schema to the SQLite database       |
| `pnpm db:seed`   | Insert demo data                                    |
| `pnpm db:studio` | Open Prisma Studio to inspect the database          |

## Data model

- **Household** — a group that shares expenses.
- **Member** — a person in a household.
- **Expense** — something a member paid for (amount stored in integer cents).
- **ExpenseSplit** — each member's share of an expense.

Balances and settle-up suggestions are computed in `lib/balances.ts`.
