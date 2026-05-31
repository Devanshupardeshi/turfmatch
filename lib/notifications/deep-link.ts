/**
 * Notification Deep-Link Router
 *
 * Converts push payload `route` + `routeParams` into the app's
 * custom NavProvider `navigate()` / `reset()` calls.
 *
 * Handles:
 * - Cold start (app killed → tapped notification)
 * - Background (minimized → tapped notification)
 * - Foreground (in-app banner tapped)
 */

import type { ScreenName } from "@/lib/turfmatch/navigation"

export interface DeepLinkAction {
  action: "navigate" | "reset"
  screen: ScreenName
  params?: Record<string, string>
}

/**
 * Parse a raw route string (e.g. "matchDetail?matchId=abc123")
 * into a structured deep-link action.
 */
export function parseDeepLink(raw?: string, rawParams?: string): DeepLinkAction | null {
  if (!raw) return null

  const [screen, query] = raw.split("?")
  if (!screen) return null

  const params: Record<string, string> = {}

  // Parse inline query string
  if (query) {
    const search = new URLSearchParams(query)
    search.forEach((v, k) => { params[k] = v })
  }

  // Parse explicit JSON params (takes precedence)
  if (rawParams) {
    try {
      const parsed = JSON.parse(rawParams)
      if (parsed && typeof parsed === "object") {
        Object.assign(params, parsed)
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // Tab routes should always `reset` to clear back-stack
  const tabScreens: ScreenName[] = [
    "home",
    "tournaments",
    "createMatch",
    "turfMap",
    "chatInbox",
    "profile",
    "yourMatches",
  ]
  const action: "navigate" | "reset" = tabScreens.includes(screen as ScreenName)
    ? "reset"
    : "navigate"

  return {
    action,
    screen: screen as ScreenName,
    params: Object.keys(params).length > 0 ? params : undefined,
  }
}

/** Convenience builders for common notification types */
export const DeepLinks = {
  matchDetail(matchId: string): DeepLinkAction {
    return { action: "navigate", screen: "matchDetail", params: { matchId } }
  },
  manageRequests(matchId: string): DeepLinkAction {
    return { action: "navigate", screen: "manageRequests", params: { matchId } }
  },
  chatRoom(matchId: string): DeepLinkAction {
    return { action: "navigate", screen: "chatRoom", params: { matchId } }
  },
  playerProfile(playerId: string): DeepLinkAction {
    return { action: "navigate", screen: "playerProfile", params: { playerId } }
  },
  home(): DeepLinkAction {
    return { action: "reset", screen: "home" }
  },
  yourMatches(): DeepLinkAction {
    return { action: "reset", screen: "yourMatches" }
  },
  invites(): DeepLinkAction {
    return { action: "reset", screen: "matchInvites" }
  },
  groundDetail(groundId: string): DeepLinkAction {
    return { action: "navigate", screen: "groundDetail", params: { groundId } }
  },
}
