# SlabHub - One Piece TCG Seller/Collector CRM

A production-quality monorepo for managing One Piece TCG inventory, pricing, and public vendor pages.

## 📁 Project Structure

```
/
├── apps/
│   ├── api/               # NestJS backend API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/      # Authentication (minimal Stage 1)
│   │       │   ├── cards/     # Card catalog endpoints
│   │       │   ├── health/    # Health check endpoint
│   │       │   ├── inventory/ # Inventory CRUD
│   │       │   ├── pricing/   # Pricing endpoints
│   │       │   ├── prisma/    # Database service
│   │       │   ├── profile/   # Seller profile endpoints
│   │       │   └── vendor/    # Public vendor page
│   │       ├── app.module.ts
│   │       └── main.ts
│   │
│   └── web/               # Next.js frontend
│       └── src/
│           ├── app/
│           ├── components/
│           └── lib/
│
├── packages/
│   └── shared/           # Shared types (future use)
│
├── infra/
│   └── docker/           # Docker compose for PostgreSQL
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration history
│   └── seed.ts           # Seed script
│
└── package.json          # Root monorepo scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (for PostgreSQL)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
pnpm db:up
```

This starts PostgreSQL on `localhost:5432` with:
- User: `postgres`
- Password: `postgres_password`
- Database: `slabhub`

### 3. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 4. Run Migrations

```bash
pnpm prisma:migrate
```

### 5. Seed the Database

```bash
pnpm seed
```

This creates:
- 1 Demo Seller Profile (`nami-treasures`)
- 30 One Piece TCG Card Profiles
- 90 Card Variants (3 per card)
- 30 Pricing Snapshots
- 18 Inventory Items (10 RAW, 5 GRADED, 3 SEALED)

### 6. Start Development Servers

```bash
# Start both API and Web
pnpm dev

# Or start individually
pnpm dev:api   # API on http://localhost:3001
pnpm dev:web   # Web on http://localhost:3000
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run API + Web in parallel |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run Web only |
| `pnpm build` | Build all packages |
| `pnpm db:up` | Start PostgreSQL container |
| `pnpm db:down` | Stop PostgreSQL container |
| `pnpm db:logs` | View PostgreSQL logs |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Run migrations (dev) |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm seed` | Seed the database |
| `pnpm pricecharting:crawl:onepiece` | Run PriceCharting One Piece crawler |

## 📈 PriceCharting Crawler

The PriceCharting crawler is a robust ingestion pipeline for One Piece TCG cards.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm pricecharting:crawl:onepiece` | Start a full crawl of One Piece cards |
| `... --dryRun` | Fetch and parse but do not save to database |
| `... --maxProducts 10` | Limit the number of products for testing |
| `... --linkRefProducts` | Link crawled URLs to existing `RefProduct` records |
| `... --onlySetSlug <slug>` | Only crawl a specific set (e.g. `one-piece-500-years-in-the-future`) |

### Configuration & Features

- **Rate Limiting**: Implementation ensures max 1 request per second to respect the target site.
- **Resilience**: Automatic retries (3 times) with exponential backoff on 429/5xx errors.
- **Idempotency**: Products are upserted based on their canonical URL; re-running the crawler will update existing records.
- **Data Capture**: Stores full "Details" block as JSON, along with normalized TCGPlayerID, PriceChartingID, and Card Number.
- **Traversal**: Automatically discovers set pages from the category entrypoint and handles pagination within sets.

Base URL: `http://localhost:3001`

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with DB status |

### Profile (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/me` | Get current seller profile |
| PATCH | `/v1/me` | Update seller profile |

### Cards (catalog)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/cards` | List all cards |
| GET | `/v1/cards?query=luffy` | Search cards |
| GET | `/v1/cards/:id` | Get card by ID |
| GET | `/v1/cards/:id/variants` | Get card variants |

### Inventory (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/inventory` | List seller's inventory |
| GET | `/v1/inventory/:id` | Get inventory item |
| POST | `/v1/inventory` | Create inventory item |
| PATCH | `/v1/inventory/:id` | Update inventory item |
| DELETE | `/v1/inventory/:id` | Delete inventory item |

### Pricing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/pricing` | List all pricing |
| POST | `/v1/pricing/refresh` | Refresh all prices |

### Vendor (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/vendor/:handle` | Get vendor page data |

## 🔐 Authentication (Stage 1)

For Stage 1, authentication is header-based:

```bash
# Use x-user-handle header
curl -H "x-user-handle: nami-treasures" http://localhost:3001/v1/me

# Or x-user-id header
curl -H "x-user-id: <seller-id>" http://localhost:3001/v1/me

# If no header, defaults to "nami-treasures" demo seller
```

## 📝 Example curl Commands

### Health Check
```bash
curl http://localhost:3001/health
```

### Get Profile
```bash
curl http://localhost:3001/v1/me
```

### Update Profile
```bash
curl -X PATCH http://localhost:3001/v1/me \
  -H "Content-Type: application/json" \
  -d '{"shopName": "Updated Shop Name", "meetupsEnabled": true}'
```

### List Cards
```bash
curl http://localhost:3001/v1/cards

# With search
curl "http://localhost:3001/v1/cards?query=luffy"
```

### Get Card
```bash
curl http://localhost:3001/v1/cards/op01-001
```

### List Inventory
```bash
curl http://localhost:3001/v1/inventory
```

### Create Inventory Item (RAW)
```bash
curl -X POST http://localhost:3001/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "SINGLE_CARD_RAW",
    "cardVariantId": "<variant-id>",
    "condition": "NM",
    "quantity": 1,
    "stage": "ACQUIRED",
    "acquisitionPrice": 25
  }'
```

### Create Inventory Item (GRADED)
```bash
curl -X POST http://localhost:3001/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "SINGLE_CARD_GRADED",
    "cardVariantId": "<variant-id>",
    "gradeProvider": "PSA",
    "gradeValue": "10",
    "certNumber": "CERT-12345",
    "quantity": 1,
    "stage": "LISTED",
    "acquisitionPrice": 150,
    "listingPrice": 299
  }'
```

### Create Inventory Item (SEALED)
```bash
curl -X POST http://localhost:3001/v1/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "SEALED_PRODUCT",
    "productName": "Romance Dawn Booster Box",
    "productType": "BOOSTER_BOX",
    "language": "JP",
    "integrity": "MINT",
    "quantity": 1,
    "stage": "IN_STOCK",
    "acquisitionPrice": 120,
    "configuration": {
      "containsBoosters": true,
      "packsPerUnit": 24,
      "containsFixedCards": false,
      "containsPromo": false
    }
  }'
```

### Update Inventory Item
```bash
curl -X PATCH http://localhost:3001/v1/inventory/<item-id> \
  -H "Content-Type: application/json" \
  -d '{"stage": "LISTED", "listingPrice": 45.99}'
```

### Delete Inventory Item
```bash
curl -X DELETE http://localhost:3001/v1/inventory/<item-id>
```

### Get Pricing
```bash
curl http://localhost:3001/v1/pricing
```

### Refresh Pricing
```bash
curl -X POST http://localhost:3001/v1/pricing/refresh
```

### Get Vendor Page
```bash
curl http://localhost:3001/v1/vendor/nami-treasures
```

## 🔄 Frontend Integration Mapping

| mockApi Function | Real API Endpoint |
|------------------|-------------------|
| `getCurrentUser()` | `GET /v1/me` |
| `updateProfile(patch)` | `PATCH /v1/me` |
| `listCardProfiles(query)` | `GET /v1/cards?query=...` |
| `getCardProfile(id)` | `GET /v1/cards/:id` |
| `listInventory()` | `GET /v1/inventory` |
| `createInventoryItem(item)` | `POST /v1/inventory` |
| `updateInventoryItem(id, patch)` | `PATCH /v1/inventory/:id` |
| `deleteInventoryItem(id)` | `DELETE /v1/inventory/:id` |
| `listPricing()` | `GET /v1/pricing` |
| `refreshPricing()` | `POST /v1/pricing/refresh` |
| (new) Vendor page | `GET /v1/vendor/:handle` |

## 📊 Database Schema

### Entities

- **SellerProfile**: User/seller account with shop info
- **CardProfile**: Global card catalog (One Piece TCG)
- **CardVariant**: Specific variants (language, foil type)
- **PricingSnapshot**: Global pricing per card
- **InventoryItem**: Seller's inventory (RAW, GRADED, SEALED)

### Key Rules

1. **PricingSnapshot is GLOBAL** per CardProfile
2. **InventoryItem references CardVariant** (not CardProfile directly)
3. **Market price** is derived from PricingSnapshot via CardVariant → CardProfile

### Inventory Stages
- `ACQUIRED` - Just purchased
- `IN_TRANSIT` - Shipping to seller
- `BEING_GRADED` - At grading company
- `AUTHENTICATED` - Verified authentic
- `IN_STOCK` - Ready but not listed
- `LISTED` - For sale publicly
- `SOLD` - Transaction complete
- `ARCHIVED` - No longer active

### Item Types
- `SINGLE_CARD_RAW` - Ungraded single card
- `SINGLE_CARD_GRADED` - Professionally graded card
- `SEALED_PRODUCT` - Unopened product

## 🛠 Tech Stack

- **Backend**: NestJS, TypeScript, Prisma
- **Database**: PostgreSQL
- **Frontend**: Next.js, React, TailwindCSS, Shadcn/UI
- **Infrastructure**: Docker, pnpm workspaces

## 📜 License

MIT