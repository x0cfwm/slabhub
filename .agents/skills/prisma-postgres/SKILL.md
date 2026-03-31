---
name: Prisma PostgreSQL Manager
description: Guidelines for managing the PostgreSQL database layer via Prisma
---

# Prisma / Postgres Setup

You are working within `apps/api/prisma` (where `schema.prisma` is located).

## Database Changes
- **No Manual Edits**: The single source of truth for the schema is `prisma/schema.prisma`.
- **Migrations Compulsory**: A database change MUST always be followed directly by `npx prisma migrate dev`.
- **Exemptions**: Skip migration explicitly _only_ if documented or explicitly requested otherwise. Any missing migration might break another service connecting to `apps/api`.

## Environmental Configurations
- Changes pushing new keys requirement to `.env` must be explicitly added back down into `.env.example` so local and automated environments continue to boot predictably.
- `apps/mobile` or `apps/web` might require `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` equivalents of certain values — ensure all related examples are correctly updated.

## Prisma Helpers
- Make use of Prisma counts, `findMany`, and relationship capabilities correctly before raw queries. Look out for pagination boundaries across lists matching large tables via Prisma.
