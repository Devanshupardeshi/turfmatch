# TurfMatch Startup Race Condition — Root Cause & Fix

## Problem Statement

On first install, after long inactivity, or on cold start:
- **Static/location data loads correctly**
- **All database-dependent content fails silently**
- UI shows empty/loading state forever
- App does NOT crash
- **Manual restart fixes it every time**

## Root Cause Analysis (Most Likely → Least Likely)

### 1. MOST LIKELY — Auth Session Race Condition (CONFIRMED)

**The bug**: `AuthProvider.getSession()` is asynchronous. Child components mount
IMMEDIATELY and call `supabase.from(...)` in `useEffect`. At that moment,
the Supabase client has **not yet restored the session from localStorage**.
The JWT token is `null`. All queries hit RLS (Row Level Security) policies
that require `auth.uid() = user_id`. RLS silently returns **empty arrays**.

**Why restart fixes it**: On second launch, the session is warm in memory.
`getSession()` resolves instantly. Queries execute with a valid JWT.

**Why static data works**: Location APIs and static assets don't require auth.

**Evidence**:
- `lib/auth-context.tsx:82-126` calls `getSession()` asynchronously
- `lib/supabase.ts` creates a bare client with no auth storage configuration
- Child components (e.g. `HomeScreen`) call `fetchMatches()` immediately on mount
- `fetchMatches` has no auth readiness barrier

### 2. Network Readiness on Capacitor Cold Start

Android WebView renders before the OS network stack is fully initialized.
DNS resolution may fail for the first 1-3 seconds. Supabase requests time out
or return connection errors. The existing retry logic catches this sometimes,
but not when combined with the auth race.

### 3. OTA Update Timing Conflict

If an OTA update applies on cold start, the bundle swap may happen while
components are mid-render. React doesn't recover gracefully from a bundle
swap during hydration. The safety timer in AuthProvider (10s) could overlap
with OTA initialization.

### 4. Zustand/LocalStorage Hydration Delay

Some stores hydrate from localStorage asynchronously. If a store holds cached
user data, components may read stale `null` values before hydration completes.

### 5. Supabase PostgREST Cold Start

Supabase free-tier PostgREST containers sleep after inactivity. The first
query triggers a cold start that can take 2-5 seconds. The existing `withRetry`
partially addresses this, but without auth readiness, retries also fail.

---

## Fix Architecture

### The Core Fix: Render Blocking

**`AppBootstrapProvider`** sits at the ROOT of the app and blocks ALL rendering
until:
1. Auth session is restored (or known null)
2. Network connectivity is verified
3. OTA update check completes
4. Capacitor native bridge is ready

This is the single most important change. **No component mounts before auth is ready.**

### Supporting Infrastructure

| File | Purpose |
|------|---------|
| `lib/bootstrap/session-manager.ts` | Supabase client with auth storage tracking, `waitForSession()` promise, `onAuthStateChange` attached BEFORE any queries |
| `lib/bootstrap/network-monitor.ts` | Probes real connectivity (not just `navigator.onLine`), retries with exponential backoff |
| `lib/bootstrap/guarded-fetch.ts` | `guardFetch()` — EVERY Supabase query awaits auth+network BEFORE executing |
| `lib/bootstrap/app-bootstrap.tsx` | The render-blocking provider with splash screen, error boundary, and resume handling |
| `lib/bootstrap/startup-logger.ts` | Production-safe startup timeline logging for debugging field issues |

### Changes to Existing Files

| File | Change |
|------|--------|
| `components/turfmatch/app-shell.tsx` | Wrap provider tree with `AppBootstrapProvider` |
| `lib/auth-context.tsx` | Remove own `getSession()` init; use `waitForAuthInit()` from bootstrap |
| `lib/supabase.ts` | Re-export bootstrap client (backward compatible) |
| `lib/turfmatch/supabase-data.ts` | Add `guardedWithRetry` helper; apply to `fetchGrounds`, `fetchPlayers`, `fetchMatches`, `fetchMyCreatedMatches`, `fetchMyJoinedMatches`, `fetchMyPendingRequests`, `fetchNotifications`, `fetchMyInvites` |

---

## Verification Steps

1. **Clean install test**: Uninstall app, reinstall, open. All data should load
   on first launch without requiring a restart.

2. **Long inactivity test**: Close app, wait 24h, reopen. Session should refresh
   automatically and data load.

3. **Airplane mode test**: Open app in airplane mode, then enable wifi.
   App should recover gracefully.

4. **Check logs**: Filter Chrome DevTools / Android Studio logs for `[BOOT]`.
   You should see a clear timeline:
   ```
   [BOOT] [Bootstrap] Starting app initialization sequence...
   [BOOT] [AuthInit] Starting auth hydration...
   [BOOT] [AuthInit] getSession resolved { hasSession: true, userId: "..." }
   [BOOT] [Network] Checking connectivity...
   [BOOT] [Network] Probe success ...
   [BOOT] [Bootstrap] All phases complete — rendering app
   ```

---

## Rollback Plan

If this fix causes issues:
1. Revert `app-shell.tsx` to remove `AppBootstrapProvider` wrapper
2. Revert `lib/auth-context.tsx` to restore its own `getSession()` call
3. `lib/supabase.ts` can stay as a re-export (harmless)
4. `lib/turfmatch/supabase-data.ts` can stay with `guardedWithRetry` (harmless)

---

## Long-term Recommendations

1. **Migrate to Capacitor Preferences** for encrypted auth token storage instead
   of localStorage (prevents token theft on rooted devices).
2. **Add Sentry or LogRocket** for production crash/session tracking.
3. **Implement service worker** for offline-first caching of matches and grounds.
4. **Consider React Query (TanStack Query)** for automatic caching, background
   refetching, and deduplication instead of raw `useEffect` + `fetch`.
