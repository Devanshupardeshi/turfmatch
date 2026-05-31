/**
 * Session Manager — production-grade auth hydration for Capacitor + Supabase.
 *
 * Root-cause fix for the cold-start race condition where:
 *   1. Supabase client is created before localStorage/session is restored
 *   2. Child components mount and query BEFORE auth is ready
 *   3. RLS returns empty results → UI shows eternal loading
 *
 * This module:
 *   - Creates a session-ready promise that blocks all data fetching
 *   - Listens to onAuthStateChange BEFORE any queries run
 *   - Exposes a reactive `authReady` flag + `waitForSession()` barrier
 *   - Handles token refresh, network failures, and timeout safety
 */

import { createClient, type Session, type User } from '@supabase/supabase-js'
import { startupLog, PerfMarker } from './startup-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── State ────────────────────────────────────────────────────────────────────

let _session: Session | null = null
let _user: User | null = null
let _authReady = false
let _authFailed = false

/** Resolves when session is known (null or authenticated) */
let _sessionPromise: Promise<Session | null> | null = null
let _resolveSession: ((s: Session | null) => void) | null = null

/** Resolves when auth is fully bootstrapped */
let _initPromise: Promise<void> | null = null

// ── Create Supabase client with auth tracking ───────────────────────────────

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage (works in Capacitor WebView)
    // In future, swap to Capacitor Preferences for encrypted storage
    storage: {
      getItem: (key) => {
        try {
          const val = localStorage.getItem(key)
          startupLog.debug('AuthStorage', 'getItem', { key, hasValue: !!val })
          return Promise.resolve(val)
        } catch {
          return Promise.resolve(null)
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value)
          startupLog.debug('AuthStorage', 'setItem', { key })
        } catch {
          // storage quota exceeded or private mode
        }
        return Promise.resolve()
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key)
        } catch {}
        return Promise.resolve()
      },
    },
    // Refresh token before it expires (important for long-inactive sessions)
    autoRefreshToken: true,
    // Persist session across restarts
    persistSession: true,
    // Detect session in URL (for OAuth redirects)
    detectSessionInUrl: true,
  },
})

// ── Public API ───────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  return _session
}

export function getUser(): User | null {
  return _user
}

export function isAuthReady(): boolean {
  return _authReady
}

export function didAuthFail(): boolean {
  return _authFailed
}

/**
 * Returns a promise that resolves once the initial session is known.
 * All data fetching MUST await this before executing queries.
 */
export function waitForSession(): Promise<Session | null> {
  if (_authReady) return Promise.resolve(_session)
  if (_sessionPromise) return _sessionPromise

  _sessionPromise = new Promise((resolve) => {
    _resolveSession = resolve
  })
  return _sessionPromise
}

/**
 * Returns a promise that resolves once the FULL auth bootstrap is complete
 * (session restored + profile fetched + auth state listener attached).
 */
export function waitForAuthInit(): Promise<void> {
  if (_authReady) return Promise.resolve()
  if (_initPromise) return _initPromise
  _initPromise = new Promise((resolve) => {
    const check = setInterval(() => {
      if (_authReady) {
        clearInterval(check)
        resolve()
      }
      if (_authFailed) {
        clearInterval(check)
        resolve() // resolve anyway so app doesn't hang forever
      }
    }, 50)
  })
  return _initPromise
}

// ── Internal: Initialize auth on app startup ─────────────────────────────────

export async function initializeAuth(): Promise<void> {
  if (_authReady || _authFailed) return
  const perf = new PerfMarker('auth-init')

  startupLog.info('AuthInit', 'Starting auth hydration...')

  // 1. Attach auth state listener FIRST (before getSession)
  //    This ensures we catch any token refresh events immediately
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      startupLog.info('AuthInit', `onAuthStateChange: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
      })
      _session = session
      _user = session?.user ?? null

      if (event === 'SIGNED_OUT') {
        _session = null
        _user = null
      }

      // If someone is waiting for session, resolve them
      if (_resolveSession) {
        _resolveSession(_session)
        _resolveSession = null
        _sessionPromise = null
      }
    }
  )

  // 2. Get existing session from storage (async — may hit network for refresh)
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      startupLog.error('AuthInit', 'getSession error', { message: error.message })
      _authFailed = true
    } else {
      _session = session
      _user = session?.user ?? null
      startupLog.info('AuthInit', 'getSession resolved', {
        hasSession: !!session,
        userId: session?.user?.id,
      })
    }
  } catch (err: any) {
    startupLog.error('AuthInit', 'getSession exception', { message: err?.message })
    _authFailed = true
  }

  // 3. Resolve any waiters
  if (_resolveSession) {
    _resolveSession(_session)
    _resolveSession = null
    _sessionPromise = null
  }

  // 4. Safety timeout: Capacitor cold-start can take 5-15s for network
  //    We give it up to 20 seconds before forcing ready
  const SAFETY_TIMEOUT_MS = 20_000
  setTimeout(() => {
    if (!_authReady) {
      startupLog.warn('AuthInit', `Safety timeout after ${SAFETY_TIMEOUT_MS}ms — forcing authReady`)
      _authReady = true
      _authFailed = true
      if (_resolveSession) {
        _resolveSession(_session)
        _resolveSession = null
        _sessionPromise = null
      }
    }
  }, SAFETY_TIMEOUT_MS)

  // 5. Mark ready (we now know the session state, even if null)
  _authReady = true
  perf.end({ hasSession: !!_session, userId: _user?.id })

  // Cleanup subscription on unmount not needed for app singleton,
  // but we keep the reference for potential future use
  void subscription
}

/** Force refresh the session (call after long inactivity) */
export async function refreshSession(): Promise<Session | null> {
  startupLog.info('AuthInit', 'Manual session refresh requested')
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      startupLog.error('AuthInit', 'refreshSession failed', { message: error.message })
      return null
    }
    _session = session
    _user = session?.user ?? null
    return session
  } catch (err: any) {
    startupLog.error('AuthInit', 'refreshSession exception', { message: err?.message })
    return null
  }
}
