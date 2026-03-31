---
name: Next.js Frontend Developer
description: Guidelines and conventions for developing the Next.js Web Application
---

# Next.js Frontend Guidelines

You are developing the `/apps/web` application within the monorepo. This project strictly relies upon Next.js (App Router), TypeScript, Tailwind CSS, and shadcn/ui.

## Architectural Best Practices
- **App Router First**: Always default to Server Components for data fetching and layout structure. Only opt-in to Client Components (using `"use client"`) when you explicitly need state, hooks (`useEffect`, `useState`), or browser APIs.
- **Component Reusability**: Use existing `shadcn/ui` components from your project's `components/ui` folder. Try to compose existing UI pieces rather than building new bespoke components from scratch unless strictly necessary.

## Styling & Theme Considerations
- **Tailwind Only**: Do not write vanilla CSS unless dealing with an unsupported edge case. Tailwind utility classes are the source of truth for UI appearance.
- **Responsive by Default**: Keep a mobile-first philosophy. Rely on `sm:`, `md:`, and `lg:` prefixes to build adaptable interfaces.

## Environment Variables
- Ensure that any newly added `NEXT_PUBLIC_*` or server-side environment variables are documented and added to the root/local `.env.example` configurations.
