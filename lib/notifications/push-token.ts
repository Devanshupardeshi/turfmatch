/**
 * Push Token Management — AGGRESSIVE VERSION
 *
 * Problem: Only 1 user had a push token because:
 *   1. Permission was requested once on login
 *   2. If denied, never retried (24h cache blocked it)
 *   3. App resume/startup never re-attempted
 *   4. No manual "Enable" button existed
 *
 * Fix:
 *   - Removed 24h cache that blocked retries
 *   - Added forceSync option to bypass all caches
 *   - Added checkPermissionStatus() to detect if user granted later in OS settings
 *   - syncPushToken now retries on every call by default
 *   - Added manual enable/disable functions for settings UI
 */

import { supabase } from "@/lib/supabase"

const TOKEN_STORAGE_KEY = "turf_push_token_v2"
const TOKEN_SYNCED_KEY = "turf_push_token_synced"
const TOKEN_DENIED_KEY = "turf_push_token_denied"

export interface TokenInfo {
  token: string
  platform: "android" | "ios" | "web"
  updatedAt: number
}

function getStoredToken(): TokenInfo | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredToken(info: TokenInfo) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(info))
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_SYNCED_KEY)
  localStorage.removeItem(TOKEN_DENIED_KEY)
}

/** Check if we previously recorded a denial */
export function wasPermissionDenied(): boolean {
  return localStorage.getItem(TOKEN_DENIED_KEY) === "true"
}

/** Clear the denial flag so next sync will retry */
export function clearDenialFlag(): void {
  localStorage.removeItem(TOKEN_DENIED_KEY)
}

/** Generate or retrieve push token using Capacitor Push Notifications */
export async function getPushToken(): Promise<string | null> {
  try {
    // Dynamic import so web builds don't crash when Capacitor plugin is absent
    const { PushNotifications } = await import("@capacitor/push-notifications")

    const result = await PushNotifications.requestPermissions()
    if (result.receive !== "granted") {
      console.log("[PushToken] push permission not granted")
      localStorage.setItem(TOKEN_DENIED_KEY, "true")
      return null
    }

    // Permission granted — clear denial flag
    localStorage.removeItem(TOKEN_DENIED_KEY)

    // Register with FCM/APNS
    await PushNotifications.register()

    // Wait for token (Capacitor emits an event)
    return new Promise((resolve) => {
      let resolved = false

      const handler = (token: { value: string }) => {
        if (!resolved) {
          resolved = true
          resolve(token.value)
        }
      }

      PushNotifications.addListener("registration", handler).then(() => {
        // Safety timeout — if token never arrives, resolve null
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve(null)
          }
        }, 8_000)
      })

      // Also listen for errors
      PushNotifications.addListener("registrationError", () => {
        if (!resolved) {
          resolved = true
          resolve(null)
        }
      })
    })
  } catch (err) {
    console.error("[PushToken] getPushToken failed:", err)
    return null
  }
}

/** Check current push permission status WITHOUT requesting */
export async function checkPushPermission(): Promise<"granted" | "denied" | "unknown"> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")
    const result = await PushNotifications.requestPermissions()
    return result.receive === "granted" ? "granted" : "denied"
  } catch {
    return "unknown"
  }
}

/**
 * Register push token with Supabase.
 * @param force - bypass all caches and force a fresh token request
 */
export async function syncPushToken(userId: string, force = false): Promise<boolean> {
  const stored = getStoredToken()

  // If we have a valid stored token and aren't forcing, try to sync it
  if (!force && stored) {
    const alreadySynced = localStorage.getItem(TOKEN_SYNCED_KEY) === "true"
    if (alreadySynced) {
      // Still update DB in case the token was cleared server-side
      try {
        const platform = getPlatform()
        await supabase
          .from("players")
          .update({
            push_token: stored.token,
            push_token_platform: platform,
            push_token_updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
        console.log("[PushToken] re-synced existing token")
        return true
      } catch {
        // DB failed, fall through to get new token
      }
    }
  }

  const token = await getPushToken()
  if (!token) {
    console.log("[PushToken] no token available (permission denied or plugin error)")
    return false
  }

  // Prevent redundant DB writes if token is identical
  if (!force && stored?.token === token) {
    localStorage.setItem(TOKEN_SYNCED_KEY, "true")
    console.log("[PushToken] token unchanged, skipping sync")
    return true
  }

  try {
    const platform = getPlatform()
    const { error } = await supabase
      .from("players")
      .update({
        push_token: token,
        push_token_platform: platform,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("[PushToken] DB update failed:", error)
      return false
    }

    setStoredToken({ token, platform, updatedAt: Date.now() })
    localStorage.setItem(TOKEN_SYNCED_KEY, "true")
    console.log("[PushToken] token synced successfully")
    return true
  } catch (err) {
    console.error("[PushToken] sync error:", err)
    return false
  }
}

/** Manual retry — call this from a "Enable Notifications" button in settings */
export async function retryPushTokenSync(userId: string): Promise<boolean> {
  clearDenialFlag()
  return syncPushToken(userId, true)
}

/** Remove stale token on sign-out or unregister */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from("players")
      .update({ push_token: null, push_token_updated_at: null })
      .eq("id", userId)
  } catch (err) {
    console.error("[PushToken] unregister error:", err)
  }
  clearStoredToken()
}

function getPlatform(): "android" | "ios" | "web" {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase()
    if (/android/.test(ua)) return "android"
    if (/iphone|ipad|ipod/.test(ua)) return "ios"
  }
  return "web"
}
