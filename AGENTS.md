You are extending an existing monorepo product:

**Frontend:**
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
**Backend:**
- NestJS + TypeScript + PostgreSQL + Prisma

This repository uses **Prisma + PostgreSQL**. Any change to `prisma/schema.prisma` **must** be accompanied by a corresponding **Prisma migration** (or an explicitly documented exception).


Do not forget to add newly introduce env variables to `.env.example` file.

Always write **unit or integration tests** for any new features or significant logic changes. Use **Jest** for `apps/api`. For E2E tests requiring authentication, use the hardcoded OTP code `000000`.

**API Documentation (Swagger):**
- All new endpoints in `apps/api` **must** be documented with Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- All DTOs in `apps/api` **must** use `@ApiProperty` to document their fields, including examples where applicable.
- This documentation is critical for the mobile development agent (`apps/mobile`) to understand and interact with the API correctly.
- Swagger UI is at `/api/docs` and JSON at `/api/docs-json`.

**Building the mobile app for Testflight**

Increment the build number in the script before running it.
```bash
BUILD_NUMBER=3 bash scripts/testflight_build_upload.sh 
```