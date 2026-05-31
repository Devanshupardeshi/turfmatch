/**
 * Production-grade Push Notification Types for TurfMatch
 * Supports both local (Capacitor) and remote (FCM/APNS) delivery.
 */

export type NotificationChannel =
  | "match_updates"
  | "chat_messages"
  | "social"
  | "nearby_matches"
  | "promotions"

export type NotificationPriority = "high" | "default" | "low"

export interface PushPayload {
  /** Unique event ID for deduplication (UUID v4) */
  eventId: string
  /** Notification type / channel */
  channel: NotificationChannel
  /** Human-readable title */
  title: string
  /** Human-readable body */
  body: string
  /** Deep-link route */
  route?: string
  /** Route params as JSON string */
  routeParams?: string
  /** Related entity ID (matchId, chatThreadId, etc.) */
  entityId?: string
  /** Sender avatar URL (for chat/social) */
  imageUrl?: string
  /** Timestamp ISO string */
  timestamp: string
  /** Priority level */
  priority?: NotificationPriority
  /** Badge count to show */
  badge?: number
  /** Silent notification (no UI, just data) */
  silent?: boolean
}

export interface NotificationLogEntry {
  eventId: string
  receivedAt: number
  displayed: boolean
  tapped: boolean
}

export interface NotificationPermissionState {
  status: "granted" | "denied" | "undetermined"
  /** Epoch ms when permission was last asked */
  askedAt?: number
  /** Whether user has been shown the settings fallback UI */
  shownSettingsGuide?: boolean
}
