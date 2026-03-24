# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SlabHub is a pnpm monorepo for managing One Piece TCG inventory, pricing, and public vendor storefronts. Apps: `apps/api` (NestJS), `apps/web` (Next.js), `apps/mobile` (Expo), `apps/landing` (Next.js static). Shared Prisma schema at `prisma/`.

## Commands

### Development
```bash
pnpm install
pnpm db:up                  # Start PostgreSQL via Docker
pnpm prisma:generate        # Generate Prisma Client
pnpm prisma:migrate         # Run pending migrations
pnpm seed                   # Seed demo data (optional)
pnpm dev                    # API :3001 + Web :3000 in parallel
pnpm dev:api / dev:web / dev:mobile
```

### Build & Lint
```bash
pnpm build                  # All apps
pnpm lint                   # ESLint + Prettier + TypeScript
```

### Testing
```bash
pnpm --filter @slabhub/api test           # Run Jest tests
pnpm --filter @slabhub/api test:watch     # Watch mode
```
For E2E tests requiring auth, use OTP code `000000`.

### Database
```bash
pnpm prisma:migrate         # Apply migrations
pnpm prisma:studio          # Open Prisma Studio UI
pnpm db:down / db:logs      # Docker DB controls
```

### Data Sync CLI
```bash
pnpm justtcg:sync:*         # Sync JustTCG card catalog
pnpm pricecharting:crawl:onepiece   # Crawl market prices
pnpm inventory:sync:prices  # Sync prices to inventory
pnpm grading:test-recognition       # Test Gemini AI recognition
```

## Architecture

### Request Flow
```
Web (Next.js)  ──┐
Mobile (Expo)  ──┤──→  NestJS API :3001  ──→  PostgreSQL 16
                 │          ├──→  Cloudflare R2 (media)
                 │          ├──→  Resend (email OTP)
                 │          ├──→  Google Gemini (AI slab recognition)
                 │          ├──→  JustTCG API (card catalog)
                 │          └──→  PriceCharting (web scraper via BrightData)
```
- Web uses Netlify proxy: `/api/*` → DigitalOcean backend
- Auth: session cookies (web) or `Authorization` header (mobile)

### API Module Structure (`apps/api/src/`)
18 NestJS modules: `auth`, `oauth-facebook`, `profile`, `inventory`, `cards`, `pricing`, `market`, `media`, `grading`, `justtcg`, `pricecharting-crawler`, `analytics`, `vendor`, `workflow`, `invites`, `waitlist`, `posting`, `health`. Swagger UI: `/api/docs`.

### Web Route Groups (`apps/web/src/app/`)
- `(auth)/` — Login + OTP verification
- `(app)/` — Authenticated routes: dashboard, inventory, pricing, settings, shop, posting, invites
- `vendor/[handle]/` — Public vendor storefront
- `onboarding/`, `invite/` — Registration flows

### Key Data Models
- `InventoryItem` — Central entity: type (RAW/GRADED/SEALED), 8 lifecycle stages (ACQUIRED → SOLD → ARCHIVED), links to `CardVariant`/grading data/pricing
- `CardProfile` + `CardVariant` — Global card catalog synced from JustTCG
- `PricingSnapshot` — Market prices from PriceCharting crawler
- `Media` — SHA256-deduplicated S3 objects

### Environment Variables
Copy `.env.example` to `.env`. Key vars: `DATABASE_URL`, `PORT=3001`, `NEXT_PUBLIC_API_URL`, `RESEND_API_KEY`, `S3_*` (Cloudflare R2), `GOOGLE_GENERATIVE_AI_API_KEY`, `JUSTTCG_API_KEY`, `BRIGHTDATA_*`, `FACEBOOK_APP_*`. Zod validates all env vars at API startup.

## Important Conventions

- **Schema changes**: Every `prisma/schema.prisma` change requires a Prisma migration (`pnpm prisma:migrate`).
- **New env vars**: Always add to `.env.example`.
- **API endpoints**: Must include Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`). DTOs must use `@ApiProperty`.
- **Tests**: Write Jest unit/integration tests for new features in `apps/api`.
