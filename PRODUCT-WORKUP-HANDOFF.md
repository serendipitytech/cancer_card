# The Cancer Card: Product Workup and Handoff

Prepared 2026-08-11 as a read-only investigation to seed a dedicated revival session. This doc stands alone: everything a fresh session needs to pick up the work is here.

---

## 1. Product Summary

**What it is:** A mobile-first PWA (plus a native iOS wrapper) that gamifies asking for help during cancer treatment. The patient ("Card Holder") builds a support "Crew" of friends and family, then "plays cards," point-costed task requests, to ask for specific help (meals, rides, errands, company). Crew members claim and complete tasks. The patient earns points back by logging self-care (rest, hydration, a walk, a good meal) and by hitting streaks.

**Three request modes:**
- **Direct assignment**: ask a specific crew member
- **Open bucket**: post it, anyone claims it
- **Reverse auction**: crew members bid to help, live via SSE, patient (or auto-close logic) picks the winner

**Who it's for:** Primary user is the cancer patient (Card Holder). Secondary users are the support crew (friends, family, "crew members"). Direct-to-consumer today; the mechanic could extend to nonprofits/hospitals as a licensed tool, or to other chronic-illness communities since nothing about the mechanic is cancer-specific.

**Core value prop:** Every competitor in this space (CaringBridge, Lotsa Helping Hands, MyLifeLine, Caring Village) is a serious, administrative, journaling-and-calendar tool. None of them make the actual *asking* easier or fun. Cancer Card's gamification (points economy, self-care paybacks, reverse-auction competition among helpers) is the differentiator, and per the market research, nobody else in the space is doing it.

**Origin note (relevant to authenticity/marketing):** Per the Phase 0 launch doc, Troy built this because he's personally on a real friend's cancer crew and kept hearing "let me know if you need anything" go nowhere. That's the founder story baked into the GTM material, it's real, not invented positioning.

---

## 2. Technical State

### Stack (confirmed against code, matches prior notes)
- **Next.js 16** (App Router, standalone Docker output), **React 19**, TypeScript strict
- **Auth.js (NextAuth v5 beta)**, credentials provider, **bcryptjs** password hashing, JWT sessions (no DB session table)
- **SQLite via better-sqlite3 + Drizzle ORM**, WAL mode, code-first schema, migrations via drizzle-kit
- **Tailwind CSS v4**, Framer Motion for animation, Zod for all API-boundary validation
- **Resend** for transactional email (working, verified domain, per roadmap)
- **Server-Sent Events (SSE)** for realtime auction/feed/notification updates (no WebSocket infra needed)
- **Capacitor 7** for an iOS native wrapper (WebView pointed at the production server, not a static export)

### What's actually built and working (this is further along than "started and dropped" suggested)
- Full auth flow: signup, login, JWT sessions, middleware-protected routes
- 9-table relational schema: users, crews, crew_members (with role + per-crew stats + badges), tasks, bids, milestones, activity_feed, task_menu_templates, self_care_routines, notification_preferences, notification_log, push_tokens
- Crew creation + invite-code join, **multi-crew support** (a crew member can belong to multiple crews; a patient can run multiple crews), crew switcher UI
- Full "Play Card" flow (menu -> mode -> confirm) across all three request modes, 31 seeded task templates across 8 categories
- Reverse auction with live SSE bidding, countdown, auto-close, manual winner selection
- Self-care milestone logging, streak bonuses (3-day/7-day), 8 seeded self-care routines
- Activity feed (SSE realtime), leaderboard, 9-badge system
- Admin dashboard, gated by an `ADMIN_EMAILS` env allowlist (confirmed in code, disabled entirely if unset)
- In-app notification bell + unread count (SSE), email notifications on task-assigned and task-claimed (Resend, confirmed working)
- A real, dated **security hardening pass** (git log, 2026-02-27): "27 issues fixed: race conditions, auth bypass, CSP, rate limiting, a11y." Rate limiting is live on all 16 API routes (in-memory, per-container, fine for the current single-instance deploy). Security headers are strong in production (see §2 Deployment below, verified live via curl).
- UX polish: empty states, loading skeletons, error boundaries, pull-to-refresh, celebration animations, toast notifications, onboarding tour, accessibility pass, keyboard nav
- Docker deployment, PWA manifest, iOS app icons, Xcode project scaffolded

### What's stubbed, half-built, or explicitly deferred (from ROADMAP.md, all consistent with what I found in code)
- **Settings (Phase 3, all "planned", nothing shipped):** no settings hub, no profile editing, no crew rename/point-default editing, no task-menu customization UI, no self-care routine customization UI, no crew-member role management, **no password change, no account deletion.**
- **Notifications (Phase 4, partial):** email works for 2 of several events; auction-ending-soon email, digest emails, and push delivery (web push + APNs + FCM) are all schema-ready but **delivery is not implemented**. Notification preferences API exists but there's no UI to manage it (waiting on the Settings Hub that doesn't exist yet).
- **PWA/offline (Phase 5, none shipped):** no service worker, no offline page, no offline queueing, no install-prompt UI. It's a PWA manifest, not an installable/offline-capable app yet.
- **iOS (Phase 5b):** wrapper works but app-icon/Xcode polish is "next" and App Store submission hasn't started; APNs push delivery is planned, not built.
- **Testing (Phase 9): zero automated tests.** No unit tests, no API integration tests, no E2E, no accessibility audit, no Lighthouse pass. All "planned." This is a real gap for anything sold to a paying customer or a nonprofit/hospital partner.
- **Ops:** no CI/CD (manual/webhook-triggered deploy only, see below), no error monitoring (Sentry or similar) despite it being on the roadmap, no uptime/health alerting.

### Data model
9 tables, relational, sensible normalization (see `src/db/schema.ts`). Worth flagging: `notification_log`, `push_tokens`, and `crew_members.stats/badges` (JSON columns) show real design maturity, this wasn't a weekend hack. Points can go negative by design (a documented product decision: patients shouldn't be blocked from asking for help).

### Auth mechanism (confirmed by reading `src/lib/auth.ts`)
Credentials provider, Zod-validated input, IP-based rate limiting on login attempts (10 per 15 min), bcrypt password comparison, JWT session strategy, `trustHost: true` (required behind the Traefik reverse proxy). This is a reasonable hand-rolled implementation for its scope, but it is still hand-rolled: no magic-link/passwordless option, no MFA, no password-reset flow visible in the routes list (the "hand-edit the bcrypt hash via better-sqlite3" history checks out: there's no self-service password reset built, so a lost password today still requires a manual DB edit).

### Deployment reality
- **Live and public:** `https://cancer-card.serendipitylabs.cloud`, confirmed reachable right now (curl returned `307` to `/login`, which is the correct unauthenticated behavior).
- Traefik labels route it correctly, TLS via Let's Encrypt (`mytlschallenge` resolver), `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a real `Content-Security-Policy`, and `Permissions-Policy` are all present on the live response, confirmed by curl, not just claimed in the compose file.
- Container `cancer-card` has been up and healthy for 2+ weeks (last restart 2026-07-22), health check passing every 30s.
- **Auto-deploy pipeline exists but is not source-controlled:** `webhook_listener.py` (root-owned process, running on port 9867, HMAC-verifies GitHub push signatures, triggers `deploy.sh` on push to `main`) and `deploy.sh` itself are both **untracked in git** (`git status` shows them as untracked files). If this VPS state is lost, the deploy automation is lost with it. Low urgency, but worth a `git add` at minimum during the revival sprint.
- `data/` in the repo is an empty placeholder (`.gitkeep` only); real data lives in the Docker named volume `cancer_card_data`, correctly excluded from git.
- Local `.env` is correctly gitignored and was never committed (checked `git log --all -- .env`: no history).

### Data reality: this is NOT a demo instance
Queried the live SQLite DB directly (read-only `SELECT`, no writes made): **9 real user accounts, 3 real crews, 3 real tasks.** The names and emails are real people (a mix that reads like a real friend group, not test fixtures, e.g. one nickname entry, several full names, a couple of Gmail/AOL/Hotmail addresses, plus one `+test` throwaway). This lines up exactly with the Phase 0 marketing doc's founder story: Troy is personally a crew member on a real friend's real cancer-support crew, and this looks like that crew's actual data, live, in production, right now.

**Backups:** `/docker/backups/cancer-card` contains exactly one snapshot, dated 2026-03-07, over five months stale. The roadmap lists "automated SQLite backups (cron)" as `planned`, not done. There is real, live, health-adjacent personal data sitting in a single SQLite file in a single Docker volume with no confirmed recent backup.

---

## 3. Security and Privacy Flags (worth Troy's attention now, not just at revival time)

1. **Real health-adjacent PII is live in production with no privacy policy, no terms of service, and no account-deletion capability.** I found no `/privacy` or `/terms` route anywhere in the app, and Phase 3 (which would add account deletion) is entirely unbuilt. This isn't necessarily a fire, but if this crew is actively using it, there's currently no way for a user to request their data be deleted, and no policy document telling them what happens to it.
2. **No self-service password reset.** Confirmed: matches the prior note about hand-editing bcrypt hashes. Fine for a single friend crew, not fine for anything sold to a second customer.
3. **No automated backups running against real data**, despite real data being in use. Last backup is 5+ months old.
4. **Health-data sensitivity, not formally assessed.** This product is squarely "health-adjacent" (cancer treatment support, self-care logging, crew visibility into a patient's requests). It is not built to any HIPAA-flavored standard (no BAA-readiness, no encryption-at-rest verification done here, no access-logging/audit-trail beyond the activity feed). That's completely fine for consumer D2C use, but it's a hard stop for the "B2B2C licensed to hospitals/nonprofits" expansion path mentioned in the prospectus, until it's assessed and very likely re-architected for that tier.
5. **Deploy automation (`webhook_listener.py`, `deploy.sh`) is untracked in git**, running as a root-owned long-lived process outside version control. Low severity, but it's an ops blind spot.
6. Positives worth noting, so the next session doesn't waste time re-litigating them: rate limiting is real and on every API route, security headers are genuinely strong in production, secrets management (`.env` gitignored, never committed) is clean, and the 2026-02-27 security hardening pass looks like it was a real, thorough effort (race conditions, auth bypass, CSP, a11y).

**None of this blocks a lean consumer relaunch.** It does mean: before inviting a second real crew onto this instance, and definitely before pitching a hospital or nonprofit, there needs to be a privacy policy, a data-deletion path, and a backup cadence for the DB that already has real people's information in it.

---

## 4. Business / GTM

### Why this is the highest-differentiation product in the catalog
Per the prospectus (`/docker/gtm/serendipity-gtm-prospectus.md`), Cancer Card is #1 on the "Top 5 to sell today" list: highest potential, most press-friendly, most mission-aligned, and (uniquely for this catalog) has a **fully developed GTM package already done**, market research, personas, messaging framework, and a scoped creator-led launch plan, while the product itself is what needs the work. That's inverted from most of the catalog.

### Market research findings (`cancer-card-market-research.md`, Feb 2026, ~750 lines)
- **Competitors:** CaringBridge, Lotsa Helping Hands, MyLifeLine, Caring Village, Meal Train. All are serious/journaling/administrative. None gamify. None make asking for help feel good.
- **Target demographics:** core 45-65, 73% female (patients and caregivers), college-educated skews 2.78x more likely to adopt mHealth apps, spouse/partner caregivers are 73% of the caregiver population.
- **Psychographics:** overwhelmed, guilty about asking repeatedly, isolated, seeking control. Want specific asks, not vague offers ("let me know if you need anything" is explicitly named as the thing patients hate).
- **Acquisition channels ranked:** healthcare professional referrals (#1, oncology offices/patient navigators/social workers), SEO/search (high-intent keywords like "how to help cancer patient"), patient stories/PR, nonprofit partnerships (American Cancer Society, Cancer Support Community, disease-specific orgs), targeted social (Facebook 45-65, Instagram/TikTok younger).
- **What doesn't work:** traditional advertising, generic "health app" positioning, a paid model (patients resist paying while facing medical bills, so **freemium is the stated model**), cold outreach to patients (feels predatory, privacy concerns).
- **Messaging guardrails are detailed and specific:** avoid toxic positivity, avoid warrior/fighter language, avoid false promises, avoid unsolicited medical advice, avoid comparisons, avoid pity. Do: validate emotions, emphasize patient agency/control, be specific over vague, balance honesty with hope, use gentle humor carefully.
- **Positioning line:** "We're the Duolingo of cancer support, CaringBridge meets gamification."

### Marketing plan (`cancer-card-marketing-plan.md`, ~1500 lines)
Bootstrap/organic-first strategy. Four personas built out in detail: the newly diagnosed patient, the devoted caregiver, an oncology professional (referral channel), a nonprofit leader (partnership channel). Phased GTM: healthcare-channel pilots (months 1-6) -> organic/SEO/PR (months 3-12) -> nonprofit partnerships (months 6-18) -> paid acquisition (months 9+).

### Phase 0 creator-led launch plan (`cancer-card-phase0-creator-launch.md`, ~600 lines)
This is the most immediately actionable piece: a $0-200 budget, 4-6 week, one-person-executable plan to get to the first 100 users. Leans entirely on Troy's authentic "I'm a crew member, I built this" story (which is true, per the real production data found above). Five scripted short-form videos, explicitly skips anything requiring a team (no press kits, no influencer outreach, no paid ads beyond an optional $50-100 test).

### Monetization on the table
- **Primary:** direct-to-consumer freemium (free core product, matches market research finding that patients resist paying)
- **Secondary/expansion:** B2B2C, licensed to cancer-support nonprofits, hospital patient-experience programs, oncology social-work teams. This path requires the health-data/compliance work flagged in §3 before it's credible to pitch.
- No concrete price points found in either the marketing plan or the phase-0 doc; monetization is directional (freemium + B2B2C), not priced.

---

## 5. What We Could Build There: Options and Rough Effort

### Option A: Lean relaunch (ship what exists, close the sharpest gaps)
Goal: get to something safe and credible to hand to a second real crew and to start the Phase 0 creator-led launch plan.
- Add a privacy policy + terms page (content, not code, mostly a copy task)
- Self-service password reset (email-based, Resend is already wired)
- Basic account deletion / data export (even a manual "email us" process satisfies the immediate gap; a self-service flow is Phase 3.9 already scoped)
- Automate SQLite backups (cron + off-VPS copy, small script, this VPS already has an S3 backup pattern elsewhere to copy from)
- Settings hub + profile edit (Phase 3.1-3.2, already scoped in the roadmap)
- Smoke-test the core flows manually (signup -> crew -> play card -> claim -> complete; auction bid -> close; self-care log -> streak)
- **Rough effort: 1-2 focused weeks**, most of the hard product work (the actual gameplay loop) is already done; this is cleanup, not a rebuild.

### Option B: Expanded build (chase the B2B2C/nonprofit angle)
Everything in Option A, plus:
- Automated test suite (Phase 9: unit + API integration at minimum, E2E for the critical flows)
- Push notification delivery (web push + APNs), notification digest delivery
- PWA offline support (service worker, offline milestone logging queue)
- A real security/privacy assessment scoped specifically for "health-adjacent data handled by a third party for a nonprofit/hospital," likely with Fable or an outside opinion given the blast radius
- iOS App Store submission
- **Rough effort: 4-8 weeks**, this is a real second phase, not a quick add-on, and the compliance work in particular could expand depending on what a hospital/nonprofit partner actually requires (BAA, audit logging, etc.)

### A third framing worth naming explicitly
The product doesn't have to stay cancer-specific. The prospectus notes "the mechanic isn't cancer-specific," and the market research explicitly names Lotsa Helping Hands as a *generic* caregiving competitor. A chronic-illness-broad reposition (or a white-label crew-coordination product) is a plausible pivot if the cancer-specific vertical proves narrower than hoped, worth a PRD-level conversation, not a code decision, before anything's built toward it.

---

## 6. Open Questions for Troy

1. **Is the live crew data (9 real users) something you want preserved and continued, or reset for a clean relaunch?** This changes whether the revival sprint touches production data at all.
2. **How much of the health-data/compliance work do you actually want before a public relaunch**, given the current use is one real friend's crew, not yet a second paying customer? Is Option A (lean) enough for now, with Option B deferred until an actual nonprofit/hospital conversation is real?
3. **Who owns the actual GTM execution** (the Phase 0 plan is scoped for "you, Troy" specifically, solo creator-led)? Does that still fit given the Serendipity full-time pivot and the 90-day off-ramp context?
4. **Pricing:** freemium is the directional call in the marketing pack, but there's no price point anywhere. Worth deciding early since it shapes what "premium" even means in the product.
5. Should the deploy pipeline (`webhook_listener.py`, `deploy.sh`) get committed to git and folded into the standard container ops pattern, or is the current setup intentionally kept separate?

## Recommended First Moves for the Dedicated Session

1. **Start with a short PRD-style grilling**, not a security pass and not a sprint-scoping session yet. The product concept is validated and the market research is genuinely strong; what's undecided is scope (Option A vs B), audience sequencing (real friend's crew vs new users vs B2B2C), and pricing. Nail that first so the revival sprint has a real target.
2. Once scope is set, **Option A's five items are a concrete, low-risk starting checklist** (privacy/terms copy, password reset, account deletion path, automated backups, settings hub) that de-risk the "real PII, no policy, no backups" gap regardless of which direction Troy picks.
3. If there's any real appetite for the nonprofit/hospital angle, loop in an architecture-review-caliber security pass (per this project's own standards: high-consequence/data-sensitive work gets the top model) before any external pitch, not after.
