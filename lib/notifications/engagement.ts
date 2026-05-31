/**
 * Engagement Notification Strategy
 *
 * Generates smart, non-spammy notification copy inspired by
 * Zomato / Swiggy / Blinkit style — but sports-focused.
 *
 * Rules:
 * - No more than 1 notification per channel per hour
 * - Quiet hours: 11 PM — 7 AM
 * - Prioritize: match joins > chat > nearby > social > retention
 */

import type { PushPayload, NotificationChannel } from "./types"

const RATE_LIMIT_KEY_PREFIX = "turf_notif_rate_"
const RATE_LIMIT_MS = 60 * 60 * 1000 // 1 hour
const QUIET_START = 23 // 11 PM
const QUIET_END = 7    // 7 AM

function isQuietHours(): boolean {
  const hour = new Date().getHours()
  return hour >= QUIET_START || hour < QUIET_END
}

function canSend(channel: NotificationChannel): boolean {
  // Skip during quiet hours for non-urgent channels
  if (isQuietHours() && channel !== "match_updates") return false

  const key = `${RATE_LIMIT_KEY_PREFIX}${channel}`
  const last = localStorage.getItem(key)
  if (last) {
    const elapsed = Date.now() - Number(last)
    if (elapsed < RATE_LIMIT_MS) return false
  }
  localStorage.setItem(key, String(Date.now()))
  return true
}

// ── Match Activity ───────────────────────────────────────────────────────────

export function matchJoinAlert(matchName: string, playerCount: number, matchId: string): PushPayload | null {
  if (!canSend("match_updates")) return null
  return {
    eventId: `match_join_${matchId}_${playerCount}_${Date.now()}`,
    channel: "match_updates",
    title: `${playerCount} players joined your match 🔥`,
    body: `Your match at ${matchName} is filling up fast!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}

export function slotFillingUrgency(groundName: string, slotsLeft: number, matchId: string): PushPayload | null {
  if (!canSend("match_updates")) return null
  return {
    eventId: `slot_urgency_${matchId}_${slotsLeft}_${Date.now()}`,
    channel: "match_updates",
    title: `Only ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left 👀`,
    body: `${groundName} tonight — grab it before it's gone!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}

export function matchStartingSoon(groundName: string, minutes: number, matchId: string): PushPayload | null {
  if (!canSend("match_updates")) return null
  return {
    eventId: `match_soon_${matchId}_${minutes}_${Date.now()}`,
    channel: "match_updates",
    title: `Match starts in ${minutes} mins ⚡`,
    body: `Head to ${groundName} — your squad is waiting!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}

// ── Social ────────────────────────────────────────────────────────────────────

export function joinRequestAccepted(playerName: string, matchName: string, matchId: string): PushPayload | null {
  if (!canSend("social")) return null
  return {
    eventId: `join_accept_${matchId}_${Date.now()}`,
    channel: "social",
    title: `${playerName} accepted your request ✅`,
    body: `You're in! See you at ${matchName}.`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "default",
  }
}

export function newInvite(senderName: string, matchName: string, matchId: string): PushPayload | null {
  if (!canSend("social")) return null
  return {
    eventId: `invite_${matchId}_${Date.now()}`,
    channel: "social",
    title: `${senderName} invited you to play! 🏏`,
    body: `Join the match at ${matchName}`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export function newChatMessage(senderName: string, message: string, matchId: string): PushPayload | null {
  if (!canSend("chat_messages")) return null
  return {
    eventId: `chat_${matchId}_${Date.now()}`,
    channel: "chat_messages",
    title: senderName,
    body: message,
    route: "chatRoom",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "default",
  }
}

// ── Nearby / Discovery ──────────────────────────────────────────────────────

export function nearbyPlayersActive(count: number): PushPayload | null {
  if (!canSend("nearby_matches")) return null
  return {
    eventId: `nearby_${count}_${Date.now()}`,
    channel: "nearby_matches",
    title: `${count} players active near you ⚽`,
    body: `Open TurfMatch and join a game nearby!`,
    route: "home",
    timestamp: new Date().toISOString(),
    priority: "low",
  }
}

export function newMatchNearby(groundName: string, matchId: string): PushPayload | null {
  if (!canSend("nearby_matches")) return null
  return {
    eventId: `nearby_match_${matchId}_${Date.now()}`,
    channel: "nearby_matches",
    title: `New match just dropped near you 📍`,
    body: `Game at ${groundName} — slots filling up!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "default",
  }
}

// ── Retention ─────────────────────────────────────────────────────────────────

export function weekendGamesLive(): PushPayload | null {
  if (!canSend("promotions")) return null
  return {
    eventId: `retention_weekend_${Date.now()}`,
    channel: "promotions",
    title: `Weekend games are live! 🔥`,
    body: `Your area is buzzing with matches — check them out.`,
    route: "home",
    timestamp: new Date().toISOString(),
    priority: "low",
  }
}

export function comebackPrompt(): PushPayload | null {
  if (!canSend("promotions")) return null
  return {
    eventId: `retention_comeback_${Date.now()}`,
    channel: "promotions",
    title: `Ready for another session? 🏆`,
    body: `Your football community is active — don't miss out!`,
    route: "home",
    timestamp: new Date().toISOString(),
    priority: "low",
  }
}

// ── FOMO ──────────────────────────────────────────────────────────────────────

export function matchFillingFast(groundName: string, matchId: string): PushPayload | null {
  if (!canSend("match_updates")) return null
  return {
    eventId: `fomo_${matchId}_${Date.now()}`,
    channel: "match_updates",
    title: `This match is going FAST 👀`,
    body: `${groundName} — grab your slot before it's gone!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}

export function momentumAlert(groundName: string, fromSlots: number, toSlots: number, matchId: string): PushPayload | null {
  if (!canSend("match_updates")) return null
  return {
    eventId: `momentum_${matchId}_${Date.now()}`,
    channel: "match_updates",
    title: `${fromSlots} → ${toSlots} players in minutes 🔥`,
    body: `Momentum building at ${groundName}!`,
    route: "matchDetail",
    routeParams: JSON.stringify({ matchId }),
    entityId: matchId,
    timestamp: new Date().toISOString(),
    priority: "high",
  }
}
