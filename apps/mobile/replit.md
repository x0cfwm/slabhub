# SlabHub CRM

## Overview
A mobile trading card CRM app for One Piece TCG collectors and vendors. Manage collectible items (cards, sealed products) through a kanban-style pipeline with stages: Acquired, In Transit, Grading, In Stock, Listed, Sold.

## Architecture
- **Frontend**: Expo React Native with Expo Router (file-based routing)
- **Backend**: Express server on port 5000 (serves landing page + API)
- **Storage**: AsyncStorage for local data persistence
- **State Management**: React Context (AppContext) with AsyncStorage backing

## Key Features
- Dashboard with stats, inventory breakdown, sales analytics
- Inventory management with stage-based filtering (kanban mobile)
- Add/edit items with image picker, pricing auto-fill from database
- One Piece TCG pricing database with market prices
- Full collector profile (shop name, handle, payments, fulfillment, tradeshows, wishlist, references)

## File Structure
- `app/(tabs)/index.tsx` - Dashboard screen
- `app/(tabs)/inventory.tsx` - Inventory management screen
- `app/(tabs)/pricing.tsx` - Market pricing database screen
- `app/(tabs)/profile.tsx` - User profile/settings screen
- `app/add-item.tsx` - Add new item modal
- `app/item/[id].tsx` - Item detail screen
- `contexts/AppContext.tsx` - Main app context with AsyncStorage
- `constants/types.ts` - TypeScript types and label maps
- `constants/pricing-data.ts` - One Piece TCG pricing database
- `constants/colors.ts` - Dark theme color palette

## Theme
- Dark theme with yellow (#F5C518) accent
- Inspired by the desktop SlabHub CRM prototype
- Color-coded stages: Acquired (blue), In Transit (orange), Grading (purple), In Stock (green), Listed (yellow), Sold (red)

## Recent Changes
- 2026-02-11: Initial build with all core screens and functionality
