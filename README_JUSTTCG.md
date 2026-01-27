# JustTCG Sync Service

This service synchronizes reference data (dictionaries) and catalog items from the JustTCG API into the local PostgreSQL database using Prisma.

## Environment Variables

The following environment variables are required:

- `JUSTTCG_BASE_URL`: The base URL of the JustTCG API (default: `https://api.justtcg.com`).
- `JUSTTCG_API_KEY`: Your JustTCG API key (sent via `x-api-key` header).

Make sure to add them to your `.env` file:

```env
JUSTTCG_BASE_URL=https://api.justtcg.com
JUSTTCG_API_KEY=your_actual_api_key_here
```

## CLI Commands

The sync can be triggered via console commands:

### Sync Dictionaries
Syncs games and sets (and others if available in your plan).
```bash
# Using pnpm from root
pnpm justtcg:sync:dictionaries
```

### Sync Catalog
Syncs cards (paginated via cursor).
```bash
pnpm justtcg:sync:catalog
```

## How to Adjust Mapping Config

All endpoints, field mappings, and model associations are defined in:
`apps/api/src/modules/justtcg/justtcg.mappings.ts`

### Important Configuration Details:
- **Game Slug**: The sync currently uses `one-piece-card-game` as the required parameter for most endpoints.
- **Limits**: The `catalog` sync uses a limit of 20 to comply with standard API plans.
- **Endpoints**: Used `/v1/cards` for the catalog sync based on API availability.

To add a new field or change an endpoint:
1. Open `apps/api/src/modules/justtcg/justtcg.mappings.ts`.
2. Update the `endpoint`, `params`, or `fields` array.
3. If a new field is added to the database, update `prisma/schema.prisma` first.

The `fields` mapping supports optional transformations:
- `string`: Casts value to String (default).
- `number`: Casts value to Number.
- `date`: Casts value to `Date` object (ISO string to Date).
- `json`: Parses string to JSON or keeps as is if already object.

## Implementation Details

- **HTTP Client**: Uses `@nestjs/axios` with a 10s timeout and 3 retries (exponential backoff) for 429 and 5xx errors.
- **Pagination**: Supports both page-based and cursor-based pagination.
- **Upsert**: Uses Prisma `upsert` to ensure no duplicates. Performed in batches of 500 for performance.
- **Validation**: Environment variables are validated at boot using `zod`.
