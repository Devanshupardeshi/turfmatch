/**
 * Core Notification Service
 *
 * Orchestrates:
 * - Local notification display (Capacitor Local Notifications)
 * - Push notification listeners (FCM via Capacitor Push Notifications)
 * - Foreground / background / killed-state handling
 * - Deduplication
 * - Deep-link routing
 * - Android notification channels
 */

import type { PushPayload, NotificationChannel } from "./types"
import {
  isDuplicate,
  markReceived,
  markDisplayed,
  markTapped,
  debounceEvent,
  runDedupCleanup,
} from "./deduplication"
import { parseDeepLink, type DeepLinkAction } from "./deep-link"
import { syncPushToken } from "./push-token"

export type NotificationTapHandler = (action: DeepLinkAction, eventId: string) => void

/** Android notification channel IDs */
const CHANNEL_IDS: Record<NotificationChannel, string> = {
  match_updates: "turf_match_updates",
  chat_messages: "turf_chat",
  social: "turf_social",
  nearby_matches: "turf_nearby",
  promotions: "turf_promotions",
}

/** Priority mapping for Android */
const CHANNEL_IMPORTANCE: Record<NotificationChannel, 1 | 2 | 3 | 4 | 5> = {
  match_updates: 5, // HIGH
  chat_messages: 4, // DEFAULT
  social: 4,
  nearby_matches: 3, // LOW
  promotions: 2,      // MIN
}

/** Sound & vibration config */
const CHANNEL_CONFIG: Record<NotificationChannel, { sound: boolean; vibrate: boolean }> = {
  match_updates: { sound: true, vibrate: true },
  chat_messages: { sound: true, vibrate: false },
  social: { sound: true, vibrate: false },
  nearby_matches: { sound: false, vibrate: false },
  promotions: { sound: false, vibrate: false },
}

let isInitialized = false
let tapHandlerRef: NotificationTapHandler | null = null
let foregroundHandlerRef: ((payload: PushPayload) => void) | null = null

/**
 * Initialize the notification system.
 * Must be called once inside the app's root provider.
 */
export async function initNotifications(userId: string | undefined): Promise<void> {
  if (isInitialized) {
    console.log("[NotificationService] already initialized")
    return
  }
  isInitialized = true

  runDedupCleanup()

  // 1. Setup Android notification channels
  await setupAndroidChannels()

  // 2. Sync push token with Supabase
  if (userId) {
    await syncPushToken(userId)
  }

  // 3. Register listeners
  await registerPushListeners()

  console.log("[NotificationService] initialized")
}

/** Set the handler that gets called when user taps a notification */
export function setTapHandler(handler: NotificationTapHandler) {
  tapHandlerRef = handler
}

/** Set the handler for foreground notifications (in-app banner) */
export function setForegroundHandler(handler: (payload: PushPayload) => void) {
  foregroundHandlerRef = handler
}

/** Cleanup on sign-out */
export function cleanupNotifications(): void {
  isInitialized = false
  tapHandlerRef = null
  foregroundHandlerRef = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Android Channels
// ─────────────────────────────────────────────────────────────────────────────

async function setupAndroidChannels(): Promise<void> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    const channels = Object.entries(CHANNEL_IDS).map(([key, id]) => ({
      id,
      name: key.replace("_", " ").replace(/^\w/, c => c.toUpperCase()),
      importance: CHANNEL_IMPORTANCE[key as NotificationChannel],
      sound: CHANNEL_CONFIG[key as NotificationChannel].sound ? "default" : undefined,
      vibration: CHANNEL_CONFIG[key as NotificationChannel].vibrate,
      lights: true,
      visibility: 1 as const, // public
    }))
    await LocalNotifications.createChannel(channels[0])
    // Capacitor only accepts one channel per call, loop through:
    for (const ch of channels) {
      await LocalNotifications.createChannel(ch)
    }
    console.log("[NotificationService] Android channels created:", channels.length)
  } catch (err) {
    console.log("[NotificationService] Android channels skipped (not native):", err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Push Listeners
// ─────────────────────────────────────────────────────────────────────────────

async function registerPushListeners(): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")
    const { LocalNotifications } = await import("@capacitor/local-notifications")

    // Register custom action types for the notification tray
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: "INVITE_ACTIONS",
          actions: [
            {
              id: "accept",
              title: "Accept",
              foreground: true // Open app to process
            },
            {
              id: "reject",
              title: "Decline",
              foreground: true,
              destructive: true
            }
          ]
        }
      ]
    })

    // Foreground push received
    await PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
      handlePushPayload(notification as unknown as PushPayload, "foreground")
    })

    // User tapped push notification or an action button
    await PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
      const payload = action.notification as unknown as PushPayload
      const actionId = action.actionId !== "tap" ? action.actionId : undefined
      handlePushPayload(payload, "tap", actionId)
    })
  } catch {
    // Capacitor plugin not available — we're running in web/browser
    console.log("[NotificationService] PushNotifications plugin not available (web mode)")
  }

  // Also listen for Capacitor App open-with-url (deep link cold start)
  try {
    const { App } = await import("@capacitor/app")
    App.addListener("appUrlOpen", (data) => {
      const url = data.url
      if (url?.startsWith("turfmatch://")) {
        const raw = url.replace("turfmatch://", "")
        const action = parseDeepLink(raw)
        if (action && tapHandlerRef) {
          tapHandlerRef(action, "cold-start-url")
        }
      }
    })
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload Processing
// ─────────────────────────────────────────────────────────────────────────────

function handlePushPayload(
  raw: PushPayload | any,
  source: "foreground" | "background" | "tap",
  actionId?: string
): void {
  // Normalize payload (FCM wraps data differently)
  const payload = normalizePayload(raw)
  if (!payload) {
    console.warn("[NotificationService] unparseable payload:", raw)
    return
  }

  const { eventId, silent } = payload

  // 1. Deduplication
  if (isDuplicate(eventId)) {
    console.log("[NotificationService] duplicate ignored:", eventId)
    return
  }

  // 2. Debounce rapid events
  if (!debounceEvent(eventId)) {
    console.log("[NotificationService] debounced:", eventId)
    return
  }

  // 3. Mark received
  markReceived(eventId)

  // 4. Silent notifications (data-only, no UI)
  if (silent) {
    console.log("[NotificationService] silent data notification:", eventId)
    return
  }

  // 5. Tap handling
  if (source === "tap") {
    markTapped(eventId)
    
    // Inject actionId into routeParams if the user tapped an action button
    let finalRouteParams = payload.routeParams
    if (actionId) {
      try {
        const parsed = finalRouteParams ? JSON.parse(finalRouteParams) : {}
        parsed.inviteAction = actionId
        finalRouteParams = JSON.stringify(parsed)
      } catch {
        finalRouteParams = JSON.stringify({ inviteAction: actionId })
      }
    }

    const action = parseDeepLink(payload.route, finalRouteParams)
    if (action && tapHandlerRef) {
      tapHandlerRef(action, eventId)
    }
    return
  }

  // 6. Foreground handling
  if (source === "foreground") {
    // Option A: Show in-app banner via foregroundHandlerRef
    if (foregroundHandlerRef) {
      foregroundHandlerRef(payload)
    }
    // Option B: Also show a local notification (controlled, not spammy)
    showLocalNotification(payload)
    return
  }

  // 7. Background — OS already showed the tray notification
  markDisplayed(eventId)
}

function normalizePayload(raw: any): PushPayload | null {
  if (!raw) return null

  // FCM data payload structure varies:
  // - Some vendors wrap in `data`
  // - Some put everything top-level
  const data = raw.data || raw

  return {
    eventId: data.eventId || data.gcm_message_id || cryptoRandomId(),
    channel: data.channel || "match_updates",
    title: data.title || "TurfMatch",
    body: data.body || "",
    route: data.route || undefined,
    routeParams: data.routeParams || undefined,
    entityId: data.entityId || undefined,
    imageUrl: data.imageUrl || undefined,
    timestamp: data.timestamp || new Date().toISOString(),
    priority: data.priority || "default",
    badge: data.badge ? Number(data.badge) : undefined,
    silent: data.silent === "true" || data.silent === true,
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Notification Display
// ─────────────────────────────────────────────────────────────────────────────

async function showLocalNotification(payload: PushPayload): Promise<void> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashCode(payload.eventId), // numeric ID required
          title: payload.title,
          body: payload.body,
          channelId: CHANNEL_IDS[payload.channel],
          extra: {
            eventId: payload.eventId,
            route: payload.route,
            routeParams: payload.routeParams,
          },
          sound: CHANNEL_CONFIG[payload.channel].sound ? "default" : undefined,
          smallIcon: "ic_stat_turf", // must exist in Android res
          largeIcon: payload.imageUrl,
          group: payload.channel,
          ongoing: false,
          autoCancel: true,
        },
      ],
    })
    markDisplayed(payload.eventId)
  } catch (err) {
    console.error("[NotificationService] local notification failed:", err)
  }
}

/** Simple string hash for numeric notification IDs */
function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: Send a local notification manually (for in-app triggers)
// ─────────────────────────────────────────────────────────────────────────────

export async function showInAppNotification(payload: PushPayload): Promise<void> {
  if (isDuplicate(payload.eventId)) return
  if (!debounceEvent(payload.eventId)) return
  markReceived(payload.eventId)
  await showLocalNotification(payload)
}

/** Clear all notifications from the tray */
export async function clearAllNotifications(): Promise<void> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    await LocalNotifications.removeAllDeliveredNotifications()
  } catch {
    // ignore
  }
}
