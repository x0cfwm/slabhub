---
description: General project guidelines and rules for AI agents.
---

# Project Guidelines

You are extending an existing monorepo product:

**Frontend:**
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
**Backend:**
- NestJS + TypeScript + PostgreSQL + Prisma

As an AI agent working on this repository, you must adhere to the following rules:

## Database Changes (Prisma)
- This repository uses **Prisma + PostgreSQL**.
- Any change to `prisma/schema.prisma` **must** be accompanied by a corresponding **Prisma migration** (e.g., `npx prisma migrate dev`).
- If a migration is not needed for a specific reason, you must explicitly document the exception.

## Environment Variables
- Do not forget to add newly introduced environment variables to the `.env.example` file.
- Ensure that sensitive values are never committed to the repository.

## Testing
- Always write **unit or integration tests** for any new features or significant logic changes.
- For `apps/api`, use the existing **Jest** setup.
- For E2E tests requiring authentication, use the hardcoded OTP code `000000`.
- Ensure tests pass before considering a task complete.

## Workflow Integration
- Always check this file before performing database schema changes or adding new features that require configuration.

## API Documentation (Swagger)
- All new endpoints in `apps/api` **must** be documented with Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- All DTOs in `apps/api` **must** use `@ApiProperty` to document their fields, providing descriptions and examples.
- This is essential for cross-agent collaboration, particularly for the mobile app agent.
- Ensure Swagger UI is available at `/api/docs` and the raw specification at `/api/docs-json`.
