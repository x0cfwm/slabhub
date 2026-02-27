You are extending an existing monorepo product:

**Frontend:**
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
**Backend:**
- NestJS + TypeScript + PostgreSQL + Prisma

This repository uses **Prisma + PostgreSQL**. Any change to `prisma/schema.prisma` **must** be accompanied by a corresponding **Prisma migration** (or an explicitly documented exception).


Do not forget to add newly introduce env variables to `.env.example` file.

Always write **unit or integration tests** for any new features or significant logic changes. Use **Jest** for `apps/api`.