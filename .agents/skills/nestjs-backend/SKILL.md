---
name: NestJS Backend Developer
description: Guidelines and best practices for developing the NestJS backend
---

# NestJS Backend Guidelines

You are developing the `apps/api` service logic using NestJS, TypeScript, PostgreSQL, and Prisma.

## API Documentation (Swagger)
This project relies on Swagger UI explicitly to allow the `apps/mobile` agent and frontend app to understand API dependencies natively:
- **Routes and Endpoints**: Every endpoint method MUST be documented with Swagger decorators (`@ApiOperation`, `@ApiTags`, `@ApiResponse`). Include standard HTTP returns (200, 400, 500, etc.) for clarity.
- **Data Transfer Objects (DTOs)**: Every property in a request/response DTO *must* have the `@ApiProperty` decorator. Provide types, optionality requirements, and realistic examples.
- Swagger UI lives at `/api/docs` and `/api/docs-json`.

## Testing Paradigm
- Write **unit or integration tests** for all major controller endpoints and service logic.
- The default suite is `Jest`. Ensure local suites pass reliably when updating complex business logic.
- E2E tests involving authentication should rely on the default hardcoded OTP `000000` set by user convention.

## Database & Environment Variables
- Every time you change `.env` locally or add a required configuration key, append it directly to `.env.example`.
- Ensure PRs are ready for Dockerized or manual validation (`db:up`, `db:logs`).
