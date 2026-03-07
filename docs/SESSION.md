# Session Notes

## Last Updated: 2026-03-01

## Current Goal
Capacitor iOS wrapper — wrap the existing PWA in a native iOS shell for App Store submission.

## What Was Done This Session

### Capacitor iOS Wrapper (Phase 5b)
Implemented all code cards for the Capacitor integration:

1. **Capacitor 7 + iOS platform** — Installed `@capacitor/core`, `cli`, `ios` + 5 plugins (status-bar, splash-screen, haptics, app, browser). All aligned on v7. Created `capacitor.config.ts` pointing WebView at production server.

2. **WKWebView auth** — Added `WKAppBoundDomains` to `Info.plist` so Auth.js cookies work inside the iOS WebView (bypasses ITP).

3. **Status bar + splash screen** — Created `src/lib/capacitor.ts` init module (light status bar, purple splash auto-hide). Wired into root layout via `src/components/capacitor-init.tsx` (dynamic import in useEffect, SSR-safe).

4. **Haptic feedback** — Created `src/lib/haptics.ts` with platform-guarded wrappers. Wired `impactMedium()` into card flip component.

5. **App lifecycle + external links** — Added foreground listener (dispatches `capacitor:foreground` event), back button handler, and `openExternalUrl()` for in-app browser.

6. **Push token schema extension** — Extended `pushTokens` table with `tokenType` (web/apns/fcm) and `deviceToken` columns. Made `p256dh`/`authKey` nullable. Zod validator uses discriminated union. Migration `0002_keen_vapor.sql` generated.

### Code Review Fixes Applied
- Replaced non-null assertions (`!`) with type-safe discriminated union types in `registerPushToken`
- Fixed haptics SSR safety (lazy `Capacitor.isNativePlatform()` check inside each function, not at module scope)
- Added try/catch to all haptic functions
- Aligned all Capacitor packages to v7 (v8 CLI was mismatched)
- Added clarifying comment on nullable unique index for `deviceToken`

### Environment Fixes
- Added `export LANG=en_US.UTF-8` and `export LC_ALL=en_US.UTF-8` to `~/.zprofile` (CocoaPods/Ruby 3.4 encoding bug)
- Ran `sudo xcodebuild -license accept` and `xcodebuild -runFirstLaunch`
- `npx cap sync ios` completes successfully
- Xcode launches via `npx cap open ios`

## Decisions Made
- Capacitor 7 (not 8) — v8 requires Node 22+, project uses Node 20
- Remote WebView (not local assets) — Next.js SSR can't be statically exported
- Push token schema supports APNs/FCM now, delivery deferred to follow-up

## Files Changed

### Created
- `capacitor.config.ts`
- `out/index.html` (placeholder, gitignored)
- `ios/` (Xcode workspace)
- `src/lib/capacitor.ts`
- `src/lib/haptics.ts`
- `src/components/capacitor-init.tsx`
- `drizzle/0002_keen_vapor.sql`
- `docs/SESSION.md`

### Modified
- `package.json` (8 Capacitor deps)
- `.gitignore` (ios/App/Pods/, ios/App/App/public/)
- `ios/App/App/Info.plist` (WKAppBoundDomains)
- `src/app/layout.tsx` (CapacitorInit component)
- `src/components/cards/card-flip.tsx` (haptic on flip)
- `src/db/schema.ts` (pushTokens: tokenType, deviceToken, nullable p256dh/authKey)
- `src/lib/notification-queries.ts` (type-safe registerPushToken)
- `src/lib/notification-validators.ts` (discriminated union schema)
- `src/app/api/push-tokens/route.ts` (pass data object)
- `ROADMAP.md` (Phase 5b, decision log)
- `CLAUDE.md` (Capacitor section)

## Blockers / Next Steps
- [ ] QA the iOS simulator build — Troy noted issues to work through
- [ ] App icons in Xcode asset catalog (generate from existing 512px icon)
- [ ] Set iOS deployment target to 16.0
- [ ] Enable Push Notifications capability in Xcode
- [ ] Verify login flow, session persistence, SSE, notification bell in WebView
- [ ] Verify haptics on physical device
- [ ] APNs push delivery (follow-up: HTTP/2 client + .p8 key)
- [ ] App Store submission (TestFlight)
