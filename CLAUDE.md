# The Cancer Card - Project CLAUDE.md

## Overview
Mobile-first PWA that gamifies asking for help during cancer treatment. Cancer patients ("Card Holders") spend points to request tasks from their support "Crew" via Direct Assignment, Open Bucket, or Reverse Auction modes.

## Tech Stack
- **Framework:** Next.js 15, App Router, TypeScript (strict)
- **Styling:** Tailwind CSS v4 with CSS-based design tokens
- **Database:** SQLite via better-sqlite3 + Drizzle ORM (WAL mode)
- **Auth:** Auth.js (NextAuth v5) with password login + JWT sessions
- **Email:** Resend (transactional emails)
- **Realtime:** Server-Sent Events (SSE) for auction updates
- **Animations:** Framer Motion
- **Validation:** Zod on all API boundaries
- **Deployment:** Docker with volume-mounted SQLite on VPS

## Key Conventions
- **Immutable data patterns** — never mutate, always spread/create new
- **Server Components** for data fetching; Client Components only for interactivity
- **Mobile-first design** — 44px touch targets, bottom tab nav, safe area insets
- **File size limit:** 800 lines max, prefer many small focused files
- **Functions:** <50 lines each
- **Error handling:** All try/catch with user-friendly messages
- **Input validation:** Zod schemas at every API boundary

## File Structure
- `src/app/(auth)/` — Login, signup (no bottom nav)
- `src/app/(main)/` — Main app with bottom tab navigation
- `src/app/api/` — API routes
- `src/components/ui/` — Base design system
- `src/components/cards/` — Card-motif components
- `src/components/tasks/` — Task-specific components
- `src/db/` — Drizzle schema, client, migrations, seed
- `src/lib/` — Business logic (points, badges, streaks, auth, SSE, validators)
- `src/hooks/` — Client-side React hooks

## Database
- SQLite file at `/data/app.db` (Docker) or `./data/app.db` (local dev)
- WAL mode enabled for concurrent reads
- Drizzle ORM with code-first schema
- Run migrations: `npx drizzle-kit migrate`
- Seed data: `npx tsx src/db/seed.ts`

## Design System
- **Colors:** Purple (#7C3AED primary) + Pink (#EC4899 accent) + warm neutrals
- **Fonts:** Nunito (headings), Inter (body), JetBrains Mono (point values)
- **Card motif:** Rounded corners, shadows, suit symbols (spade/heart/diamond/club)
- **Touch targets:** 44px minimum (Apple HIG)
- **Navigation:** Bottom tab bar, 5 tabs max

## Auth
- Password-based login (bcryptjs hashing)
- JWT sessions via Auth.js
- Protected routes via middleware
- Roles: card_holder, admin, crew_member

## Points System
- Card Holder starts with 500 points (configurable)
- Points CAN go negative (by design)
- Self-care milestones earn points back
- Streak bonuses at 3-day and 7-day marks
