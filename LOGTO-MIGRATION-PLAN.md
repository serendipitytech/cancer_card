# Cancer Card: Auth Migration to Logto

Status: PLAN, pending review and an architecture-review gate before any code ships.
Prepared 2026-08-12. Supersedes the "build a password reset flow" item, which disappears entirely under this plan.

## 1. Why

The current auth is hand-rolled: Auth.js Credentials provider, bcrypt hashes in our own SQLite, JWT sessions with no server-side invalidation, a spoofable IP rate limiter, no email verification, and no self-service password reset (a lost password today means hand-editing the production PII database). That violates the org standard (ENGINEERING_STANDARDS §3, "don't hand-roll auth; Logto per org") and it is the root of five separate architecture-review findings.

Decision (Troy, 2026-08-12): move all auth to the org's self-hosted Logto, per the standing rule. Logto is already live at `auth.serendipitylabs.cloud`, with email magic-code and self-service password reset working, SES email wired, and Management API credentials in the vault (`pass show logto/mgmt-api-*`).

Nuance: the org Logto pattern (`/docker/patterns/auth-standardization-logto.md`) is written for INTERNAL tools gated wholesale by a Traefik forward-auth label. Cancer Card is customer-facing (public signup, in-app roles, per-user owned data), so the forward-auth gate is the wrong shape. This is the "deliberate integration decision" the pattern calls for: a proper OIDC integration where the app owns its own routes and Logto is the identity provider behind them.

## 2. Target state

- Logto is the identity provider. The app no longer stores or verifies passwords.
- Sign-in options offered, all via Logto's hosted sign-in experience: password, email magic-link, SMS, Google, Apple. (Chosen to cover the future App Store native app; Apple sign-in is effectively mandatory for iOS apps that offer other social logins.)
- Next.js App Router integrates via the official `@logto/next` SDK (server-side sessions, App Router support).
- The future Capacitor iOS app uses Logto's native SDK (system webview + PKCE) against the same Logto tenant, so this migration sets up native cleanly rather than blocking it.
- App-side roles stay app-side: `card_holder`, `crew_member`, `admin` remain columns on our `users`/`crew_members` rows, resolved after login. Logto owns identity; we own authorization and product data.

## 3. Integration approach (replaces Auth.js)

1. Register a Logto application (type: Traditional Web / Next.js) in the `default` tenant (NOT `admin`; end users live in `default`). Redirect URIs: `https://cancer-card.serendipitylabs.cloud/callback` and the local dev equivalent.
2. Add `@logto/next`. Configure endpoint (`auth.serendipitylabs.cloud`), appId, appSecret (vaulted), baseUrl, cookieSecret.
3. Replace `src/lib/auth.ts` (Auth.js config) with Logto client helpers: sign-in, sign-out, callback handler route, and a `getUser()` that reads the Logto session server-side.
4. Replace `src/middleware.ts` route protection with a Logto session check.
5. Replace the custom `/login` and `/signup` pages: the primary action becomes "continue" which redirects to Logto's hosted sign-in (which itself presents all connectors and its own signup). Keep our warm branded landing/marketing shell around it.
6. JIT provisioning: on first authenticated callback, look up our `users` row by the verified email from the Logto claims. If found, link it (store the Logto `sub`); if not, create the app-side user row. This is how the existing 9 users are migrated with zero password work: they sign in by magic-link/social/password-via-Logto, and their existing data links by email.
7. Remove login rate-limiting, bcrypt, and password fields from our code paths once cutover is verified (Logto owns brute-force protection and lockout).

## 4. Data model changes

- `users`: add `logto_id TEXT UNIQUE` (the Logto `sub`), nullable during transition, populated on first login. Keep `email` (the migration join key).
- `users.password_hash`: keep the column nullable through cutover, then drop in a follow-up migration once no code reads it. (Every schema change now rides the new journal-aware migration runner shipped on branch `fix/critical-migrations-backups-privacy`, so this will actually apply to prod, unlike before.)
- No changes to crews, tasks, bids, milestones, etc. Authorization keys off the app user row as it does today.

## 5. Account deletion (folds in here)

Decision (Troy): when a Card Holder deletes their account, ANONYMIZE rather than cascade-delete, so crew members are not orphaned, and NOTIFY the crew with an offer to delete their own account too.

- Anonymize the app-side `users` row (scrub name, email, phone; blank `logto_id`); preserve crew and activity history under an anonymized display ("A former Card Holder").
- Delete the user in Logto via the Management API (OIDC client-credentials grant against the vaulted M2M credential; never extract the built-in `m-default` secret, that is a privilege-escalation boundary flagged in the pattern doc).
- Emit a crew notification: "Your Card Holder has closed their account. Would you like to delete your account as well?" with a one-tap deletion path for each crew member.
- Expose this as a self-service action in the (not-yet-built) Settings hub, plus honor manual "delete my data" requests in the interim.

## 6. Connector setup checklist (Logto admin console, `default` tenant)

- [x] Email (magic-code / verification): live per the pattern doc (SES SMTP).
- [ ] Password: enable in sign-in experience.
- [ ] SMS: needs an SMS provider connector (Twilio or AWS SNS) plus credentials. Decision + account needed.
- [ ] Google: needs Google OAuth client credentials (Google Cloud console).
- [ ] Apple: needs an Apple Developer account, a Services ID, and a signing key. Required before the iOS app ships if any social login is offered.
- [ ] Branding: name the app "The Cancer Card" over the shared Serendipity brand shell (per-app branding, per the pattern).

## 7. Rollout

1. All work on a branch, never straight to prod (org rule for any new/changed auth).
2. Register a SECOND Logto app for staging/local so testing never touches the prod app registration.
3. Test matrix: new signup via each connector; existing-user link-by-email; role resolution (card_holder vs crew_member vs admin); protected-route redirects; sign-out; account deletion (Logto + app anonymize + crew notify) against a COPY of the prod DB, same discipline as the migration runner test.
4. Back up the prod DB (the runner does this automatically on the deploy that adds `logto_id`).
5. Cutover during the overnight lull (~1-5 AM ET), not business hours. State the UTC + Eastern clock and get Troy's go.
6. Rollback: the previous image (with Auth.js) is one `docker compose` redeploy away; the additive `logto_id` column is backward-compatible, so a revert does not require a down-migration.

## 8. Blast radius and risks

- This is the highest-consequence change in the whole workup: auth, on a live app with 9 real users. It gets the top model and an architecture-review pass before prod (org rule §1/§12).
- The 9 existing users cannot have bcrypt hashes imported into Logto. Mitigation: they authenticate via magic-link/social/or a Logto-side password reset; data links by verified email. Communicate the change to the real crew before cutover.
- Email deliverability matters more now (magic-link is a primary path). SES is already wired in Logto; verify sending against the real users' domains (Gmail/AOL/Hotmail are in the current data).
- Session cutover invalidates existing app sessions; users re-authenticate once. Acceptable, communicate it.

## 9. What is needed from Troy

- Logto app registration details / who creates the `default`-tenant app (may hand to the `sysadmin` or `serendipity` agent that owns the Logto deployment).
- SMS provider choice (Twilio vs SNS) and account.
- Google OAuth credentials, and an Apple Developer account for Apple sign-in.
- Confirmation on communicating the auth change to the existing real crew before cutover.

## 10. Effort

Rough: the Next.js/Logto integration and JIT provisioning is a few focused days. Connector setup (Google/Apple/SMS) is gated on external accounts/credentials, not code. Account deletion is another day on top. Testing and a careful overnight cutover add a day. Call it about one focused week of build plus the external-credential lead time for Apple/Google/SMS.

## 12. Decisions from the grilling session (2026-08-12)

Settled with Troy:
- **Sequence:** Logto ASAP, as the first step of org-wide auth standardization. Not deferred to a Phase 2. CoS/sysadmin loop on the global-impact and instance-readiness questions.
- **Existing users:** preserve and migrate by magic-link (link by verified email, no bcrypt import). The app has been effectively dormant since March 2026 (activity-proxy check on the 9 users), so a cutover interrupts no active sessions and is low-risk.
- **Connectors v1:** launch on what is already live in Logto (email + password + email magic-code). Add SMS, Google, Apple as their external accounts are provisioned. With the hosted sign-in experience this needs no app deploy.
- **Roles:** stay app-side (`card_holder`/`crew_member`/`admin` are per-crew, not global; the schema confirms role is not even on the users table). Logto owns identity, the app owns authorization.
- **Logto ownership:** sysadmin owns the instance; this session owns the Cancer Card app-code integration; coordination brief handed to the sysadmin/serendipity agent.
- **Instance readiness (HA, backup of `logto-db`, down/recovery notifications):** CoS/sysadmin's issue, not a blocker for the Cancer Card cutover.

Resolved by the Logto owner (sysadmin/CoS, 2026-08-12):
- **Integration approach + branding (Q4): DECIDED = Option 1, themed HOSTED sign-in** on `auth.serendipitylabs.cloud`, per-app branding (logo/color/custom CSS), supported on the self-hosted 1.42. Preserves "add a connector later with no app change." Option 2 (custom domain) deferred, not needed for launch. Option 3 (BYO-UI/Experience API) explicitly ruled out (breaks connector-agility, and we would own auth-UI security/maintenance). Build against `@logto/next` + the hosted per-app-branded page.
- **Logto apps registered** in the `default` tenant (both Traditional web / OIDC):
  - prod: app id `p05kwhwquof0pylsvxpni`, redirect `https://cancer-card.serendipitylabs.cloud/callback`, post-logout `https://cancer-card.serendipitylabs.cloud/`. Creds vaulted: `cancer-card/logto-app-id`, `cancer-card/logto-app-secret`.
  - dev: app id `q0h069oj2in6tl00rocm7`, redirect `http://localhost:3000/callback`. Creds vaulted: `cancer-card/logto-dev-app-id`, `cancer-card/logto-dev-app-secret`. (Swap to a real staging domain later; redirect URIs are updatable via the Management API.)
- **Connector roadmap:** launch on email + password + email magic-code (live). Google OAuth provisioned this sprint by the Logto owner (free). SMS (Twilio, already vaulted) deferred post-launch, per-message cost = Troy cost-go. Apple deferred post-launch, needs an Apple Developer account ($99/yr) + Services ID + signing key + approval lead time = Troy cost-go.
- **Account deletion:** the vaulted M2M creds (`logto/mgmt-api-client-id` + `-client-secret`) are confirmed usable for `DELETE /api/users/{id}`. Use that grant; never self-authorize off the built-in `m-default` secret.
- **Instance readiness (org-wide, NOT a Cancer Card blocker):** the Logto owner confirmed `logto-db` is not yet in the nightly S3 backup and there is no uptime/down alerting on `auth.serendipitylabs.cloud`; both are being folded into a sysadmin pass. Capacity is fine.

Still open, to settle DURING the build (now unblocked by the Q4 decision):
- **Session TTL + MFA policy** (Logto-side config), and the **`ADMIN_EMAILS` allowlist fate** (stay app-side vs become a Logto role).

## 11. Sequence with the other critical items

1. DONE: migration-runner fix (branch `fix/critical-migrations-backups-privacy`) — unblocks every schema change below.
2. Privacy policy + terms (drafting in parallel; independent of auth).
3. This Logto migration (centerpiece; plan-then-build, with grilling + architecture-review).
4. Account deletion + crew-notify (builds on the Logto Management API integration from step 3).
5. Backup hardening (WAL-safe logical dump + integrity check) — low priority; nightly volume backup already runs.
