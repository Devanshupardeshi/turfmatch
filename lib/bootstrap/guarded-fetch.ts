/**
 * Guarded Fetch — the critical barrier that prevents the race condition.
 *
 * Before ANY Supabase query runs, this wrapper:
 *   1. Waits for auth session to be restored (or known null)
 *   2. Waits for network connectivity probe
 *   3. Executes the query
 *   4. Retries on network errors with exponential backoff
 *   5. Logs diagnostics for debugging
 *
 * Usage: Replace direct `supabase.from(...)` calls with `guardFetch(...)`
 */

import { waitForSession, getSession, supabase } from './session-manager'
import { waitForNetwork, withNetworkRetry } from './network-monitor'
import { startupLog, PerfMarker } from './startup-logger'

interface GuardFetchOptions {
  /** Descriptive label for logs */
  label: string
  /** How many retries on failure */
  maxRetries?: number
  /** Whether to require an authenticated session (default: true) */
  requireAuth?: boolean
  /** Extra delay after auth ready before fetching (ms) */
  settleDelayMs?: number
}

/**
 * Execute a Supabase query ONLY after auth and network are ready.
 *
 * @example
 * const { data, error } = await guardFetch(
 *   () => supabase.from("matches").select("*"),
 *   { label: "fetchMatches" }
 * )
 */
export async function guardFetch<T>(
  queryFn: () => Promise<T>,
  options: GuardFetchOptions
): Promise<T> {
  const { label, maxRetries = 2, requireAuth = true, settleDelayMs = 0 } = options
  const perf = new PerfMarker(`fetch-${label}`)

  startupLog.info('Fetch', `[${label}] Starting guarded fetch...`)

  // ── Step 1: Wait for auth ──────────────────────────────────────────────────
  if (requireAuth) {
    const session = await waitForSession()
    startupLog.info('Fetch', `[${label}] Auth resolved`, {
      authenticated: !!session,
      userId: session?.user?.id,
    })

    // Optional: small settle delay to let auth headers propagate in Supabase client
    if (settleDelayMs > 0) {
      await new Promise((r) => setTimeout(r, settleDelayMs))
    }

    // If session is null and we require auth, still attempt the fetch.
    // RLS will simply return empty results. The caller handles empty state.
    if (!session) {
      startupLog.warn('Fetch', `[${label}] No session — query may return empty (RLS)`)
    }
  }

  // ── Step 2: Wait for network ───────────────────────────────────────────────
  const connected = await waitForNetwork()
  startupLog.info('Fetch', `[${label}] Network ready = ${connected}`)

  // ── Step 3: Execute with retry ─────────────────────────────────────────────
  try {
    const result = await withNetworkRetry(queryFn, {
      maxRetries,
      baseDelayMs: 1000,
      label,
    })
    perf.end({ success: true })
    return result
  } catch (err: any) {
    startupLog.error('Fetch', `[${label}] Failed after all retries`, {
      error: err?.message,
      code: err?.code,
    })
    perf.end({ success: false, error: err?.message })
    throw err
  }
}

/**
 * Convenience wrapper for common Supabase query patterns.
 * Automatically applies guardFetch with standard options.
 */
export function createGuardedQuery(label: string, requireAuth = true) {
  return <T>(queryFn: () => Promise<T>): Promise<T> =>
    guardFetch(queryFn, { label, requireAuth, maxRetries: 2 })
}

// Pre-built guards for common entities
export const queryGrounds = createGuardedQuery('fetchGrounds', true)
export const queryPlayers = createGuardedQuery('fetchPlayers', true)
export const queryMatches = createGuardedQuery('fetchMatches', true)
export const queryMyMatches = createGuardedQuery('fetchMyMatches', true)
export const queryNotifications = createGuardedQuery('fetchNotifications', true)
export const queryChat = createGuardedQuery('fetchChat', true)

// For public/unauthenticated queries (no RLS)
export const queryPublic = createGuardedQuery('public', false)
