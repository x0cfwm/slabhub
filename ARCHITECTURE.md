# ARCHITECTURE.md — SlabHub

> Comprehensive architecture documentation for the SlabHub monorepo.
> Last updated: **2026-04-14**

---

## 1. PROJECT STRUCTURE

SlabHub is a **pnpm workspace monorepo** for managing One Piece TCG inventory, pricing, and vendor storefronts. The codebase is organized by application layer with a shared Prisma schema.

```text
slabhub/
├── apps/
│   ├── api/                          # NestJS 11 REST API (port 3001)
│   │   ├── src/
│   │   │   ├── main.ts              # Bootstrap: CORS, Swagger, versioning, cookie parser
│   │   │   ├── app.module.ts        # Root module (imports 20 modules, Zod env validation)
│   │   │   ├── instrument.ts        # Sentry SDK initialization
│   │   │   ├── console.ts           # CLI entry point (nest-commander)
│   │   │   ├── common/
│   │   │   │   └── interceptors/    # SentryInterceptor (5xx only)
│   │   │   └── modules/
│   │   │       ├── auth/            # Email OTP + Apple Sign-In + session management
│   │   │       │   ├── auth.controller.ts
│   │   │       │   ├── auth.service.ts
│   │   │       │   ├── auth.middleware.ts   # Global: extracts user from cookie/token/headers
│   │   │       │   ├── guards/session.guard.ts
│   │   │       │   ├── utils/cookies.ts     # HttpOnly, Secure, SameSite config
│   │   │       │   ├── utils/otp.ts         # HMAC-SHA256 OTP hashing
│   │   │       │   └── mail/               # Resend email service (factory pattern)
│   │   │       ├── oauth-facebook/  # Facebook OAuth2 login
│   │   │       ├── profile/         # User & seller profile CRUD
│   │   │       ├── inventory/       # Inventory CRUD, lifecycle stages, reordering, history
│   │   │       ├── cards/           # Card catalog lookup (CardProfile + CardVariant)
│   │   │       ├── pricing/         # PricingSnapshot management
│   │   │       ├── market/          # Market pricing aggregation & search
│   │   │       ├── media/           # S3/R2 upload, SHA256 dedup, CDN URLs
│   │   │       │   ├── media.service.ts
│   │   │       │   ├── s3.client.ts         # AWS SDK S3Client wrapper
│   │   │       │   └── hashing.ts           # Content hash utilities
│   │   │       ├── grading/         # AI slab recognition (Gemini) + cert lookup
│   │   │       │   └── grading-recognition.service.ts
│   │   │       ├── justtcg/         # JustTCG API sync (multi-key round-robin, rate limiting)
│   │   │       │   ├── justtcg.client.ts
│   │   │       │   ├── justtcg.mappings.ts
│   │   │       │   └── justtcg.sync.service.ts
│   │   │       ├── pricecharting-crawler/  # PriceCharting scraper (Cheerio + BrightData proxy)
│   │   │       │   ├── pricecharting.client.ts
│   │   │       │   ├── pricecharting.parser.ts
│   │   │       │   └── pricecharting.ingest.service.ts
│   │   │       ├── analytics/       # Shop event tracking (views, inquiries, geo)
│   │   │       ├── vendor/          # Public vendor storefront API
│   │   │       ├── workflow/        # Custom per-user workflow statuses (Kanban)
│   │   │       ├── posting/         # AI social media post generation
│   │   │       ├── invites/         # Invite-only registration system
│   │   │       ├── waitlist/        # Pre-launch waitlist
│   │   │       ├── health/          # Health check endpoint
│   │   │       ├── prisma/          # Global Prisma ORM module
│   │   │       └── console/         # CLI utilities for data sync
│   │   └── package.json             # @slabhub/api
│   │
│   ├── web/                          # Next.js 16 web frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx       # Root layout (fonts, ThemeProvider, AuthProvider, Toaster)
│   │   │   │   ├── page.tsx         # Landing page (hero, features, waitlist)
│   │   │   │   ├── globals.css      # Tailwind v4, OkLCH theme tokens (light/dark/cyberpunk)
│   │   │   │   ├── manifest.ts      # PWA manifest
│   │   │   │   ├── (auth)/          # Login + OTP verification
│   │   │   │   ├── (app)/           # Protected routes (AuthProvider redirect)
│   │   │   │   │   ├── layout.tsx   # App shell: Sidebar + Topbar + BottomNav
│   │   │   │   │   ├── dashboard/   # Portfolio overview, market value chart, analytics
│   │   │   │   │   ├── inventory/   # Kanban board + list view + add item
│   │   │   │   │   ├── pricing/     # Market price lookup
│   │   │   │   │   ├── posting/     # Social media post generation
│   │   │   │   │   ├── shop/        # Shop preview
│   │   │   │   │   ├── settings/    # Profile, workflow config, account
│   │   │   │   │   └── invites/     # Invite management
│   │   │   │   ├── vendor/          # Public vendor storefront (VendorClient.tsx)
│   │   │   │   ├── onboarding/      # New user onboarding
│   │   │   │   └── invite/          # Invite acceptance
│   │   │   ├── components/
│   │   │   │   ├── ui/              # ~24 Radix/shadcn primitives
│   │   │   │   ├── layout/          # Sidebar, Topbar, BottomNav
│   │   │   │   ├── inventory/       # KanbanBoard, StageColumn, ItemCard, ItemDrawer, InventoryList
│   │   │   │   ├── dashboard/       # MarketValueChart, AnalyticsDashboard
│   │   │   │   ├── pricing/         # MarketPricingDrawer
│   │   │   │   ├── settings/        # WorkflowSettings
│   │   │   │   ├── landing/         # Hero, features, waitlist CTA, tour carousel
│   │   │   │   ├── common/          # Logo, ThemeToggle, ImageZoomDialog
│   │   │   │   ├── auth-provider.tsx # React Context for auth state
│   │   │   │   └── theme-provider.tsx# next-themes wrapper
│   │   │   └── lib/
│   │   │       ├── api.ts           # Centralized API client (45+ endpoints, credentials: include)
│   │   │       ├── types.ts         # TypeScript models, enums, API response shapes
│   │   │       ├── utils.ts         # cn() classname merger, misc helpers
│   │   │       ├── image-utils.ts   # CDN image optimization
│   │   │       ├── inventory-validation.ts # Zod schemas for forms
│   │   │       └── theme.ts         # Theme utilities
│   │   ├── next.config.ts           # output: 'export', images.unoptimized: true
│   │   └── package.json             # @slabhub/web
│   │
│   ├── mobile/                       # Expo 54 / React Native 0.81
│   │   ├── app/
│   │   │   ├── _layout.tsx          # Root: ErrorBoundary, QueryClient, KeyboardProvider, AuthProvider, AppProvider
│   │   │   ├── (auth)/              # login, otp screens
│   │   │   ├── (tabs)/             # Tab navigator
│   │   │   │   ├── _layout.tsx      # Native tabs (iOS 18+) or classic tabs fallback
│   │   │   │   ├── index.tsx        # Dashboard: stats, profit/loss, market value chart
│   │   │   │   ├── inventory.tsx    # Inventory by workflow status tabs
│   │   │   │   ├── pricing.tsx      # Market product search with infinite pagination
│   │   │   │   └── shop.tsx         # Personal shop management & preview
│   │   │   ├── add-item.tsx         # Create/edit inventory items with image upload
│   │   │   ├── item/[id].tsx        # Item detail: metadata, pricing, stage transitions
│   │   │   ├── posting.tsx          # Social media post generation (AI captions)
│   │   │   ├── posting-review.tsx   # Review generated postings before sharing
│   │   │   ├── explore.tsx          # Browse/search other vendor shops
│   │   │   ├── vendor/[handle].tsx  # Public vendor shop page
│   │   │   ├── shop-settings.tsx    # Profile: payments, fulfillment, social links
│   │   │   ├── onboarding.tsx       # 5-page feature carousel
│   │   │   └── +not-found.tsx       # 404 fallback
│   │   ├── components/
│   │   │   ├── inventory/           # ImageZoomModal, ListedPromptDialog, SoldPromptDialog
│   │   │   ├── onboarding/          # OnboardingPage, PaginationDots
│   │   │   ├── pricing/             # MarketProductDetail
│   │   │   ├── MarketValueChart.tsx  # Portfolio value line chart
│   │   │   ├── ShareCard.tsx        # Social share card generator
│   │   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   │   └── KeyboardAwareScrollViewCompat.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # Session: signIn, verifyOtp, signInWithApple, signOut
│   │   │   └── AppContext.tsx        # Inventory, profile, statuses, item operations
│   │   ├── lib/
│   │   │   ├── api.ts               # Bearer token API client (15s timeout)
│   │   │   ├── query-client.ts      # React Query config (staleTime: Infinity)
│   │   │   ├── image-utils.ts       # Resize/compress before upload
│   │   │   ├── posting.ts           # Platform presets (Instagram/Facebook)
│   │   │   └── types.ts             # Mobile-specific types
│   │   ├── constants/
│   │   │   ├── types.ts             # Enums, interfaces (InventoryItem, UserProfile, etc.)
│   │   │   └── colors.ts            # Dark theme color palette
│   │   ├── app.json                 # Expo config: gg.slabhub.crm, typed routes, react compiler
│   │   ├── eas.json                 # EAS Build profiles (dev/preview/prod)
│   │   └── package.json             # @slabhub/mobile
│   │
│   └── landing/                      # Marketing landing page (Next.js, stub)
│
├── prisma/
│   ├── schema.prisma                 # 22 models, 9 enums (PostgreSQL)
│   ├── migrations/                   # 48 migrations (Jan–Apr 2026)
│   └── seed.ts                       # Development seed data
│
├── infra/
│   └── docker/
│       └── docker-compose.yml        # PostgreSQL 16 Alpine (local dev)
│
├── Dockerfile                        # Multi-stage API build (node:20-slim, pnpm 9.15)
├── netlify.toml                      # Web: static build + /api/* proxy to DigitalOcean
├── pnpm-workspace.yaml               # apps/* + packages/*
└── package.json                      # Root: dev scripts, engine constraints (Node 20)
```

---

## 2. HIGH-LEVEL SYSTEM DIAGRAM

```
                     ┌──────────────────┐
                     │     Users        │
                     └────────┬─────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             v                v                v
    ┌────────────────┐ ┌────────────┐ ┌────────────────┐
    │   Web App      │ │ Mobile App │ │   Landing      │
    │ Next.js 16     │ │  Expo 54   │ │   Next.js      │
    │ Tailwind/Shadcn│ │ iOS/Android│ │   Static       │
    │ Netlify CDN    │ │ App Store  │ │                │
    └───────┬────────┘ └──────┬─────┘ └────────────────┘
            │                 │
            │ cookie auth     │ bearer token
            │ (proxy /api/*)  │ (direct)
            │                 │
            └────────┬────────┘
                     v
           ┌─────────────────────┐
           │    NestJS API       │
           │    :3001            │
           │    DigitalOcean     │
           └──┬──┬──┬──┬──┬──┬──┘
              │  │  │  │  │  │
     ┌────────┘  │  │  │  │  └──────────┐
     v           │  │  │  v             v
┌──────────┐     │  │  │ ┌──────────┐ ┌──────────┐
│PostgreSQL│     │  │  │ │  Resend  │ │  Sentry  │
│   16     │     │  │  │ │ (email)  │ │ (errors) │
└──────────┘     │  │  │ └──────────┘ └──────────┘
                 │  │  │
        ┌────────┘  │  └────────┐
        v           v           v
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │Cloudflare│ │  Google   │ │BrightData│
  │   R2     │ │  Gemini   │ │  Proxy   │
  │ (media)  │ │  (AI)     │ │          │
  └──────────┘ └──────────┘ └────┬─────┘
                                 │
                      ┌──────────┼──────────┐
                      v          v          v
                ┌─────────┐ ┌────────┐ ┌───────┐
                │ JustTCG │ │ Price  │ │  PSA  │
                │  API    │ │Charting│ │Grading│
                └─────────┘ └────────┘ └───────┘
```

**Request Flow:**
1. **Web:** Netlify CDN serves static Next.js export → `/api/*` proxied to DigitalOcean backend
2. **Mobile:** Expo app connects directly to API via bearer token
3. **API:** Validates session (cookie or `Authorization` header), queries PostgreSQL via Prisma, stores media in R2

---

## 3. CORE COMPONENTS

### 3.1 API — NestJS Backend

| Aspect | Detail |
|--------|--------|
| **Framework** | NestJS 11, TypeScript |
| **ORM** | Prisma 6 with PostgreSQL 16 |
| **Auth** | Email OTP (Resend) + Apple Sign-In + Facebook OAuth2 + session cookies/tokens |
| **Validation** | Global `ValidationPipe` (whitelist, forbid non-whitelisted, transform) + Zod env config |
| **API Docs** | Swagger UI at `/api/docs`, JSON at `/api/docs-json` |
| **Prefix** | Global prefix `/v1` (excludes `health`, `api/docs`) |
| **CLI** | `nest-commander` for data sync scripts |
| **AI** | Google Gemini `gemini-2.5-flash-lite` for slab recognition |
| **Monitoring** | Sentry (`@sentry/nestjs`) with global filter + interceptor |
| **Rate Limiting** | `@nestjs/throttler` (1000 req/60s) |

**20 Modules:**

| Module | Purpose |
|--------|---------|
| `auth` | Email OTP flow: request code → verify → create session; Apple Sign-In |
| `oauth-facebook` | Facebook OAuth2 social login |
| `profile` | Seller profile CRUD (handle, shop name, socials, avatar, payments, fulfillment) |
| `inventory` | Inventory items CRUD, stage transitions, reordering, history audit |
| `cards` | Card catalog lookup (CardProfile + CardVariant from JustTCG data) |
| `pricing` | PricingSnapshot management and calculations |
| `market` | Market product search, set listing, price history aggregation |
| `media` | S3/R2 upload with SHA256 dedup, CDN URL generation, public-read ACL |
| `grading` | AI slab recognition (Gemini), cert number lookup, PriceCharting enrichment |
| `justtcg` | JustTCG API sync client (multi-key round-robin, rate limiting, BrightData proxy) |
| `pricecharting-crawler` | PriceCharting HTML scraper (Cheerio + rotating BrightData proxy) |
| `analytics` | Shop event tracking (VIEW_SHOP, VIEW_ITEM, INQUIRY) with geolocation |
| `vendor` | Public vendor storefront API (profile + listed items) |
| `workflow` | Custom per-user kanban statuses (create, reorder, seed defaults) |
| `posting` | AI-powered social media post generation (Instagram/Facebook) |
| `invites` | Invite-only registration (token generation, hash verification, acceptance) |
| `waitlist` | Pre-launch email waitlist collection |
| `health` | `GET /health` endpoint |
| `prisma` | Global Prisma client service (connection lifecycle) |
| `console` | CLI commands for data sync operations |

**Global Middleware & Guards:**
- `AuthMiddleware` — Applies to all `/v1` routes; extracts user from session cookie (`slabhub_session`), bearer token, or header flags (`x-user-handle`, `x-user-id`); supports admin impersonation via `?as=userId`
- `SessionGuard` — Per-route: validates session token, rejects expired/revoked sessions
- `ValidationPipe` — Whitelist, forbid non-whitelisted, implicit type conversion
- `SentryInterceptor` — Captures 5xx errors with request metadata
- `ThrottlerGuard` — Rate limiting

---

### 3.2 Web — Next.js Frontend

| Aspect | Detail |
|--------|--------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Output** | Static export (`output: 'export'`) — pure client-side SPA on Netlify CDN |
| **Styling** | Tailwind CSS 4, Shadcn UI (Radix primitives), OkLCH color system |
| **State** | React Context (auth only), `useState` + URL search params, `localStorage` for UI prefs |
| **Forms** | `react-hook-form` + Zod validation |
| **Charts** | Recharts 2.15 |
| **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` (Kanban reordering) |
| **Theming** | 3 themes (light, dark, cyberpunk) via `next-themes` + CSS custom properties |
| **Carousel** | Embla Carousel |
| **Toasts** | Sonner |
| **Icons** | Lucide React |

**Routes:**

| Group | Pages | Auth |
|-------|-------|------|
| `(auth)` | `/login`, `/otp` | No |
| `(app)` | `/dashboard`, `/inventory`, `/inventory/add`, `/pricing`, `/posting`, `/shop`, `/settings`, `/invites` | Yes |
| `vendor` | `/vendor?handle=X` — public storefront with listed items, search, contact | No |
| Root | `/` (landing), `/onboarding`, `/invite` | No |

**Auth Handling:**
- `AuthProvider` (React Context) calls `getMe()` on mount
- Protected routes: redirect to `/login` if unauthenticated
- All API requests use `credentials: 'include'` for cookie-based sessions
- No Next.js middleware — client-side redirects only

---

### 3.3 Mobile — Expo App

| Aspect | Detail |
|--------|--------|
| **Framework** | Expo 54, React Native 0.81, Expo Router 6 |
| **State** | `AuthContext` (session) + `AppContext` (inventory, profile, statuses) + `@tanstack/react-query` v5 |
| **Token Storage** | `expo-secure-store` (iOS Keychain / Android Keystore); `localStorage` on web |
| **Camera/Media** | `expo-image-picker`, `expo-image-manipulator` (resize to 1024px, JPEG 80%) |
| **Animations** | `react-native-reanimated` 4.1, `react-native-gesture-handler` |
| **UI Effects** | `expo-glass-effect` (iOS 18+), `expo-blur`, `expo-linear-gradient` |
| **Build** | EAS Build (dev/preview/prod profiles), auto version increment |

**Navigation:**

```text
Root Stack (_layout.tsx)
├── onboarding (one-time, 5-page carousel)
├── (auth)
│   ├── login (Email OTP)
│   └── otp (6-digit verification)
├── (tabs) — Tab navigator
│   ├── index (Dashboard: stats, market value chart)
│   ├── inventory (Items by workflow status tabs)
│   ├── pricing (Market search, infinite pagination)
│   └── shop (Personal shop management)
├── add-item (Create/edit with image upload)
├── item/[id] (Detail: metadata, pricing, stage move)
├── posting (AI social media generation)
├── posting-review (Review before sharing)
├── explore (Browse other vendors)
├── vendor/[handle] (Public vendor shop)
└── shop-settings (Payments, fulfillment, socials)
```

**Auth Flow:**
1. Email OTP → POST `/auth/email/request-otp` → verify → session token
2. Apple Sign-In (iOS) → native `expo-apple-authentication` → POST `/auth/apple` → session token
3. Token stored in platform secure storage, injected as `Authorization: Bearer <token>`

---

## 4. DATA MODELS

### Entity Relationships

```text
User ──1:1──→ SellerProfile ──1:N──→ ShopEvent
  │                │
  ├──1:N──→ Session                    InventoryItem
  ├──1:N──→ OtpChallenge                   │
  ├──1:N──→ OAuthIdentity                  ├──→ CardVariant ──→ CardProfile
  ├──1:N──→ Invite ──→ InviteAcceptance    ├──→ WorkflowStatus
  └──1:N──→ InventoryItem                  ├──→ Media (front/back images)
                 │                          ├──→ RefPriceChartingProduct
                 └──→ InventoryHistory      └──→ PricingSnapshot
```

### Models (22 total)

**Users & Auth:**
| Model | Purpose |
|-------|---------|
| `User` | Email, admin flag, verified status, OAuth links |
| `Session` | SHA256-hashed 32-byte token, 30-day TTL, user-agent/IP, revocable |
| `OtpChallenge` | HMAC-SHA256-hashed 6-digit code, 10-min TTL, max 5 attempts |
| `OAuthIdentity` | Provider (apple, facebook) + provider user ID |

**Business:**
| Model | Purpose |
|-------|---------|
| `SellerProfile` | Shop handle, name, avatar, location, payment methods, fulfillment options, social links, Discord webhook |
| `ShopEvent` | Analytics: VIEW_SHOP, VIEW_ITEM, INQUIRY_START, INQUIRY_COMPLETE with geolocation & referrer |

**Inventory:**
| Model | Purpose |
|-------|---------|
| `InventoryItem` | 35+ fields: type (RAW/GRADED/SEALED), stage, grading metadata, pricing, media refs, card variant, workflow status |
| `WorkflowStatus` | Custom kanban columns per user with position ordering and color |
| `InventoryHistory` | Audit trail of stage transitions |

**Card Catalog:**
| Model | Purpose |
|-------|---------|
| `CardProfile` | Global card data from JustTCG (name, set, number, rarity, image) |
| `CardVariant` | Variants per card (NORMAL, ALTERNATE_ART, PARALLEL_FOIL) with language (JP/EN) |

**Pricing:**
| Model | Purpose |
|-------|---------|
| `PricingSnapshot` | Market prices per card (raw + sealed) |
| `RefPriceChartingProduct` | PriceCharting product with grade-specific prices (grades 7, 8, 9, 9.5, 10) |
| `PriceChartingSales` | Historical sales data |

**Reference:**
| Model | Purpose |
|-------|---------|
| `RefGame`, `RefSet`, `RefProduct`, `RefPrinting` | JustTCG-synced reference catalogs |
| `RefSyncProgress` | Sync progress tracking |
| `RefPriceChartingSet` | PriceCharting set groupings |

**Other:**
| Model | Purpose |
|-------|---------|
| `Media` | SHA256-deduplicated S3 objects (hash, bucket, key, ETag, MIME, dimensions, owner) |
| `Invite`, `InviteAcceptance` | Invite-based registration tokens |
| `WaitlistParticipant` | Pre-launch email collection |

### Enums

| Enum | Values |
|------|--------|
| `InventoryStage` | ACQUIRED, IN_TRANSIT, BEING_GRADED, AUTHENTICATED, IN_STOCK, LISTED, SOLD, ARCHIVED |
| `ItemType` | SINGLE_CARD_RAW, SINGLE_CARD_GRADED, SEALED_PRODUCT |
| `GradeProvider` | PSA, BGS, CGC, ARS, SGC, OTHER |
| `Condition` | NM, LP, MP, HP, DMG |
| `ProductType` | BOOSTER_BOX, BOOSTER_PACK, STARTER_DECK, ILLUSTRATION_BOX, MINI_TIN, PREMIUM_BOX, GIFT_BOX, ANNIVERSARY_SET, PROMO_PACK, TOURNAMENT_KIT, CASE, BUNDLE, OTHER |
| `SealedIntegrity` | MINT, MINOR_DENTS, DAMAGED, OPENED |
| `VariantType` | NORMAL, ALTERNATE_ART, PARALLEL_FOIL |
| `Language` | JP, EN |
| `ShopEventType` | VIEW_SHOP, VIEW_ITEM, INQUIRY_START, INQUIRY_COMPLETE |

**Primary Key Strategy:** CUID (`@default(cuid())`) for all models except `CardProfile` (domain ID).

---

## 5. DATA FLOW

### Authentication

```text
[Client] ──POST /v1/auth/email/request-otp──→ [API]
    │                                            │
    │                                     Generate 6-digit OTP
    │                                     HMAC-SHA256 hash → OtpChallenge table
    │                                     Send email via Resend
    │                                            │
    │←────── { challengeId } ────────────────────┘
    │
    │──POST /v1/auth/email/verify-otp──→ [API]
    │                                       │
    │                              Verify hash, check attempts (≤5) and TTL (10 min)
    │                              Find or create User (+ check invite token if required)
    │                              Generate 32-byte random session token
    │                              SHA256 hash → Session table (30-day TTL)
    │                                       │
    │←── Set-Cookie: slabhub_session ───────┘  (web: HttpOnly, Secure, SameSite)
    │←── { sessionToken, user } ────────────┘  (mobile: stored in SecureStore)
```

**Apple Sign-In (mobile):** Native `expo-apple-authentication` → identity token → POST `/v1/auth/apple` → same session token flow.

**Dev shortcut:** OTP code `000000` always accepted in local environment.

### Inventory Lifecycle

```text
ACQUIRED → IN_TRANSIT → BEING_GRADED → AUTHENTICATED → IN_STOCK → LISTED → SOLD → ARCHIVED
    │                                                                 │
    └──────────────── Items can skip stages ──────────────────────────┘
```

Each transition is recorded in `InventoryHistory` for audit. Custom `WorkflowStatus` entries map to these stages for user-defined kanban columns.

### Data Sync Pipeline

```text
JustTCG API ──multi-key round-robin──→ justtcg.client ──→ CardProfile + CardVariant
                via BrightData proxy                        (global card catalog)

PriceCharting ──rotating proxy──→ pricecharting.client ──→ RefPriceChartingProduct
                via BrightData     HTML scraping (Cheerio)    + PricingSnapshot

inventory:sync:prices ──→ Match inventory items to market prices ──→ InventoryItem.marketPrice
```

### AI Slab Recognition

```text
[Image Upload] ──→ grading-recognition.service
                        │
                   Resize to max 1280px, compress JPEG 85%
                        │
                   Gemini 2.5 Flash Lite (structured JSON output)
                   → Extract: grader, cert#, grade, subgrades, card name, set, number, language
                        │
                   PriceCharting lookup:
                   1. Exact match on card number
                   2. Fuzzy format (OP09118 → OP09-118)
                   3. Second LLM call for disambiguation (if multiple matches)
                        │
                   Return: recognized data + pricing tiers (grades 7-10, sealed)
```

---

## 6. API ENDPOINTS

All endpoints prefixed with `/v1` except `/health` and `/api/docs`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/email/request-otp` | Request OTP email |
| POST | `/auth/email/verify-otp` | Verify OTP, create session |
| POST | `/auth/apple` | Apple ID sign-in (mobile) |
| POST | `/auth/logout` | Revoke session |

### Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user + seller profile |
| PATCH | `/me` | Update profile |
| DELETE | `/me` | Delete account |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | List user's inventory |
| POST | `/inventory` | Create item |
| PATCH | `/inventory/:id` | Update item |
| DELETE | `/inventory/:id` | Delete item |
| PATCH | `/inventory/reorder` | Reorder items within a stage |
| GET | `/inventory/:id/history` | Item stage transition history |
| GET | `/inventory/stats/market-value-history` | Portfolio value over time |

### Market
| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/products` | Search products (paginated, filterable) |
| GET | `/market/products/:id` | Product detail |
| GET | `/market/products/:id/prices` | Price history (optional refresh) |
| GET | `/market/sets` | List all card sets |
| GET | `/market/sync-status` | Data sync status |

### Media
| Method | Path | Description |
|--------|------|-------------|
| POST | `/media/upload` | Upload file (multipart, max 15MB, jpeg/png/webp) |
| DELETE | `/media` | Delete file |

### Grading
| Method | Path | Description |
|--------|------|-------------|
| POST | `/grading/lookup` | Lookup grading cert number |
| POST | `/grading/recognize` | AI image recognition (Gemini) |

### Workflow
| Method | Path | Description |
|--------|------|-------------|
| GET | `/workflow/statuses` | List user's workflow statuses |
| POST | `/workflow/statuses` | Create custom status |
| PATCH | `/workflow/statuses/:id` | Update status |
| DELETE | `/workflow/statuses/:id` | Delete status (with optional move-to) |
| PATCH | `/workflow/statuses/reorder` | Reorder statuses |
| POST | `/workflow/statuses/seed` | Seed default statuses |

### Vendor (Public)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/vendor/:handle` | Public vendor storefront (profile + listed items) |
| GET | `/vendor` | Vendor search/listing |

### Posting
| Method | Path | Description |
|--------|------|-------------|
| POST | `/posting/generate` | Generate AI social media post (Instagram/Facebook) |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/analytics/track` | Track shop event (fire-and-forget) |
| GET | `/analytics/dashboard` | Dashboard stats (visitors, views, inquiries) |

### Invites & Waitlist
| Method | Path | Description |
|--------|------|-------------|
| GET | `/invites/me` | My invite link |
| GET | `/invites/accepted` | List accepted invites |
| GET | `/invites/preview/:token` | Invite preview (public) |
| POST | `/waitlist` | Join waitlist (public) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no `/v1` prefix) |

**Swagger UI:** `/api/docs`

---

## 7. AUTHENTICATION & AUTHORIZATION

### Auth Methods
1. **Email OTP** — Primary for web + mobile. 6-digit code via Resend email.
2. **Apple Sign-In** — iOS native via `expo-apple-authentication` (mobile only).
3. **Facebook OAuth2** — Server-side flow with `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`.

### Session Model
- 32-byte random hex token, stored as SHA256 hash in `Session` table
- 30-day TTL (configurable: `SESSION_TTL_DAYS`)
- Captures user-agent and IP at creation
- Revocable via `revokedAt` timestamp

### OTP Security
- 6-digit code, HMAC-SHA256 hashed with salt (`OTP_SECRET`)
- 10-minute TTL (configurable: `OTP_TTL_MINUTES`)
- Max 5 verification attempts per challenge
- Dev shortcut: `000000` accepted in local environment

### Request Flow
1. **AuthMiddleware** (global, all `/v1` routes):
   - Cookie: `slabhub_session` → validate session hash → set user context
   - Header: `Authorization: Bearer <token>` → same flow (mobile)
   - Fallback headers: `x-user-handle`, `x-user-id` (debug/internal)
   - Admin impersonation: `?as=userId` (admin-only)
2. **SessionGuard** (per-route): enforces valid, non-expired, non-revoked session
3. **Custom decorators:** `@CurrentUserId()`, `@CurrentSellerId()`, `@CurrentSellerHandle()`

### Cookies (Web)
- `HttpOnly` — always
- `Secure` — production only
- `SameSite` — `strict` (prod), `lax` (dev)
- Domain-scoped, 30-day max-age

### Invite-Only Registration
- Controlled by `INVITE_ONLY_REGISTRATION` env var (default: `true`)
- Invite tokens are SHA256-hash-verified with expiration and revocation
- Acceptance recorded in `InviteAcceptance` table

---

## 8. EXTERNAL INTEGRATIONS

| Service | Purpose | Auth | Config Vars |
|---------|---------|------|-------------|
| **PostgreSQL 16** | Primary database | Connection string | `DATABASE_URL` |
| **Cloudflare R2** | S3-compatible media storage + CDN | Access key pair | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`, `S3_CDN_BASE_URL` |
| **Resend** | Transactional email (OTP delivery, waitlist) | API key | `RESEND_API_KEY`, `MAIL_FROM` |
| **Google Gemini** | AI slab recognition (`gemini-2.5-flash-lite`) | API key | `GEMINI_API_KEY` |
| **JustTCG** | Card catalog sync (games, sets, products) | API key(s), comma-separated for round-robin | `JUSTTCG_API_KEY` |
| **PriceCharting** | Market price scraping (HTML) | N/A (web scraper) | Via BrightData proxy |
| **BrightData** | Rotating residential proxy for scraping | Customer ID + zone + token | `BRIGHTDATA_CUSTOMER_ID`, `BRIGHTDATA_ZONE`, `BRIGHTDATA_TOKEN` |
| **PSA** | Grading cert verification | API token | `PSA_API_TOKEN` |
| **Facebook** | OAuth2 social login | App ID + secret | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **Apple** | Native sign-in (iOS) | Bundle ID | `APPLE_BUNDLE_ID` (`gg.slabhub.crm`) |
| **Sentry** | Error tracking | DSN | `SENTRY_DSN` |
| **Discord** | Webhook notifications for shop events | Per-seller webhook URL | `SellerProfile.discordWebhookUrl` |
| **GeoIP** | Country-level geolocation for analytics | N/A (local `geoip-lite` DB) | — |

---

## 9. DEPLOYMENT & INFRASTRUCTURE

### Production Topology

```text
┌──────────────────────────────────┐
│  Netlify CDN                     │
│  ├── Web static export (out/)    │
│  └── /api/* proxy → DO backend   │
└──────────────┬───────────────────┘
               │
               v
┌──────────────────────────────────┐
│  DigitalOcean App Platform       │
│  ├── NestJS container            │
│  │   (node:20-slim, pnpm 9.15)  │
│  └── Managed PostgreSQL 16       │
└──────────────┬───────────────────┘
               │
      ┌────────┼────────┐
      v        v        v
 Cloudflare  Resend  BrightData
    R2      (email)   (proxy)
```

| Component | Platform | Details |
|-----------|----------|---------|
| **Web Frontend** | Netlify | Static export; `/api/*` proxied to `slabhub-prod-yinjg.ondigitalocean.app` |
| **API Server** | DigitalOcean App Platform | Dockerized NestJS, port 3001 |
| **Database** | DigitalOcean Managed PostgreSQL 16 | Production DB |
| **Object Storage** | Cloudflare R2 | Media served via `cdn.slabhub.gg` |
| **Mobile** | Apple App Store | Expo-built iOS app via EAS + TestFlight |
| **DNS/CDN** | Cloudflare | DNS routing, R2 CDN |
| **Monitoring** | Sentry | Error tracking |

### Domains

| Domain | Purpose |
|--------|---------|
| `slabhub.gg` | Primary web app |
| `cdn.slabhub.gg` | Media CDN (Cloudflare R2) |
| `slabhub-prod-yinjg.ondigitalocean.app` | API backend |
| `shub.it` | Short URL domain |

### Build Pipeline

**API (Docker):**
```bash
# node:20-slim → pnpm 9.15 → install → prisma generate → nest build → start:prod
docker build -t slabhub-api .
docker run -p 3001:3001 --env-file .env slabhub-api
```

**Web (Netlify):**
```bash
pnpm --filter @slabhub/web run build  # output: apps/web/out
# Proxy: /api/* → https://slabhub-prod-yinjg.ondigitalocean.app/:splat
```

**Mobile (EAS):**
- Development/preview/production build profiles in `eas.json`
- iOS: `.ipa` → TestFlight; auto-increment build numbers
- Bundle ID: `gg.slabhub.crm`

### Local Development

```bash
pnpm install                # Install all dependencies
pnpm db:up                  # Start PostgreSQL (Docker)
pnpm prisma:generate        # Generate Prisma Client
pnpm prisma:migrate         # Run migrations
pnpm seed                   # Optional: seed demo data
pnpm dev                    # API :3001 + Web :3000 in parallel
pnpm dev:mobile             # Expo dev server
```

---

## 10. DEVELOPMENT & TOOLING

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x LTS |
| pnpm | 9.15.0 |
| Docker | For local PostgreSQL |
| Expo CLI | For mobile development |
| EAS CLI | >= 18.1.0 for mobile builds |

### Key Libraries

**API:** NestJS 11, Prisma 6, `@aws-sdk/client-s3`, `@google/generative-ai`, `resend`, `@sentry/nestjs`, `cheerio` (HTML parsing), `sharp` (image processing), Zod, `geoip-lite`

**Web:** Next.js 16, React 19, Tailwind CSS 4, Radix UI (shadcn/ui), `react-hook-form`, Zod, Recharts, `@dnd-kit/core`, `embla-carousel`, `next-themes`, Sonner, `class-variance-authority`

**Mobile:** Expo 54, React Native 0.81, Expo Router 6, `@tanstack/react-query` 5, `expo-secure-store`, `expo-apple-authentication`, `expo-image-manipulator`, `react-native-reanimated` 4.1, `react-native-gesture-handler`, `expo-glass-effect`

### Testing

| Layer | Framework | Command |
|-------|-----------|---------|
| **API Unit/Integration** | Jest + `@nestjs/testing` | `pnpm --filter @slabhub/api test` |
| **API Watch** | Jest watch mode | `pnpm --filter @slabhub/api test:watch` |
| **Linting** | ESLint + Prettier + TypeScript strict | `pnpm lint` |

### Data Sync CLI

```bash
pnpm justtcg:sync:dictionaries   # Sync JustTCG games, sets, printings
pnpm justtcg:sync:catalog        # Sync JustTCG product catalog
pnpm justtcg:sync:all            # Full JustTCG sync
pnpm pricecharting:crawl:onepiece # Crawl PriceCharting for One Piece TCG
pnpm pricecharting:cleanup:links  # Clean PriceCharting references
pnpm inventory:sync:prices       # Update inventory market prices
pnpm grading:test-recognition    # Test Gemini AI slab recognition
```

### Code Quality Conventions

- **Swagger decorators** required on all API endpoints and DTOs (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`)
- **Prisma migrations** required for any schema change (`pnpm prisma:migrate`)
- **New env vars** must be added to `.env.example`
- **TypeScript strict mode** across all apps
- **Tests** live alongside source as `*.spec.ts`

---

## 11. ARCHITECTURE DECISIONS

### Monorepo with pnpm Workspaces
Shared Prisma schema and TypeScript types across API, web, and mobile. Each app has its own build pipeline and deployment target. `pnpm-workspace.yaml` declares `apps/*` and `packages/*`.

### Static Web Export (No SSR)
Next.js with `output: 'export'` produces a pure client-side SPA. Netlify serves static files and proxies `/api/*` to the backend, avoiding CORS complexity in production.

### Cookie Auth (Web) + Bearer Token (Mobile)
Web uses `HttpOnly` session cookies for XSS protection. Mobile uses bearer tokens stored in platform secure storage (iOS Keychain / Android Keystore). Both resolve to the same session model.

### No Job Queue
All operations are synchronous `async/await`. Long-running data syncs (JustTCG, PriceCharting) are CLI commands run manually or via external cron. No Bull/Redis dependency.

### SHA256 Media Deduplication
All uploads are content-hashed before S3 storage. Duplicate files resolve to the same key, saving storage. `Cache-Control: public, max-age=31536000, immutable` for CDN caching.

### Multi-Key API Round-Robin
JustTCG integration accepts comma-separated API keys and rotates across them to distribute rate limits. BrightData proxy with deterministic session IDs (MD5-based) for sticky IPs per key.

### Gemini Flash for AI Recognition
`gemini-2.5-flash-lite` chosen for speed over accuracy. Images pre-processed (resize to 1280px max, JPEG 85%) to minimize payload. Two-step LLM: recognition → candidate selection for disambiguation.

### Invite-Only Registration
Gated access via hash-verified invite tokens with expiration and revocation. Controlled by `INVITE_ONLY_REGISTRATION` env flag (default: true).

---

## 12. MIGRATION HISTORY

48 Prisma migrations from January to April 2026:

| Phase | Date Range | Key Changes |
|-------|-----------|-------------|
| Initial Setup | Jan 2026 | Database init, JustTCG models, PriceCharting references |
| Authentication | Feb 4–10 | User, Session, OtpChallenge, OAuthIdentity, product types |
| Inventory Core | Feb 8–10 | Media model, pricing refactor, OAuth, invitations |
| Seller Features | Feb 17–27 | Seller profile fields, inventory statuses, workflow statuses |
| Analytics | Mar 4–24 | Shop events, geolocation, Discord webhooks, image posting |
| Admin & Polish | Apr 6 | Admin user fields |

---

## 13. GLOSSARY

| Term | Definition |
|------|-----------|
| **TCG** | Trading Card Game |
| **Slab** | A professionally graded and encapsulated trading card in a sealed case |
| **Raw** | An ungraded, loose trading card |
| **PSA / BGS / CGC / ARS / SGC** | Major third-party card grading companies |
| **OTP** | One-Time Password (passwordless email authentication) |
| **CUID** | Collision-resistant Unique Identifier (primary keys) |
| **NM / LP / MP / HP / DMG** | Card conditions: Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged |
| **Stage** | Inventory lifecycle state: ACQUIRED → IN_TRANSIT → BEING_GRADED → AUTHENTICATED → IN_STOCK → LISTED → SOLD → ARCHIVED |
| **Vendor / Seller** | A user who manages and sells TCG inventory |
| **Handle** | Unique slug for a seller's public storefront URL |
| **PriceCharting** | Third-party website for TCG market pricing data |
| **JustTCG** | Third-party API for TCG card catalog data |
| **Kanban** | Visual board layout for organizing inventory by workflow status |
| **R2** | Cloudflare's S3-compatible object storage service |
| **EAS** | Expo Application Services (cloud build infrastructure) |
