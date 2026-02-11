# The Cancer Card - Roadmap

## Legend
- **Status:** `done` | `next` | `planned` | `future`
- **Priority:** `P0` (critical) | `P1` (high) | `P2` (medium) | `P3` (nice-to-have)

---

## Phase 0: MVP Foundation (DONE)

> All core features built. Build compiles. Ready for testing.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 0.1 | Project scaffolding (Next.js 16, Tailwind v4, TypeScript) | done | |
| 0.2 | SQLite database + Drizzle ORM (9 tables, WAL mode) | done | |
| 0.3 | Auth system (password login, JWT sessions, middleware) | done | |
| 0.4 | Design system (UI components, card motif, animations) | done | 13 components |
| 0.5 | Crew creation + invite code join | done | |
| 0.6 | Task menu with 31 default templates (8 categories) | done | |
| 0.7 | Play Card flow (3-step: menu -> mode -> confirm) | done | Direct/Open/Auction |
| 0.8 | Task board with claiming + completion | done | |
| 0.9 | Reverse auction with SSE live bidding | done | |
| 0.10 | Self-care milestone logging + streak bonuses | done | 8 routines seeded |
| 0.11 | Activity feed with SSE realtime updates | done | |
| 0.12 | Leaderboard + badge system (9 badges) | done | |
| 0.13 | Dashboard (Card Holder + Crew Member views) | done | |
| 0.14 | Onboarding flow (create crew / join crew) | done | |
| 0.15 | Docker + docker-compose configuration | done | |
| 0.16 | PWA manifest | done | |

---

## Phase 1: Test, Fix, Launch (DONE)

> First local run, fix bugs, get it deployable.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 1.1 | Run dev server + fix runtime errors | done | P0 | |
| 1.2 | Run database migrations + seed | done | P0 | docker-entrypoint.sh auto-applies |
| 1.3 | Test full signup -> create crew -> play card flow | done | P0 | Tested on production |
| 1.4 | Test crew join flow (invite code) | done | P0 | |
| 1.5 | Test auction bidding with SSE | done | P0 | |
| 1.6 | Test self-care logging + streak bonuses | done | P0 | |
| 1.7 | Generate AUTH_SECRET for production | done | P0 | |
| 1.8 | Set up Resend API key + verified domain | next | P1 | API key set, domain verification TBD |
| 1.9 | Docker build + test locally | done | P1 | |
| 1.10 | Generate PWA icons (192x192, 512x512) | next | P1 | Home screen app icon |
| 1.11 | Deploy to VPS | done | P1 | cancer-card.serendipitylabs.cloud |
| 1.12 | Set up reverse proxy (Traefik/Nginx) | done | P1 | Traefik + Let's Encrypt |
| 1.13 | SQLite backup strategy | next | P2 | Cron job copying db file |

---

## Phase 2: Polish & UX Improvements

> Make it feel great in the hand.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 2.1 | Empty states with personality | planned | P1 | "No tasks yet - your crew is standing by" |
| 2.2 | Loading skeletons on all pages | planned | P1 | Replace any remaining spinners |
| 2.3 | Error boundaries with humor | planned | P1 | "Something went sideways" |
| 2.4 | Pull-to-refresh on mobile | planned | P2 | Native app feel |
| 2.5 | Haptic feedback integration | planned | P2 | Hook exists, wire to interactions |
| 2.6 | Card-playing celebration animation | planned | P2 | Confetti/fanfare on "Play Card" |
| 2.7 | Auction countdown timer | planned | P1 | Visual timer on auction tasks |
| 2.8 | Toast notifications for SSE events | planned | P1 | Real-time toasts when feed updates |
| 2.9 | Keyboard shortcuts for desktop | planned | P3 | Power users |
| 2.10 | Dark mode | planned | P3 | Design tokens already in CSS vars |

---

## Phase 3: Settings & Crew Management

> Card Holder controls and crew administration.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 3.1 | Settings hub page | planned | P1 | Central settings access |
| 3.2 | Profile editing (name, avatar) | planned | P1 | |
| 3.3 | Crew settings (rename, point defaults) | planned | P1 | Card Holder only |
| 3.4 | Task menu customization UI | planned | P1 | Add/edit/remove templates, adjust points |
| 3.5 | Self-care routine customization UI | planned | P1 | Card Holder adds custom routines |
| 3.6 | Crew member management (roles, remove) | planned | P2 | Admin/Card Holder only |
| 3.7 | Share invite via native share API | planned | P2 | Copy link + SMS/WhatsApp/etc. |
| 3.8 | Password change | planned | P2 | |
| 3.9 | Account deletion | planned | P2 | GDPR-friendly |

---

## Phase 4: Notifications & Email

> Keep the crew engaged and informed.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 4.1 | Email on task assigned (Direct mode) | planned | P1 | Via Resend |
| 4.2 | Email on task claimed | planned | P1 | Card Holder gets notified |
| 4.3 | Email on auction ending soon | planned | P2 | 15 min warning |
| 4.4 | Email digest (daily/weekly summary) | planned | P3 | Opt-in per user |
| 4.5 | Push notifications (PWA) | planned | P2 | Service worker + Web Push API |
| 4.6 | Notification preferences page | planned | P2 | Per-type opt-in/out |
| 4.7 | In-app notification bell + unread count | planned | P1 | Header badge |

---

## Phase 5: PWA & Offline

> True app-like experience.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 5.1 | Service worker (Serwist/next-pwa) | planned | P1 | Cache app shell |
| 5.2 | Offline page | planned | P1 | "You're offline, but still brave" |
| 5.3 | Offline milestone logging (queue + sync) | planned | P2 | Most common offline action |
| 5.4 | Install prompt UI | planned | P2 | Custom "Add to Home Screen" |
| 5.5 | PWA splash screens | planned | P3 | iOS + Android |
| 5.6 | App badge (unread count on icon) | planned | P3 | Navigator.setAppBadge() |

---

## Phase 6: Advanced Features

> Deeper engagement and gamification.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 6.1 | Custom badge creation (Card Holder) | planned | P2 | Create crew-specific badges |
| 6.2 | Task comments/updates thread | planned | P2 | "I'm on my way" / "Running late" |
| 6.3 | Task photos (before/after) | planned | P3 | Proof of completion |
| 6.4 | Recurring tasks | planned | P2 | "Bring dinner every Tuesday" |
| 6.5 | Task categories analytics | planned | P3 | What help is requested most |
| 6.6 | Mood tracking (for Card Holder) | planned | P3 | Optional, private |
| 6.7 | Calendar view for scheduled tasks | planned | P3 | Week/month view |
| 6.8 | Export data (CSV/PDF) | planned | P3 | Treatment journey recap |

---

## Phase 7: Multi-Crew & Scaling

> Support multiple patients and larger crews.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 7.1 | Crew member on multiple crews | future | P2 | User already deferred this |
| 7.2 | Multiple crews per Card Holder | future | P3 | User already deferred this |
| 7.3 | Crew switching UI | future | P2 | Dropdown/picker in header |
| 7.4 | Cross-crew leaderboard | future | P3 | For crew members helping multiple patients |
| 7.5 | Crew templates ("Family", "Friends", "Neighbors") | future | P3 | Pre-built role suggestions |

---

## Phase 8: Growth & Community

> Beyond the core crew.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 8.1 | Onboarding tour/walkthrough | done | P2 | Dashboard spotlight tour + Quick Start Guide |
| 8.2 | "Cancer Card" shareable image generator | future | P3 | Social media sharing |
| 8.3 | Anonymous crew member option | future | P3 | Community/church helpers |
| 8.4 | Caregiver resources & tips | future | P3 | Curated content |
| 8.5 | Integration: Google Calendar sync | future | P3 | Task due dates on calendar |
| 8.6 | Integration: Meal train services | future | P3 | Meal delivery coordination |
| 8.7 | Multiple language support (i18n) | future | P3 | |

---

## Phase 9: Testing & Quality

> Build confidence in the codebase.

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| 9.1 | Unit tests for lib/ (points, streaks, badges) | planned | P1 | Vitest |
| 9.2 | API route integration tests | planned | P1 | |
| 9.3 | E2E tests for critical flows | planned | P2 | Playwright |
| 9.4 | Accessibility audit (a11y) | planned | P2 | WCAG 2.1 AA |
| 9.5 | Performance audit (Lighthouse) | planned | P2 | Target 90+ |
| 9.6 | Security audit (auth, input validation) | planned | P1 | Rate limiting, CSRF |

---

## Infrastructure & Operations

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| I.1 | Automated SQLite backups (cron) | planned | P1 | Copy db to backup volume |
| I.2 | Health check monitoring | planned | P2 | Uptime alerts |
| I.3 | Error logging (Sentry or similar) | planned | P2 | |
| I.4 | Rate limiting on API endpoints | planned | P1 | Prevent abuse |
| I.5 | HTTPS via reverse proxy | done | P0 | Traefik + Let's Encrypt |
| I.6 | CI/CD pipeline | future | P3 | GitHub Actions → Docker build → deploy |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-02-10 | SQLite over Supabase/Postgres | Simpler ops, single VPS, no cloud dependency |
| 2025-02-10 | Password auth over magic link | MVP simplicity, no email service needed for auth |
| 2025-02-10 | SSE over WebSocket | Simpler, works through proxies, sufficient for crew sizes |
| 2025-02-10 | JWT over database sessions | No session table needed, works with SQLite single-writer |
| 2025-02-10 | Negative balance allowed | Patient shouldn't be blocked from asking for help |
| 2025-02-10 | Single crew per patient (MVP) | Multi-crew deferred to Phase 7 |
| 2025-02-10 | Resend for email | User preference, good DX, generous free tier |
| 2025-02-10 | Drizzle over Prisma | Better SQLite support, lighter, no codegen step |
| 2025-02-10 | Port 3000 | No conflicts with existing local services |
| 2026-02-10 | docker-compose.yml gitignored | Server-specific Traefik config; example file committed as template |
| 2026-02-10 | Auto-migration via entrypoint | docker-entrypoint.sh applies Drizzle SQL on fresh databases |
| 2026-02-10 | trustHost + secureCookie | Required for Auth.js behind HTTPS reverse proxy |
