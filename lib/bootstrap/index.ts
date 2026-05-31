/**
 * Bootstrap System — public API exports.
 *
 * Import from here instead of individual files:
 *   import { waitForSession, guardFetch, AppBootstrapProvider } from "@/lib/bootstrap"
 */

export { AppBootstrapProvider, useAppBootstrap } from './app-bootstrap'
export { waitForSession, waitForAuthInit, getSession, getUser, isAuthReady, refreshSession, supabase } from './session-manager'
export { waitForNetwork, isNetworkReady, withNetworkRetry } from './network-monitor'
export { guardFetch, createGuardedQuery, queryGrounds, queryPlayers, queryMatches, queryMyMatches, queryNotifications, queryChat, queryPublic } from './guarded-fetch'
export { startupLog, PerfMarker } from './startup-logger'
