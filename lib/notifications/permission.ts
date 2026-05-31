/**
 * Notification Permission Manager
 *
 * Rules:
 * 1. Ask AFTER onboarding / first meaningful interaction — NOT on cold launch
 * 2. If granted: never ask again
 * 3. If denied: show graceful settings guide ONCE
 * 4. Persist state in localStorage
 */

import type { NotificationPermissionState } from "./types"

const PERMISSION_KEY = "turf_notification_permission"
const MIN_ASK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function readState(): NotificationPermissionState {
  try {
    const raw = localStorage.getItem(PERMISSION_KEY)
    return raw ? JSON.parse(raw) : { status: "undetermined" }
  } catch {
    return { status: "undetermined" }
  }
}

function writeState(state: NotificationPermissionState) {
  localStorage.setItem(PERMISSION_KEY, JSON.stringify(state))
}

/** Get current permission status from OS */
export async function getOsPermissionStatus(): Promise<NotificationPermissionState["status"]> {
  if (typeof Notification === "undefined") return "undetermined"

  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  return "undetermined"
}

/**
 * Intelligent permission request.
 * Returns the final status.
 *
 * @param context - "onboarding" | "first_match_created" | "first_join" | "manual"
 */
export async function requestNotificationPermission(
  context: "onboarding" | "first_match_created" | "first_join" | "manual"
): Promise<NotificationPermissionState["status"]> {
  const state = readState()

  // Never re-ask if already granted
  if (state.status === "granted") {
    console.log("[NotificationPermission] already granted")
    return "granted"
  }

  // If denied, only show settings guide once, then stop
  if (state.status === "denied") {
    if (!state.shownSettingsGuide && context === "manual") {
      // User explicitly tapped a toggle — guide them to settings
      return "denied"
    }
    console.log("[NotificationPermission] previously denied, skipping")
    return "denied"
  }

  // Rate-limit asks (unless manual)
  if (context !== "manual" && state.askedAt) {
    const elapsed = Date.now() - state.askedAt
    if (elapsed < MIN_ASK_INTERVAL_MS) {
      console.log("[NotificationPermission] asked too recently, skipping")
      return "undetermined"
    }
  }

  // Try Capacitor Push Notifications first (native layer)
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")
    const perm = await PushNotifications.requestPermissions()
    const granted = perm.receive === "granted"
    const newState: NotificationPermissionState = {
      status: granted ? "granted" : "denied",
      askedAt: Date.now(),
      shownSettingsGuide: false,
    }
    writeState(newState)
    return newState.status
  } catch {
    // Fallback to Web Notifications API
    if (typeof Notification === "undefined") {
      writeState({ status: "denied", askedAt: Date.now() })
      return "denied"
    }
    const result = await Notification.requestPermission()
    const newState: NotificationPermissionState = {
      status: result === "granted" ? "granted" : result === "denied" ? "denied" : "undetermined",
      askedAt: Date.now(),
      shownSettingsGuide: false,
    }
    writeState(newState)
    return newState.status
  }
}

/** Mark that we've shown the "go to settings" guide */
export function markSettingsGuideShown() {
  const state = readState()
  state.shownSettingsGuide = true
  writeState(state)
}

/** Get persisted permission state (fast, no OS query) */
export function getPermissionState(): NotificationPermissionState {
  return readState()
}

/** Check if we should show the permission prompt for a given context */
export function shouldAskPermission(
  context: "onboarding" | "first_match_created" | "first_join" | "manual"
): boolean {
  const state = readState()
  if (state.status === "granted") return false
  if (state.status === "denied" && state.shownSettingsGuide) return false
  if (context !== "manual" && state.askedAt) {
    const elapsed = Date.now() - state.askedAt
    if (elapsed < MIN_ASK_INTERVAL_MS) return false
  }
  return true
}

/** Open device settings so user can enable notifications */
export async function openNotificationSettings(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app")
    // Capacitor doesn't have a direct "open notification settings" API,
    // but we can open app settings on Android
    if ("openUrl" in App) {
      const url = "app-settings:"
      await (App as any).openUrl({ url })
    }
  } catch {
    // Web fallback — nothing to do
  }
}
