# One Piece TCG Seller/Collector CRM + Vendor Page

A professional, high-fidelity prototype for One Piece TCG vendors to manage their inventory, track market pricing, and showcase their cards for sale.

## Features

- **Inventory Kanban**: Manage cards through stages: Acquired → In Transit → In Stock → Grading → For Sale.
- **Global Pricing**: Centralized pricing snapshots that reflect across your entire inventory.
- **Public Vendor Page**: A mobile-optimized public page at `/vendor/[handle]` for buyers to browse your collection.
- **Onboarding**: Step-by-step setup for new vendors.
- **Mock API Layer**: Simulates real-world network latency and occasional errors for robust frontend testing.
- **LocalStorage Persistence**: Your data persists across page refreshes.

## Tech Stack

- **Next.js 15+** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** components
- **Lucide React** icons
- **Sonner** for toast notifications

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Explore**:
   - Visit [`http://localhost:3000`](http://localhost:3000) to see the landing page.
   - Go through the **Onboarding** flow.
   - Manage your **Inventory** in the dashboard.
   - View your **Public Page** via the button in the topbar.

## Mock API & Data

The app uses a mock API layer located in `src/lib/mockApi.ts`.
- **Latency**: Each request has a random delay of 200ms–900ms.
- **Failures**: 10% of requests will randomly fail to test error handling.
- **Seeding**: Initial data is defined in `src/lib/seed.ts`. You can reset the app to this state in the **Settings** page.

### Transitioning to a Real API

To move to a real backend, replace the functions in `src/lib/mockApi.ts` with actual `fetch` or `axios` calls to your endpoints:

| Mock Function | Future API Endpoint |
|---------------|---------------------|
| `getCurrentUser` | `GET /api/profile` |
| `updateProfile` | `PATCH /api/profile` |
| `listInventory` | `GET /api/inventory` |
| `createInventoryItem` | `POST /api/inventory` |
| `refreshPricing` | `POST /api/pricing/refresh` |

## Project Structure

- `/src/app`: Next.js pages and layouts.
- `/src/components`: UI components (shadcn/ui + custom).
- `/src/lib`: Core logic, types, mock API, and storage.
- `/src/lib/seed.ts`: Adjust this file to change the initial cards and prices.

---
Built with ❤️ for the One Piece TCG Community.


## Dictionary

- Collectible Card — A physical trading card (Pokémon, One Piece, MTG, etc.).
- Raw Card (Ungraded) — A card that has not been graded.
- Graded Card — A card evaluated and sealed by a grading company.
- Slab — The sealed plastic case containing a graded card.
- Sealed Product — Factory-sealed items (packs, boxes, cases).
- Card Profile (Catalog Item) — A canonical reference of a card (set, number, name, variation). Shared by all users.
- Owned Card (Inventory Item) — A specific physical card owned by a user, with photos and history.
- Condition — The physical state of a raw card (NM, LP, etc.).
- Grade — The numeric grade assigned by a grading company.
- Certification Number — Unique ID used to verify a graded card.
- Population (Pop Report) — Statistics of how many cards exist at each grade.
- User — A Slabhub account owner.
- Seller — A user who lists items for sale.
- Buyer — A user purchasing listed items.
- Collector — A user managing a personal collection.
- Alternate Art Card - A card that uses alternative artwork compared to the standard version, while keeping the same card name, number, and gameplay function.
- Booster Box — A sealed retail product containing multiple booster packs from the same set, intended for opening or resale.