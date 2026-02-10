# The Cancer Card - MVP Implementation Plan

## Requirements Restatement

Build a **mobile-first Progressive Web App** that gamifies asking for help during cancer treatment. A cancer patient ("Card Holder") maintains a point bank and spends points to request tasks from their support "Crew." Three request modes exist: Direct Assignment, Open Bucket, and Reverse Auction. Patients earn points back through self-care milestones. The app includes a leaderboard, badges, activity feed, and playful card-themed notifications.

**Key constraints:**
- **Local SQLite database** (no cloud DB) — runs on a VPS in Docker
- **Mobile-first** with Apple HIG + Material Design 3 standards
- **Playing card motif** — purple/pink palette, card animations, suit symbols
- **3-tap max** for core actions, thumb-friendly bottom navigation
- **Docker deployment** on existing VPS infrastructure

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR/RSC, API routes, PWA-friendly |
| **Language** | TypeScript (strict) | Type safety across stack |
| **Styling** | Tailwind CSS v4 + custom design tokens | Rapid mobile-first development |
| **Database** | SQLite via better-sqlite3 | Local, zero-config, Docker volume persistence |
| **ORM** | Drizzle ORM | Code-first schema, type inference, no codegen, excellent SQLite support |
| **Auth** | Auth.js (NextAuth v5) + magic link email | Self-hosted auth with SQLite adapter, JWT sessions |
| **Email** | Nodemailer (SMTP) or Resend | Magic link delivery + notifications |
| **Realtime** | Server-Sent Events (SSE) | Auction updates, activity feed — no external dependencies |
| **Animations** | Framer Motion | Card flip/deal animations, micro-interactions |
| **Icons** | Lucide React | Clean, customizable icon set |
| **Fonts** | Nunito (headings) + Inter (body) | Rounded, friendly, highly legible on mobile |
| **PWA** | next-pwa / Serwist | Service worker, installable, offline caching |
| **Validation** | Zod | Input validation on all API boundaries |
| **Deployment** | Docker + docker-compose | Volume-mounted SQLite, runs on existing VPS |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Docker Container                │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           Next.js 15 (standalone)         │   │
│  │                                           │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │  Pages   │  │   API    │  │   SSE   │ │   │
│  │  │  (RSC)   │  │  Routes  │  │ Endpoint│ │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬────┘ │   │
│  │       │              │              │      │   │
│  │  ┌────▼──────────────▼──────────────▼───┐ │   │
│  │  │        Drizzle ORM (better-sqlite3)   │ │   │
│  │  └────────────────┬──────────────────────┘ │   │
│  └───────────────────┼────────────────────────┘   │
│                      │                             │
│              ┌───────▼────────┐                    │
│              │  /data/app.db  │ ← Docker Volume    │
│              │   (SQLite)     │                     │
│              └────────────────┘                     │
└─────────────────────────────────────────────────┘
```

**Key decisions:**
- **Standalone output** for minimal Docker image (~150MB vs ~1GB)
- **SQLite on Docker volume** for data persistence across container restarts
- **SSE over WebSocket** — simpler, works through proxies, sufficient for auction updates
- **JWT sessions** — no session table needed, works with SQLite's single-writer model
- **Server Components** for all data reads; Client Components only for interactivity

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **SQLite single-writer bottleneck** during active auctions | MEDIUM | WAL mode, optimistic updates on client, batch writes. SQLite handles ~1000 concurrent reads easily; writes serialize but complete in <1ms |
| **Magic link email deliverability** | MEDIUM | Use Resend or SMTP with proper SPF/DKIM. Fallback: add password-based auth as alternative login method for MVP |
| **SSE connection limits** per browser (~6) | LOW | One SSE connection per crew, multiplex event types. Crew sizes are small (5-50 people) |
| **Docker volume data loss** | HIGH | Automated SQLite backup script (cron → copy to backup volume). Document restore procedure |
| **better-sqlite3 native compilation in Docker** | LOW | Use `node:20-alpine` with build tools, or pre-build in multi-stage Dockerfile |
| **PWA install experience varies by OS** | LOW | Custom install prompt UI, fallback to "Add to Home Screen" instructions |

---

## Design System Foundation

### Color Palette (Purple + Pink + Playful)
```
--color-royal:       #7C3AED  (purple-600 — primary actions, CTAs)
--color-royal-dark:  #6D28D9  (purple-700 — pressed states)
--color-royal-light: #A78BFA  (purple-400 — secondary elements)
--color-blush:       #EC4899  (pink-500 — warmth, highlights)
--color-blush-light: #F9A8D4  (pink-300 — subtle accents)
--color-champagne:   #FDF4FF  (fuchsia-50 — card backgrounds)
--color-midnight:    #1E1B4B  (indigo-950 — text, dark elements)
--color-cloud:       #F8FAFC  (slate-50 — page background)
--color-success:     #10B981  (emerald-500 — completed, earned)
--color-warning:     #F59E0B  (amber-500 — urgency)
--color-danger:      #EF4444  (red-500 — ASAP, errors)
```

### Typography
- **Headings:** Nunito (700, 800) — rounded, friendly, empowering
- **Body:** Inter (400, 500, 600) — highly legible at small sizes on mobile
- **Monospace/Points:** JetBrains Mono — for point values (feels like a scoreboard)

### Mobile-First Principles (Apple HIG + Material 3)
- **44px minimum touch targets** (Apple HIG) with 8px spacing between
- **Bottom tab bar** — 5 tabs max, active state with filled icon + label
- **Safe area insets** — respect notch, home indicator, status bar
- **System-native feel** — large titles that collapse on scroll (iOS pattern)
- **Haptic feedback patterns** — light for taps, medium for success, heavy for "card played"
- **Sheet modals** — drag-to-dismiss bottom sheets for task creation (Material 3)
- **Skeleton loading** — content-shaped placeholders, never spinners

### Card Motif Design Language
- **Card component** — rounded corners (16px), subtle shadow, slight tilt on hover
- **Suit symbols** — ♠ ♥ ♦ ♣ used as decorative elements and category markers
- **"Play Card" animation** — card slides from bottom, flips to reveal, satisfying scale bounce
- **Point badge** — chip-style with JetBrains Mono, subtle gradient background
- **Dealing animation** — tasks fan out like cards being dealt when loading

---

## File Structure

```
cancer-card/
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── drizzle.config.ts
├── CLAUDE.md
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (fonts, PWA meta, providers)
│   │   ├── globals.css                   # Tailwind + design tokens + custom utilities
│   │   ├── manifest.ts                   # PWA manifest (dynamic)
│   │   │
│   │   ├── (auth)/                       # Auth group (no bottom nav)
│   │   │   ├── layout.tsx                # Centered card layout
│   │   │   ├── login/page.tsx            # Magic link login
│   │   │   ├── signup/page.tsx           # Registration
│   │   │   └── verify/page.tsx           # Magic link verification
│   │   │
│   │   ├── (main)/                       # Main app group (with bottom nav)
│   │   │   ├── layout.tsx                # Bottom tab bar + SSE provider
│   │   │   ├── dashboard/page.tsx        # Home: points, quick actions, recent activity
│   │   │   ├── play-card/
│   │   │   │   ├── page.tsx              # Step 1: Choose task from menu
│   │   │   │   └── confirm/page.tsx      # Step 2-3: Mode + details → play animation
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx              # Task board (open/assigned/auctions)
│   │   │   │   └── [id]/page.tsx         # Task detail + auction bidding
│   │   │   ├── self-care/page.tsx        # Milestone logging + streaks
│   │   │   ├── feed/page.tsx             # Activity feed (social)
│   │   │   ├── leaderboard/page.tsx      # Crew rankings + badges
│   │   │   └── settings/
│   │   │       ├── page.tsx              # Settings hub
│   │   │       ├── menu/page.tsx         # Task menu customization
│   │   │       ├── crew/page.tsx         # Crew management + invites
│   │   │       └── profile/page.tsx      # Profile + notification prefs
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   # Auth.js handler
│   │       ├── tasks/route.ts                # CRUD tasks
│   │       ├── tasks/[id]/route.ts           # Single task ops
│   │       ├── tasks/[id]/bid/route.ts       # Place auction bid
│   │       ├── tasks/[id]/claim/route.ts     # Claim open task
│   │       ├── tasks/[id]/complete/route.ts  # Mark complete
│   │       ├── milestones/route.ts           # Log self-care
│   │       ├── crews/route.ts                # Create crew
│   │       ├── crews/join/route.ts           # Join via invite code
│   │       ├── crews/[id]/members/route.ts   # Crew member management
│   │       ├── feed/route.ts                 # Activity feed data
│   │       ├── feed/stream/route.ts          # SSE endpoint for realtime updates
│   │       ├── leaderboard/route.ts          # Leaderboard data
│   │       └── menu/route.ts                 # Task menu templates
│   │
│   ├── components/
│   │   ├── ui/                           # Base design system components
│   │   │   ├── button.tsx                # Primary, secondary, ghost, danger variants
│   │   │   ├── card.tsx                  # Playing-card styled container
│   │   │   ├── input.tsx                 # Text input with floating label
│   │   │   ├── badge.tsx                 # Point chips, status badges
│   │   │   ├── bottom-sheet.tsx          # Drag-to-dismiss modal (Material 3)
│   │   │   ├── tab-bar.tsx              # Bottom navigation
│   │   │   ├── skeleton.tsx              # Loading skeletons
│   │   │   ├── avatar.tsx                # User avatar with fallback initials
│   │   │   └── toast.tsx                 # Notification toasts
│   │   │
│   │   ├── cards/                        # Card-motif components
│   │   │   ├── play-card-button.tsx      # Big "Play My Card" CTA
│   │   │   ├── task-card.tsx             # Task displayed as playing card
│   │   │   ├── point-display.tsx         # Animated point counter
│   │   │   ├── card-flip.tsx             # Flip animation wrapper
│   │   │   └── suit-icon.tsx             # ♠♥♦♣ decorative component
│   │   │
│   │   ├── tasks/                        # Task-specific components
│   │   │   ├── task-menu-grid.tsx        # Category grid for task selection
│   │   │   ├── mode-picker.tsx           # Direct/Open/Auction selector
│   │   │   ├── auction-panel.tsx         # Live auction with bid list
│   │   │   ├── bid-input.tsx             # Auction bid form
│   │   │   ├── urgency-picker.tsx        # Whenever/Today/ASAP
│   │   │   └── task-status-badge.tsx     # Status pill
│   │   │
│   │   ├── feed/                         # Activity feed components
│   │   │   ├── feed-item.tsx             # Single feed entry
│   │   │   └── feed-list.tsx             # Scrollable feed
│   │   │
│   │   ├── self-care/                    # Self-care components
│   │   │   ├── milestone-button.tsx      # Quick-tap milestone logger
│   │   │   ├── streak-display.tsx        # Streak counter with fire animation
│   │   │   └── points-earned-toast.tsx   # "+100 pts" animation
│   │   │
│   │   └── crew/                         # Crew components
│   │       ├── leaderboard-row.tsx       # Single ranking entry
│   │       ├── badge-display.tsx         # Badge grid/shelf
│   │       ├── invite-share.tsx          # Share invite code/link
│   │       └── member-card.tsx           # Crew member profile card
│   │
│   ├── db/
│   │   ├── index.ts                      # Drizzle client singleton (better-sqlite3)
│   │   ├── schema.ts                     # All table definitions
│   │   ├── seed.ts                       # Default task menu templates + sample data
│   │   └── migrate.ts                    # Migration runner
│   │
│   ├── lib/
│   │   ├── auth.ts                       # Auth.js config
│   │   ├── points.ts                     # Point calculation engine
│   │   ├── badges.ts                     # Badge evaluation logic
│   │   ├── streaks.ts                    # Streak calculation
│   │   ├── notifications.ts              # In-app notification builder (tone/copy)
│   │   ├── sse.ts                        # SSE utilities (server + client hook)
│   │   ├── validators.ts                 # Zod schemas for all API inputs
│   │   └── utils.ts                      # Shared helpers (formatPoints, timeAgo, etc.)
│   │
│   ├── hooks/
│   │   ├── use-sse.ts                    # SSE subscription hook
│   │   ├── use-points.ts                 # Optimistic point updates
│   │   └── use-haptics.ts               # Vibration API wrapper
│   │
│   └── types/
│       └── index.ts                      # Shared TypeScript types
│
├── drizzle/
│   └── migrations/                       # Generated SQL migration files
│
└── public/
    ├── icons/                            # PWA icons (192, 512)
    ├── splash/                           # PWA splash screens
    └── sounds/                           # Optional: card flip, success chime
```

---

## Database Schema (Drizzle)

All tables from the PRD Section 6.2, adapted for SQLite + Drizzle:

```typescript
// src/db/schema.ts — abbreviated, full implementation in build phase

users             // id mod, displayName, email, avatarUrl, passwordHash, createdAt
crews             // id, name, cardHolderId → users, pointBalance, inviteCode, settings (JSON), createdAt
crewMembers       // crewId → crews, userId → users, role (enum), stats (JSON), badges (JSON), joinedAt
tasks             // id, crewId, title, description, category, pointCost, requestMode, assignedTo, claimedBy, status, urgency, dueBy, auctionSettings (JSON), finalPointCost, createdAt, completedAt
bids              // id, taskId → tasks, userId → users, bidAmount, comment, createdAt
milestones        // id, crewId, userId, milestoneType, pointsEarned, note, isStreakBonus, loggedAt
activityFeed      // id, crewId, eventType, actorId → users, data (JSON), createdAt
taskMenuTemplates // id, crewId, title, category, defaultPoints, emoji, isActive
```

---

## Implementation Phases

### Phase 1: Foundation (Steps 1-4)
> Project scaffolding, database, auth, design system

**Step 1: Project Initialization**
- Initialize Next.js 15 with TypeScript, Tailwind, App Router, src directory
- Install all dependencies (drizzle-orm, better-sqlite3, auth.js, framer-motion, zod, lucide-react, etc.)
- Configure `tailwind.config.ts` with custom design tokens (colors, fonts, spacing)
- Set up `globals.css` with CSS custom properties and base styles
- Create `CLAUDE.md` with project-specific instructions
- Create `Dockerfile` and `docker-compose.yml`
- Estimated complexity: **LOW**

**Step 2: Database Layer**
- Define complete Drizzle schema in `src/db/schema.ts` (all 8 tables from PRD)
- Create database singleton in `src/db/index.ts` with WAL mode enabled
- Set up Drizzle migrations (`drizzle.config.ts`, initial migration)
- Create seed script with default task menu templates (all categories from PRD)
- Write and run initial migration
- Estimated complexity: **MEDIUM**

**Step 3: Authentication**
- Configure Auth.js with Drizzle SQLite adapter
- Implement magic link flow (email → verify → session)
- Create auth pages: login, signup, verify (card-themed design)
- Set up middleware for protected routes
- Add JWT session strategy
- For MVP simplicity: also support password-based login as fallback
- Estimated complexity: **MEDIUM**

**Step 4: Design System & Shell**
- Build base UI components: Button, Card, Input, Badge, Skeleton, Avatar, Toast
- Build BottomSheet (drag-to-dismiss) and TabBar (bottom navigation)
- Build card-motif components: PlayCardButton, PointDisplay, CardFlip, SuitIcon
- Set up root layout with fonts (Nunito + Inter via `next/font`)
- Build (auth) layout and (main) layout with bottom tab bar
- Create PWA manifest + service worker setup
- Implement haptics hook (`use-haptics.ts`)
- Estimated complexity: **HIGH** (most design work lives here)

### Phase 2: Core Mechanics (Steps 5-8)
> Crew system, task creation, point bank, request modes

**Step 5: Crew System**
- API: Create crew (generates invite code, sets initial point balance)
- API: Join crew via invite code
- API: List crew members, update roles
- Pages: Crew settings, invite sharing (copy link + native share)
- Onboarding flow: Create crew → customize name → get invite link
- Estimated complexity: **MEDIUM**

**Step 6: Task Menu & Point Bank**
- Seed default task menu templates (all categories from PRD)
- API: CRUD task menu templates (customizable per crew)
- Build TaskMenuGrid component (category tabs → task cards)
- Build PointDisplay with animated counter (Framer Motion)
- Implement point calculation engine (`lib/points.ts`)
- Points deduction on task acceptance, refund on cancellation
- Settings page: customize point values, add/remove menu items
- Estimated complexity: **MEDIUM**

**Step 7: Playing the Cancer Card (Task Creation)**
- Build "Play My Card" flow (3 steps, 3 taps max):
  1. Select task from menu (or create custom)
  2. Choose mode (Direct / Open / Auction) + urgency + details
  3. Confirm → card-playing animation → notification
- API: Create task with all modes
- Build satisfying "card played" animation (Framer Motion: card slides up, flips, bounces)
- Build ModePicker, UrgencyPicker components
- Estimated complexity: **HIGH** (animation + multi-step flow)

**Step 8: Task Board & Claiming**
- Card Holder view: "My Requests" — active tasks with status
- Crew Member view: "Task Board" — open tasks, assigned tasks, active auctions
- API: Claim open task, accept direct assignment, mark complete
- Card Holder confirms completion → points deducted → stats updated
- Task status flow: pending → claimed → in_progress → completed
- TaskCard component with status badges and action buttons
- Estimated complexity: **MEDIUM**

### Phase 3: Engagement Features (Steps 9-12)
> Auctions, self-care, feed, leaderboard

**Step 9: Reverse Auction System**
- API: Create auction task with settings (min bid, duration, auto-close)
- API: Place bid (must be lower than current lowest)
- API: Accept bid / auto-close auction
- SSE endpoint for live bid updates (`api/feed/stream`)
- Build AuctionPanel: live bid list, countdown timer, bid input
- Build `use-sse` hook for client-side subscription
- Bid comments ("trash talk") displayed inline
- Winner announcement with fanfare animation
- Estimated complexity: **HIGH** (realtime + complex state)

**Step 10: Self-Care Milestones**
- API: Log milestone, calculate streak bonuses
- Build milestone logging page: quick-tap buttons for each type
- Streak tracking logic (`lib/streaks.ts`): 3-day and 7-day bonuses
- Points-earned animation ("+100 pts" floats up with confetti)
- StreakDisplay component with fire emoji animation
- All milestones configurable (add custom, adjust point values)
- Estimated complexity: **MEDIUM**

**Step 11: Activity Feed**
- API: Fetch paginated feed for crew
- SSE integration: new events push to feed in realtime
- FeedItem component with event-specific rendering:
  - Task created/claimed/completed
  - Auction bids and winners
  - Milestone achievements
  - Badge unlocks
  - Member joins
- Notification copy matches PRD tone (sassy, warm, empowering)
- Estimated complexity: **MEDIUM**

**Step 12: Leaderboard & Badges**
- API: Calculate leaderboard rankings (tasks completed, points spent, auction wins, response time, streaks)
- Build leaderboard page with animated rankings
- Badge evaluation logic (`lib/badges.ts`): check criteria on task completion
- Badge display: grid/shelf on member profiles
- All badges from PRD implemented (First Responder, Taco Champion, etc.)
- Custom badge creation by Card Holder
- Estimated complexity: **MEDIUM**

### Phase 4: Polish & Deploy (Steps 13-15)
> PWA, Docker, final polish

**Step 13: Dashboard & Navigation Polish**
- Card Holder dashboard: point balance (prominent), quick actions, recent activity, streak counter
- Crew Member dashboard: available tasks, personal stats, notifications
- Role-aware navigation (Card Holder sees "Play Card" tab; Crew sees "Tasks" tab)
- Empty states with personality ("No tasks yet — your crew is standing by ♠")
- Error states with humor ("Something went sideways. Even cancer can't break this app.")
- Estimated complexity: **MEDIUM**

**Step 14: PWA & Offline**
- Configure service worker (Serwist/next-pwa)
- Cache core app shell for offline access
- Queue offline actions (milestone logging, task claims) for sync
- Install prompt with custom UI
- PWA icons and splash screens
- `manifest.ts` with theme colors matching design system
- Estimated complexity: **MEDIUM**

**Step 15: Docker & Deployment**
- Multi-stage Dockerfile (build → production with standalone output)
- docker-compose.yml with volume mount for SQLite persistence
- Health check endpoint
- SQLite backup script (cron job in compose)
- Environment variable configuration (.env.example)
- Production optimizations: WAL mode, PRAGMA settings
- Test full flow in Docker locally
- Estimated complexity: **LOW**

---

## Build Order Summary

```
Phase 1: Foundation          Phase 2: Core Mechanics
┌──────────────────┐         ┌──────────────────┐
│ 1. Init Project  │────────▶│ 5. Crew System   │
│ 2. Database      │         │ 6. Task Menu     │
│ 3. Auth          │         │ 7. Play Card     │
│ 4. Design System │         │ 8. Task Board    │
└──────────────────┘         └────────┬─────────┘
                                      │
Phase 3: Engagement          Phase 4: Polish
┌──────────────────┐         ┌──────────────────┐
│ 9. Auctions      │────────▶│ 13. Dashboards   │
│ 10. Self-Care    │         │ 14. PWA          │
│ 11. Feed         │         │ 15. Docker       │
│ 12. Leaderboard  │         └──────────────────┘
└──────────────────┘
```

---

## Open Questions (Decisions Needed Before Building)

1. **Auth strategy**: Magic link only, or also offer password login for MVP simplicity? (Magic link requires email service setup)
2. **Email service**: Resend (easy API, free tier) or direct SMTP (self-hosted)?
3. **Negative point balance**: Can the Card Holder go below zero, or do they need to earn more first?
4. **Privacy on self-care**: Should crew see all milestones, summaries only, or opt-in per type?
5. **Multi-crew support in MVP**: Should one user be able to be a crew member for multiple patients now, or defer?

---

## Estimated Complexity

| Phase | Steps | Complexity |
|-------|-------|-----------|
| Foundation | 1-4 | HIGH (design system is the heavy lift) |
| Core Mechanics | 5-8 | HIGH (multi-step flows, animations) |
| Engagement | 9-12 | HIGH (realtime auctions) |
| Polish & Deploy | 13-15 | MEDIUM |

---

**WAITING FOR CONFIRMATION**: Shall I proceed with this plan? Any modifications needed? Please also weigh in on the open questions above.
