# The Cancer Card - MVP Build Recap

## Project Summary

**The Cancer Card** is a mobile-first Progressive Web App that gamifies asking for help during cancer treatment. Cancer patients ("Card Holders") maintain a point bank and spend points to request tasks from their support "Crew" via three modes: Direct Assignment, Open Bucket, and Reverse Auction. Patients earn points back through self-care milestones.

**Status:** MVP build complete. All 24 routes compile. Ready for local testing and Docker deployment.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, standalone output) | 16.1.6 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (CSS-based `@theme`) | 4.x |
| Database | SQLite via better-sqlite3 + Drizzle ORM | better-sqlite3 12.6.2, drizzle-orm 0.45.1 |
| Auth | Auth.js (next-auth v5 beta) + JWT sessions | 5.0.0-beta.30 |
| Validation | Zod | 4.3.6 |
| Animations | Framer Motion | 12.34.0 |
| Icons | Lucide React | 0.563.0 |
| Email | Resend | 6.9.2 |
| Fonts | Nunito (headings), Inter (body), JetBrains Mono (points) | Google Fonts |
| Deployment | Docker (multi-stage, standalone) | node:20-alpine |

---

## Port Configuration

| Service | Port | Status |
|---------|------|--------|
| Cancer Card (dev) | **3000** | Available - no conflicts |
| Cancer Card (Docker) | **3000** | Available - no conflicts |
| Drizzle Studio | **4983** | Available (default) |

**Other ports in use on this machine:**
- 3001 (another Node project)
- 5173 (Vite project)
- 5678 (n8n Docker)
- 80/443 (Docker proxy)
- 3306 (MySQL)
- 8025/8026 (Mail Docker)

---

## Architecture

```
Docker Container
+-----------------------------------------------+
|  Next.js 16 (standalone)                       |
|                                                |
|  Pages (RSC)  |  API Routes  |  SSE Endpoint  |
|       |             |              |           |
|  +----v-------------v--------------v--------+  |
|  |       Drizzle ORM (better-sqlite3)       |  |
|  +-------------------+---------------------+  |
|                      |                         |
|              /data/app.db  <-- Docker Volume   |
+-----------------------------------------------+
```

**Key architectural decisions:**
- Standalone output for minimal Docker image (~150MB)
- SQLite on Docker volume for persistence across container restarts
- SSE over WebSocket (simpler, works through proxies)
- JWT sessions (no session table, works with SQLite's single-writer model)
- Server Components for data reads; Client Components only for interactivity
- WAL mode + busy_timeout + synchronous=NORMAL for concurrent reads

---

## Database Schema (9 tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, displayName, email, passwordHash, avatarUrl |
| `crews` | Support crews | id, name, cardHolderId, pointBalance, inviteCode, settings (JSON) |
| `crew_members` | Crew membership | crewId, userId, role, stats (JSON), badges (JSON) |
| `tasks` | Task requests | id, crewId, title, category, pointCost, requestMode, status, urgency, auctionSettings (JSON) |
| `bids` | Auction bids | id, taskId, userId, bidAmount, comment |
| `milestones` | Self-care logs | id, crewId, userId, milestoneType, pointsEarned, isStreakBonus |
| `activity_feed` | Social feed events | id, crewId, eventType, actorId, data (JSON) |
| `task_menu_templates` | Task templates | id, crewId, title, category, defaultPoints, emoji |
| `self_care_routines` | Routine definitions | id, crewId, name, milestoneType, pointValue, emoji |

**Seed data:** 31 task templates across 8 categories + 8 self-care routines auto-seeded per crew.

---

## File Structure

```
cancer_card/
├── CLAUDE.md                 # Project instructions for Claude Code
├── PLAN.md                   # Original implementation plan
├── RECAP.md                  # This file
├── ROADMAP.md                # Feature roadmap
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # Docker Compose with volume
├── drizzle.config.ts         # Drizzle ORM config
├── next.config.ts            # Standalone output + better-sqlite3
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variable template
├── .env.local                # Local dev environment
│
├── public/
│   └── manifest.json         # PWA manifest
│
└── src/
    ├── middleware.ts          # Auth protection (Edge-compatible, uses getToken)
    │
    ├── app/
    │   ├── layout.tsx        # Root layout (fonts, PWA meta, ToastProvider)
    │   ├── globals.css       # Tailwind v4 @theme + design tokens + animations
    │   ├── page.tsx          # Redirect to /dashboard
    │   │
    │   ├── (auth)/           # Auth pages (no bottom nav)
    │   │   ├── layout.tsx    # Centered card layout with decorative suits
    │   │   ├── login/
    │   │   │   ├── page.tsx         # Suspense wrapper
    │   │   │   └── login-form.tsx   # Client component with useSearchParams
    │   │   └── signup/
    │   │       └── page.tsx
    │   │
    │   ├── (main)/           # Main app (with bottom tab bar)
    │   │   ├── layout.tsx    # Tab bar layout with safe area padding
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx          # Server: fetch crew, tasks, feed, milestones
    │   │   │   └── dashboard-client.tsx  # Client: point card, actions, invite code
    │   │   ├── play-card/
    │   │   │   └── page.tsx  # 3-step flow: menu -> mode -> confirm
    │   │   ├── tasks/
    │   │   │   ├── page.tsx  # Task board with status filters
    │   │   │   └── [id]/
    │   │   │       └── page.tsx  # Task detail + auction panel + SSE
    │   │   ├── self-care/
    │   │   │   └── page.tsx  # Tap-to-log milestones + streaks
    │   │   ├── leaderboard/
    │   │   │   └── page.tsx  # Ranked crew members + badges
    │   │   ├── feed/
    │   │   │   └── page.tsx  # Activity feed with SSE realtime
    │   │   └── onboarding/
    │   │       └── page.tsx  # Create crew or join with code
    │   │
    │   └── api/              # 14 API endpoints
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts  # Auth.js handler
    │       │   └── signup/route.ts         # User registration
    │       ├── crews/
    │       │   ├── route.ts        # POST: create, GET: get user's crew
    │       │   └── join/route.ts   # POST: join via invite code
    │       ├── tasks/
    │       │   ├── route.ts        # POST: create task, GET: list tasks
    │       │   └── [id]/
    │       │       ├── claim/route.ts     # POST: claim open/direct task
    │       │       ├── complete/route.ts  # POST: mark complete + deduct points
    │       │       └── bid/route.ts       # POST: place auction bid
    │       ├── milestones/route.ts   # POST: log milestone, GET: list + routines
    │       ├── feed/
    │       │   ├── route.ts          # GET: paginated activity feed
    │       │   └── stream/route.ts   # GET: SSE endpoint (polls every 2s)
    │       ├── leaderboard/route.ts  # GET: ranked crew members
    │       └── menu/route.ts         # GET: templates, POST: add template
    │
    ├── components/
    │   ├── ui/               # Base design system (9 components)
    │   │   ├── button.tsx    # 5 variants, 3 sizes, loading state
    │   │   ├── card.tsx      # 4 variants, 4 padding sizes
    │   │   ├── input.tsx     # Floating label, error display
    │   │   ├── badge.tsx     # 6 variants (incl. points gradient)
    │   │   ├── avatar.tsx    # Image + fallback initials
    │   │   ├── skeleton.tsx  # 3 variants + CardSkeleton composite
    │   │   ├── toast.tsx     # Context-based, 4 types, Framer Motion
    │   │   ├── tab-bar.tsx   # 5-tab bottom nav, pulse-glow on Play Card
    │   │   └── bottom-sheet.tsx  # Drag-to-dismiss modal
    │   │
    │   └── cards/            # Card-motif components (4 components)
    │       ├── suit-icon.tsx       # Unicode suits with semantic colors
    │       ├── point-display.tsx   # Animated counter with eased interpolation
    │       ├── card-flip.tsx       # 3D flip with front/back faces
    │       └── play-card-button.tsx # Gradient CTA with corner suits
    │
    ├── db/
    │   ├── index.ts          # SQLite singleton (WAL, busy_timeout, foreign_keys)
    │   ├── schema.ts         # 9 tables with Drizzle ORM
    │   └── seed.ts           # 31 task templates + 8 self-care routines
    │
    ├── hooks/
    │   ├── use-haptics.ts    # Vibration API (5 patterns)
    │   └── use-sse.ts        # EventSource with auto-reconnect
    │
    ├── lib/
    │   ├── auth.ts           # Auth.js config (Credentials + JWT)
    │   ├── session.ts        # getSession, requireSession, getUserCrew
    │   ├── validators.ts     # Zod schemas for all API inputs
    │   ├── points.ts         # deductPoints, addPoints, logActivity
    │   ├── badges.ts         # Server-only badge evaluation (imports db)
    │   ├── badge-definitions.ts  # Client-safe badge data (no db import)
    │   ├── streaks.ts        # Medication + general streak calculation
    │   ├── notifications.ts  # PRD-tone notification copy templates
    │   └── utils.ts          # cn, generateInviteCode, formatPoints, timeAgo, etc.
    │
    └── types/
        └── index.ts          # All TypeScript types + re-exports from schema
```

---

## Design System

### Colors
- **Primary:** Purple `#7C3AED` (empowerment)
- **Accent:** Pink `#EC4899` (warmth)
- **Background:** Cloud `#F8FAFC`, Champagne `#FDF4FF`
- **Text:** Midnight `#1E1B4B`, Ink `#334155`, Muted `#94A3B8`
- **Suits:** Spade (midnight), Heart (red), Diamond (purple), Club (emerald)

### Typography
- **Headings:** Nunito 700/800 (rounded, friendly)
- **Body:** Inter 400/500/600 (legible at small sizes)
- **Points:** JetBrains Mono (scoreboard feel)

### Animations (globals.css)
- `animate-card-deal` — slide up + rotate + scale bounce (card dealing)
- `animate-float-up` — points earned float-up effect
- `animate-pulse-glow` — CTA button pulse
- `animate-bounce-in` — element entrance
- `animate-shimmer` — skeleton loading
- `card-stagger` — staggered card dealing for lists

### Mobile-First Principles
- 44px minimum touch targets (Apple HIG)
- Bottom tab bar (5 tabs, one-handed use)
- Safe area insets for notch/home indicator
- 16px font-size on inputs (prevents iOS zoom)
- Tap highlight disabled
- PWA standalone display mode

---

## Auth System

- **Method:** Password login (bcryptjs hashing)
- **Sessions:** JWT via Auth.js (no database sessions)
- **Middleware:** Edge-compatible using `getToken` from `next-auth/jwt`
- **Protected routes:** Everything except `/login`, `/signup`, `/api/auth/*`
- **Roles:** `card_holder`, `admin`, `crew_member`

---

## Points System

| Rule | Value |
|------|-------|
| Starting balance (new crew) | 500 points |
| Negative balance allowed | Yes (by design) |
| Chemo milestone | +100 points |
| Appointment milestone | +50 points |
| Medication milestone | +25 points |
| Sleep/Exercise milestone | +15-20 points |
| Water milestone | +10 points |
| 3-day streak bonus | +50 points |
| 7-day streak bonus | +150 points |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` | User registration |
| * | `/api/auth/[...nextauth]` | Auth.js handler |
| POST | `/api/crews` | Create crew |
| GET | `/api/crews` | Get user's crew |
| POST | `/api/crews/join` | Join crew via invite code |
| POST | `/api/tasks` | Create task (all 3 modes) |
| GET | `/api/tasks` | List tasks with bids |
| POST | `/api/tasks/[id]/claim` | Claim open/direct task |
| POST | `/api/tasks/[id]/complete` | Mark complete + deduct points |
| POST | `/api/tasks/[id]/bid` | Place auction bid |
| POST | `/api/milestones` | Log self-care milestone |
| GET | `/api/milestones` | List milestones + routines |
| GET | `/api/feed` | Paginated activity feed |
| GET | `/api/feed/stream` | SSE realtime updates |
| GET | `/api/leaderboard` | Ranked crew members |
| GET | `/api/menu` | Task templates |
| POST | `/api/menu` | Add template |

---

## Environment Variables

```bash
# Required
AUTH_SECRET=          # openssl rand -base64 32
AUTH_URL=             # http://localhost:3000 (dev) or production URL
DATABASE_PATH=        # ./data/app.db (dev) or /data/app.db (Docker)

# Email
RESEND_API_KEY=       # From resend.com
EMAIL_FROM=           # noreply@yourdomain.com

# Public
NEXT_PUBLIC_APP_URL=  # http://localhost:3000 (dev) or production URL
```

---

## Scripts

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (standalone)
npm run start        # Start production server
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes (dev)
npm run db:studio    # Open Drizzle Studio (port 4983)
npm run db:seed      # Seed default data
```

---

## Docker

```bash
# Build and run
docker compose up -d --build

# Data persists in named volume: cancer_card_data
# SQLite file at /data/app.db inside container
# Health check: wget localhost:3000 every 30s
```

---

## Known Gotchas

1. **Middleware cannot import Node.js modules** — Use `getToken` from `next-auth/jwt` instead of `auth()` in middleware
2. **Zod v4 uses `.issues` not `.errors`** — `parsed.error.issues[0].message`
3. **useSearchParams needs Suspense** — Wrap pages using it in a `<Suspense>` boundary
4. **Never import db in client components** — Use `badge-definitions.ts` (client-safe) not `badges.ts` (server-only)
5. **Tailwind v4** — Design tokens go in `globals.css` under `@theme inline {}`, not in a config file
6. **better-sqlite3** — Needs python3, make, g++ in Docker build stage for native compilation
