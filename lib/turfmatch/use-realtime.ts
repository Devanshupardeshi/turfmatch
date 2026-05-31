"use client"

/**
 * Supabase Realtime hooks — subscribe to live DB changes for matches,
 * match_players, and notifications. Each hook manages its own channel
 * lifecycle and returns a cleanup on unmount.
 */

import { useEffect, useRef, useCallback, useState, useId } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Match, AppNotification } from "./types"

// Each hook instance gets a unique channel name so multiple components
// subscribing to the same logical stream don't collide on Supabase's
// internal channel cache (which would throw
// "cannot add postgres_changes callbacks after subscribe()").
function useUniqueChannelName(prefix: string) {
  const id = useId()
  // useId() can contain ':' which is invalid in some realtime channel names.
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`
}

// ── Realtime Matches ─────────────────────────────────────────────────────────

interface RealtimeMatchEvent {
  type: "INSERT" | "UPDATE" | "DELETE"
  matchId: string
  payload: any
}

/**
 * Subscribes to INSERT / UPDATE on the `matches` table.
 * Returns an event stream that callers can merge into their local state.
 */
export function useRealtimeMatches(
  onEvent: (evt: RealtimeMatchEvent) => void,
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent
  const channelName = useUniqueChannelName("realtime-matches")

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          cbRef.current({
            type: payload.eventType as any,
            matchId: (payload.new as any)?.id || (payload.old as any)?.id,
            payload: payload.new || payload.old,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName])
}

// ── Realtime Match Players ───────────────────────────────────────────────────

interface RealtimePlayerEvent {
  type: "INSERT" | "UPDATE" | "DELETE"
  matchPlayerId: string
  payload: any
}

/**
 * Subscribes to changes on `match_players` filtered by a specific match.
 */
export function useRealtimeMatchPlayers(
  matchId: string | undefined,
  onEvent: (evt: RealtimePlayerEvent) => void,
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent
  const channelName = useUniqueChannelName("realtime-match-players")

  useEffect(() => {
    if (!matchId) return

    const channel: RealtimeChannel = supabase
      .channel(`${channelName}-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          cbRef.current({
            type: payload.eventType as any,
            matchPlayerId:
              (payload.new as any)?.id || (payload.old as any)?.id,
            payload: payload.new || payload.old,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, channelName])
}

// ── Realtime Notifications ───────────────────────────────────────────────────

interface RealtimeNotifEvent {
  type: "INSERT" | "UPDATE"
  notification: any
}

/**
 * Subscribes to new notifications for a specific user.
 * Returns unread count + latest notification for toast display.
 */
export function useRealtimeNotifications(
  userId: string | undefined,
  onEvent: (evt: RealtimeNotifEvent) => void,
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent
  const channelName = useUniqueChannelName("realtime-notifications")

  useEffect(() => {
    if (!userId) return

    const channel: RealtimeChannel = supabase
      .channel(`${channelName}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          cbRef.current({
            type: "INSERT",
            notification: payload.new,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, channelName])
}

// ── Unread Notification Badge ────────────────────────────────────────────────

/**
 * Returns a live unread count that auto-updates via Realtime.
 */
export function useUnreadNotificationCount(userId: string | undefined) {
  const [count, setCount] = useState(0)

  // Initial fetch
  useEffect(() => {
    if (!userId) return
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count: c }) => {
        setCount(c ?? 0)
      })
  }, [userId])

  // Realtime updates
  useRealtimeNotifications(userId, useCallback((evt) => {
    if (evt.type === "INSERT" && !evt.notification.read) {
      setCount((prev) => prev + 1)
    }
  }, []))

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1))
  }, [])

  return { unreadCount: count, decrementUnread: decrement }
}

// ── Realtime My Invites ───────────────────────────────────────────────────────

/**
 * Subscribes to changes on `match_players` for a specific player.
 * Use this to get real-time invite updates (status = invited).
 */
export function useRealtimeMyInvites(
  userId: string | undefined,
  onEvent: () => void,
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent
  const channelName = useUniqueChannelName("realtime-my-invites")

  useEffect(() => {
    if (!userId) return

    const channel: RealtimeChannel = supabase
      .channel(`${channelName}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
          filter: `player_id=eq.${userId}`,
        },
        () => {
          cbRef.current()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, channelName])
}
