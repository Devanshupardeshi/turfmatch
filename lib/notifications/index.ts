/**
 * TurfMatch Notification System — Central Exports
 *
 * Usage:
 *   import { requestNotificationPermission, syncPushToken } from "@/lib/notifications"
 */

export type {
  PushPayload,
  NotificationChannel,
  NotificationPriority,
  NotificationLogEntry,
  NotificationPermissionState,
} from "./types"

export {
  isDuplicate,
  markReceived,
  markDisplayed,
  markTapped,
  debounceEvent,
  runDedupCleanup,
  getDedupStats,
} from "./deduplication"

export {
  getPushToken,
  syncPushToken,
  unregisterPushToken,
} from "./push-token"

export {
  requestNotificationPermission,
  getPermissionState,
  shouldAskPermission,
  openNotificationSettings,
  getOsPermissionStatus,
  markSettingsGuideShown,
} from "./permission"

export {
  initNotifications,
  setTapHandler,
  setForegroundHandler,
  cleanupNotifications,
  showInAppNotification,
  clearAllNotifications,
} from "./notification-service"

export { parseDeepLink, DeepLinks } from "./deep-link"
export type { DeepLinkAction } from "./deep-link"

export {
  matchJoinAlert,
  slotFillingUrgency,
  matchStartingSoon,
  joinRequestAccepted,
  newInvite,
  newChatMessage,
  nearbyPlayersActive,
  newMatchNearby,
  weekendGamesLive,
  comebackPrompt,
  matchFillingFast,
  momentumAlert,
} from "./engagement"
