# Coordination Brief: Cancer Card → Logto (for sysadmin / serendipity)

From: Cancer Card session (2026-08-12). To: the agent that owns the Logto deploy at `/docker/logto`.
Context: Troy is standardizing auth org-wide onto the self-hosted Logto, starting with Cancer Card as the FIRST customer-facing app on it. Troy is separately looping CoS on the global-impact/instance-readiness questions. Full plan: `/docker/cancer-card/LOGTO-MIGRATION-PLAN.md`.

This is a coordination request, not a change to your instance. Nothing has been built or deployed. The Cancer Card app-code integration proceeds on a branch in parallel; the prod cutover is gated on this brief coming back resolved.

## What we need from you (Logto owner)

1. **Register a Cancer Card application in the `default` tenant** (end users live in `default`, not `admin`). Type: traditional web app / Next.js (OIDC, server-side session). Redirect URIs:
   - prod: `https://cancer-card.serendipitylabs.cloud/callback`
   - a separate staging/dev app registration so testing never touches the prod app.
   Deliver the app ID + secret into the vault (e.g. `pass insert cancer-card/logto-app-id` and `-app-secret`) rather than plaintext.

2. **Branding / integration-approach input (the open decision).** For a self-hosted Logto, what does the instance support, and what do you recommend:
   - (1) themed hosted sign-in experience (per-app logo, color, custom CSS),
   - (2) custom domain so the sign-in page lives on an app-controlled domain,
   - (3) bring-your-own-UI via the Experience API (full in-app control).
   Cancer Card wants "add a connector later with no app change," which options 1+2 preserve and option 3 breaks. Recommendation sought: is 1+2 (themed hosted page on a custom domain) the house approach, or is there appetite/support for BYO-UI?

3. **Connector roadmap.** Today only the SMTP email connector is live in `default` (email + password + email magic-code). Cancer Card launches on those now and adds the rest as accounts come online. Who provisions, and rough timing for:
   - SMS: Twilio vs AWS SNS (account + creds),
   - Google: Google Cloud OAuth client,
   - Apple: Apple Developer account + Services ID + signing key (has its own approval lead time; needed before the iOS app ships).

4. **Management API access for account deletion.** Cancer Card's delete-account flow will call the Logto Management API (delete the Logto user) via the vaulted M2M client-credentials grant (`logto/mgmt-api-client-id` + `-client-secret`). Confirm that credential is usable for user-deletion scope, and that we should NOT self-authorize off the built-in `m-default` secret (the privilege-escalation boundary noted in the pattern doc).

5. **Instance readiness as the org IdP (Troy is looping CoS; NOT a Cancer Card blocker).** For awareness as this becomes the org front door: `logto-db` backup cadence, capacity, and down/recovery notifications. Flagged so it's on your radar, not gating our cutover.

## What the Cancer Card side owns (so you don't have to)

- App-code integration via `@logto/next` (approach pending decision #2 above).
- JIT-provisioning: link the existing 9 users to Logto by verified email on first login (no password/bcrypt import; the app is dormant since March 2026, so low-risk).
- Roles stay app-side (`card_holder`/`crew_member`/`admin` are per-crew); we are NOT asking for Logto RBAC.
- The app-side DB migration adds a `logto_id` column via the new journal-aware runner already validated on branch `fix/critical-migrations-backups-privacy`.

## Timing

Build proceeds now on a branch. Prod cutover happens during the overnight lull (~1-5 AM ET) with Troy's explicit go, after items 1-4 above are resolved. Item 5 is CoS/sysadmin's track and does not gate the cutover.
