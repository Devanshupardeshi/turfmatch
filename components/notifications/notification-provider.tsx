"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useNav } from "@/lib/turfmatch/navigation"
import {
  initNotifications,
  setTapHandler,
  setForegroundHandler,
  cleanupNotifications,
  showInAppNotification,
} from "@/lib/notifications/notification-service"
import {
  requestNotificationPermission,
  shouldAskPermission,
} from "@/lib/notifications/permission"
import { parseDeepLink } from "@/lib/notifications/deep-link"
import type { PushPayload } from "@/lib/notifications/types"
import type { DeepLinkAction } from "@/lib/notifications/deep-link"
import { syncPushToken, retryPushTokenSync, wasPermissionDenied } from "@/lib/notifications/push-token"
import { cn } from "@/lib/utils"

/**
 * In-app banner for foreground notifications.
 * Shows at the top of the screen when a notification arrives while app is open.
 */
function InAppBanner({
  payload,
  onTap,
  onDismiss,
}: {
  payload: PushPayload
  onTap: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5_000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <button
      onClick={onTap}
      className={cn(
        "absolute top-0 left-0 right-0 z-[9999] px-4 pt-3 pb-3",
        "bg-slate-900/95 backdrop-blur border-b border-slate-700",
        "flex items-center gap-3 animate-in slide-in-from-top-full duration-300",
      )}
    >
      {payload.imageUrl ? (
        <img src={payload.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-emerald-400 text-lg font-bold">T</span>
        </div>
      )}
      <div className="flex-1 text-left min-w-0">
        <p className="text-white text-sm font-semibold truncate">{payload.title}</p>
        <p className="text-slate-400 text-xs truncate">{payload.body}</p>
      </div>
      <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider shrink-0">
        Tap
      </span>
    </button>
  )
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const { navigate, reset } = useNav()
  const initDone = useRef(false)

  const [banner, setBanner] = useState<PushPayload | null>(null)

  // Initialize notification system when auth is ready
  useEffect(() => {
    if (initDone.current) return
    if (!profile) return
    initDone.current = true

    console.log("[NotificationProvider] init for user", user?.id)
    initNotifications(user?.id)

    // Set deep-link tap handler
    setTapHandler((action, eventId) => {
      console.log("[NotificationProvider] tap:", action.screen, eventId)
      if (action.action === "reset") {
        reset(action.screen, action.params || {})
      } else {
        navigate(action.screen, action.params || {})
      }
    })

    // Set foreground banner handler
    setForegroundHandler((payload) => {
      console.log("[NotificationProvider] foreground banner:", payload.title)
      setBanner(payload)
    })

    return () => {
      cleanupNotifications()
      initDone.current = false
    }
  }, [profile, user, navigate, reset])

  // Re-sync token when user changes + on app startup/resume
  useEffect(() => {
    if (!user?.id) return

    // Immediate sync on login
    syncPushToken(user.id)

    // Also sync on app resume (user may have granted permission in OS settings)
    let removeResume: (() => void) | undefined
    let cancelled = false

    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => {
        console.log("[NotificationProvider] app resumed — re-syncing push token")
        if (user?.id) {
          syncPushToken(user.id)
        }
      }).then((handle) => {
        if (cancelled) {
          handle.remove()
          return
        }
        removeResume = () => handle.remove()
      })
    }).catch(() => {
      // Not native — web
    })

    return () => {
      cancelled = true
      removeResume?.()
    }
  }, [user?.id])

  // Aggressive startup sync: if we were previously denied, try again after 3s
  // (user may have changed their mind or granted in OS settings)
  useEffect(() => {
    if (!user?.id) return
    if (!wasPermissionDenied()) return

    const timer = setTimeout(() => {
      console.log("[NotificationProvider] retrying push token after previous denial")
      retryPushTokenSync(user.id)
    }, 3_000)

    return () => clearTimeout(timer)
  }, [user?.id])

  // Smart permission request after onboarding / first meaningful interaction
  const maybeAskPermission = useCallback(async (context: "onboarding" | "first_match_created" | "first_join") => {
    if (!shouldAskPermission(context)) return
    await requestNotificationPermission(context)
    // After permission request, immediately sync token
    if (user?.id) {
      await syncPushToken(user.id, true)
    }
  }, [user?.id])

  // Expose permission helper globally for screens to call
  useEffect(() => {
    ;(window as any).__turfAskNotificationPermission = maybeAskPermission
  }, [maybeAskPermission])

  const handleBannerTap = useCallback(() => {
    if (!banner) return
    const action = parseDeepLink(banner.route, banner.routeParams)
    if (action) {
      if (action.action === "reset") {
        reset(action.screen, action.params || {})
      } else {
        navigate(action.screen, action.params || {})
      }
    }
    setBanner(null)
  }, [banner, navigate, reset])

  return (
    <>
      {children}
      {banner && (
        <InAppBanner
          payload={banner}
          onTap={handleBannerTap}
          onDismiss={() => setBanner(null)}
        />
      )}
    </>
  )
}
