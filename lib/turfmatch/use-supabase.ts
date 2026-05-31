/**
 * Data bridge — provides the same exports as the original data.ts but fetches
 * from Supabase when possible, falling back to static mock data.
 *
 * Screens import from here via the React hooks (useMatches, useGrounds, etc.)
 * so the transition from mock → live is seamless.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Geolocation } from '@capacitor/geolocation'
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

/**
 * Hard timeout wrapper so a hung Supabase request (e.g. when the realtime
 * websocket dies after the app is backgrounded on Android) can never freeze
 * the UI in a permanent "loading" state. Resolves to `fallback` after `ms`.
 */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timer = new Promise<T>((resolve) => {
    const t = setTimeout(() => {
      console.warn(`[use-supabase] request timed out after ${ms}ms`)
      resolve(fallback)
    }, ms)
    // Keep timer alive even if app is backgrounded on some Android WebViews
    if (typeof window !== "undefined" && (window as any).__timerFix) {
      /* no-op: rely on setTimeout */
    }
  })
  return Promise.race([p, timer]).catch((err) => {
    console.error("[use-supabase] request failed:", err)
    return fallback
  })
}
import {
  fetchMatches,
  fetchGrounds,
  fetchPlayers,
  fetchMatchById,
  fetchGroundById,
  fetchPlayerById,
  fetchTournaments,
  fetchNotifications,
  fetchChatThreads,
  fetchChatMessages,
  fetchJoinRequests,
  joinMatch as joinMatchApi,
  requestToJoinMatch as requestJoinApi,
  respondToJoinRequest as respondJoinApi,
  createMatch as createMatchApi,
  sendChatMessage as sendChatApi,
  markNotificationRead as markReadApi,
  markAllNotificationsRead as markAllReadApi,
  cancelMatch as cancelMatchApi,
  removePlayerFromMatch as removePlayerApi,
  getPlayerMatchStatus as getPlayerStatusApi,
  fetchMyCreatedMatches,
  fetchMyJoinedMatches,
  fetchMyPendingRequests,
  fetchMatchHistory,
  fetchIncomingRequests,
  getShareMatchData as getShareDataApi,
  canSeePhone as canSeePhoneApi,
  fetchPlayerPhone as fetchPhoneApi,
  removeFromHistory,
  fetchAvailablePlayers,
  invitePlayer,
  fetchMyInvites,
  fetchMatchPlayerStatuses,
  respondToInvite,
} from "@/lib/turfmatch/supabase-data"
import {
  useRealtimeMatches,
  useRealtimeMatchPlayers,
  useRealtimeNotifications,
  useUnreadNotificationCount,
  useRealtimeMyInvites,
} from "@/lib/turfmatch/use-realtime"
import type {
  Match,
  Ground,
  Player,
  Tournament,
  AppNotification,
  ChatThread,
  ChatMessage,
  MatchJoinRequest,
  LiveScorecard,
} from "@/lib/turfmatch/types"

// Re-export the static LIVE_SCORECARD — real-time scoring
// would need Supabase Realtime which is a future addition.
import { LIVE_SCORECARD } from "@/lib/turfmatch/data"
export { LIVE_SCORECARD }

// ── Matches ──────────────────────────────────────────────────────────────────

// Global in-memory cache — survives tab switches and remounts
let __matchesCache: Match[] | null = null

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>(__matchesCache ?? [])
  const [loading, setLoading] = useState(__matchesCache === null)
  const mounted = useRef(true)
  const initDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async (retryCount = 0) => {
    console.log("[useMatches] refresh START (retry:", retryCount, ")")
    if (mounted.current) setLoading(true)
    try {
      const data = await withTimeout(fetchMatches(), 10_000, [] as Match[])
      console.log("[useMatches] fetched", data.length, "matches")
      if (mounted.current) {
        setMatches(data)
        __matchesCache = data // update global cache
      }
    } catch (err) {
      console.error("[useMatches] unexpected error:", err)
      // Retry up to 2 times on failure with exponential backoff
      if (retryCount < 2 && mounted.current) {
        const delay = 500 * (retryCount + 1)
        console.log("[useMatches] retrying in", delay, "ms")
        setTimeout(() => { if (mounted.current) refresh(retryCount + 1) }, delay)
        return // Don't set loading=false yet — retry is in flight
      }
    } finally {
      // Only set loading=false if we're not retrying
      if (mounted.current) {
        console.log("[useMatches] refresh END")
        setLoading(false)
      }
    }
  }, [])

  // Startup: if we have cached data, refresh silently in background.
  // Otherwise fetch immediately with a tiny delay for Supabase init.
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    const hasCache = __matchesCache !== null && __matchesCache.length > 0
    const delay = hasCache ? 100 : 300
    const timer = setTimeout(() => {
      if (mounted.current) refresh()
    }, delay)
    return () => clearTimeout(timer)
  }, [refresh])

  // Hard safety net: if ANYTHING goes wrong and loading stays true for
  // > 8 s, force it off so the user is never permanently stuck.
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      console.warn("[useMatches] HARD FALLBACK: forcing loading=false after 8s")
      if (mounted.current) setLoading(false)
    }, 8_000)
    return () => clearTimeout(timer)
  }, [loading])

  // Re-fetch when the app returns from background
  useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false
    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => { refresh() }).then((handle) => {
        if (cancelled) {
          handle.remove()
          return
        }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [refresh])

  // Realtime: auto-refresh when a match is inserted or updated
  useRealtimeMatches(useCallback(() => { refresh() }, [refresh]))

  return { matches, loading, refresh }
}

export function useMatch(matchId?: string) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!matchId) { setLoading(false); return }
    try {
      const m = await withTimeout(fetchMatchById(matchId), 10_000, null as Match | null)
      setMatch(m)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: refresh when players join/leave this match
  useRealtimeMatchPlayers(matchId, useCallback(() => { refresh() }, [refresh]))

  return { match, loading, refresh }
}

// ── My Matches (Created / Joined / Pending / History) ────────────────────────

interface MyMatchesCache {
  created: Match[]
  joined: Match[]
  pending: { match: Match; requestId: string; status: string }[]
  history: Match[]
  invites: Match[]
}

// Global in-memory cache
let __myMatchesCache: MyMatchesCache | null = null

export function useMyMatches() {
  const { user } = useAuth()
  const [created, setCreated] = useState<Match[]>(__myMatchesCache?.created ?? [])
  const [joined, setJoined] = useState<Match[]>(__myMatchesCache?.joined ?? [])
  const [pending, setPending] = useState<{ match: Match; requestId: string; status: string }[]>(__myMatchesCache?.pending ?? [])
  const [history, setHistory] = useState<Match[]>(__myMatchesCache?.history ?? [])
  const [invites, setInvites] = useState<Match[]>(__myMatchesCache?.invites ?? [])
  const [loading, setLoading] = useState(__myMatchesCache === null)
  const mounted = useRef(true)
  const initDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async (retryCount = 0) => {
    console.log("[useMyMatches] refresh START (retry:", retryCount, ")")
    if (!user) { if (mounted.current) setLoading(false); return }
    if (mounted.current) setLoading(true)
    try {
      const [c, j, p, h, i] = await Promise.all([
        withTimeout(fetchMyCreatedMatches(user.id), 10_000, [] as Match[]),
        withTimeout(fetchMyJoinedMatches(user.id), 10_000, [] as Match[]),
        withTimeout(fetchMyPendingRequests(user.id), 10_000, [] as { match: Match; requestId: string; status: string }[]),
        withTimeout(fetchMatchHistory(user.id), 10_000, [] as Match[]),
        withTimeout(fetchMyInvites(user.id), 10_000, [] as Match[]),
      ])
      console.log("[useMyMatches] fetched", { created: c.length, joined: j.length, pending: p.length, history: h.length, invites: i.length })
      if (mounted.current) {
        setCreated(c)
        setJoined(j)
        setPending(p)
        setHistory(h)
        setInvites(i)
        __myMatchesCache = { created: c, joined: j, pending: p, history: h, invites: i }
      }
    } catch (err) {
      console.error("[useMyMatches] unexpected error:", err)
      // Retry up to 2 times on failure with exponential backoff
      if (retryCount < 2 && mounted.current) {
        const delay = 500 * (retryCount + 1)
        console.log("[useMyMatches] retrying in", delay, "ms")
        setTimeout(() => { if (mounted.current) refresh(retryCount + 1) }, delay)
        return // Don't set loading=false yet — retry is in flight
      }
    } finally {
      if (mounted.current) {
        console.log("[useMyMatches] refresh END")
        setLoading(false)
      }
    }
  }, [user])

  // Hard safety net: force loading off after 8s max
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      console.warn("[useMyMatches] HARD FALLBACK: forcing loading=false after 8s")
      if (mounted.current) setLoading(false)
    }, 8_000)
    return () => clearTimeout(timer)
  }, [loading])

  // Startup: if cache exists, refresh silently in background.
  // Otherwise fetch immediately with a tiny delay.
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    const hasCache = __myMatchesCache !== null
    const delay = hasCache ? 100 : 300
    const timer = setTimeout(() => {
      if (mounted.current) refresh()
    }, delay)
    return () => clearTimeout(timer)
  }, [refresh])

  // Re-fetch when app returns from background
  useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false
    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => { refresh() }).then((handle) => {
        if (cancelled) { handle.remove(); return }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [refresh])

  // Realtime: refresh when any match changes
  useRealtimeMatches(useCallback(() => { refresh() }, [refresh]))

  // Realtime: refresh when invites change for this user
  useRealtimeMyInvites(user?.id, useCallback(() => { refresh() }, [refresh]))

  return { created, joined, pending, history, invites, loading, refresh }
}

// ── Incoming Requests (for match owners) ─────────────────────────────────────

export function useIncomingRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<MatchJoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const r = await withTimeout(fetchIncomingRequests(user.id), 10_000, [] as MatchJoinRequest[])
      setRequests(r)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { requests, loading, refresh }
}

// ── Player Match Status ──────────────────────────────────────────────────────

export function usePlayerMatchStatus(matchId?: string) {
  const { user } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!matchId || !user) { setLoading(false); return }
    try {
      const result = await withTimeout(
        getPlayerStatusApi(matchId, user.id),
        10_000,
        null as { status: string; requestId: string | null } | null,
      )
      setStatus(result?.status ?? null)
      setRequestId(result?.requestId ?? null)
    } finally {
      setLoading(false)
    }
  }, [matchId, user])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: refresh when players change on this match
  useRealtimeMatchPlayers(matchId, useCallback(() => { refresh() }, [refresh]))

  return { status, requestId, loading, refresh }
}

// ── Notification Badge ───────────────────────────────────────────────────────

export function useNotificationBadge() {
  const { user } = useAuth()
  return useUnreadNotificationCount(user?.id)
}

// ── Grounds ──────────────────────────────────────────────────────────────────

import { useCoords } from "./location-store"
import { useNearbyTurfs } from "./nearby-turfs-store"

export function useUserLocation() {
  return useCoords()
}

export function useGrounds() {
  const { grounds, loading } = useNearbyTurfs()
  return { grounds, loading }
}

export function useGround(groundId?: string) {
  const [ground, setGround] = useState<Ground | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groundId) { setLoading(false); return }
    fetchGroundById(groundId).then(g => { setGround(g); setLoading(false) })
  }, [groundId])

  return { ground, loading }
}

// ── Players ──────────────────────────────────────────────────────────────────

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers().then(p => { setPlayers(p); setLoading(false) })
  }, [])

  return { players, loading }
}

export function usePlayer(playerId?: string) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) { setLoading(false); return }
    fetchPlayerById(playerId).then(p => { setPlayer(p); setLoading(false) })
  }, [playerId])

  return { player, loading }
}

// ── Current User (ME) ────────────────────────────────────────────────────────

export function useMe(): { me: Player | null; loading: boolean; hasPhone: boolean } {
  const { profile, loading: authLoading } = useAuth()

  if (authLoading || !profile) {
    return { me: null, loading: authLoading, hasPhone: false }
  }

  const me: Player = {
    id: profile.id,
    name: profile.name || "Player",
    avatar: profile.avatar || `https://i.pravatar.cc/240?u=${profile.id}`,
    role: (profile.role as any) || "Batsman",
    city: profile.city || "Pune",
    zone: profile.zone || "Pune",
    rating: Number(profile.rating) || 4.0,
    reliability: profile.reliability ?? 100,
    level: profile.level ?? 1,
    badge: (profile.badge as any) || undefined,
    careerStats: {
      matches: profile.matches_played ?? 0,
      winRatePct: 0,
      runs: 0,
      wickets: 0,
    },
    recentForm: [],
    availability: (profile.availability as any) || "today",
    distanceKm: 0,
    isFriend: false,
    phone: profile.phone || undefined,
  }

  return { me, loading: false, hasPhone: !!profile.phone }
}

// ── Tournaments ──────────────────────────────────────────────────────────────

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments().then(t => { setTournaments(t); setLoading(false) })
  }, [])

  return { tournaments, loading }
}

// ── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const n = await withTimeout(fetchNotifications(user.id), 10_000, [] as AppNotification[])
      setNotifications(n)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Re-fetch when app returns from background
  useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false
    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => { refresh() }).then((handle) => {
        if (cancelled) { handle.remove(); return }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: auto-prepend new notifications
  useRealtimeNotifications(user?.id, useCallback((evt) => {
    if (evt.type === "INSERT") {
      const n = evt.notification
      setNotifications(prev => [{
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        time: n.time || "Just now",
        read: false,
        actorAvatar: n.actor_avatar,
        entityId: n.entity_id,
      }, ...prev])
    }
  }, []))

  const markRead = async (id: string) => {
    await markReadApi(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    if (!user) return
    await markAllReadApi(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return { notifications, loading, markRead, markAllRead, refresh }
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export function useChatThreads() {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChatThreads().then(t => { setThreads(t); setLoading(false) })
  }, [])

  return { threads, loading }
}

export function useChatMessages(threadId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!threadId) return
    try {
      const m = await withTimeout(fetchChatMessages(threadId), 10_000, [] as ChatMessage[])
      setMessages(m)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => { refresh() }, [refresh])

  const send = async (msg: Omit<ChatMessage, "id">) => {
    if (!threadId) return
    await sendChatApi(threadId, msg)
    await refresh()
  }

  return { messages, loading, send, refresh }
}

// ── Join Requests ────────────────────────────────────────────────────────────

export function useJoinRequests(matchId?: string) {
  const [requests, setRequests] = useState<MatchJoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!matchId) return
    try {
      const r = await withTimeout(fetchJoinRequests(matchId), 10_000, [] as MatchJoinRequest[])
      setRequests(r)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  // Re-fetch when app returns from background
  useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false
    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => { refresh() }).then((handle) => {
        if (cancelled) { handle.remove(); return }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [refresh])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: refresh when match_players changes for this match
  useRealtimeMatchPlayers(matchId, useCallback(() => { refresh() }, [refresh]))

  const respond = async (requestId: string, status: "joined" | "declined") => {
    await respondJoinApi(requestId, status, matchId)
    await refresh()
  }

  return { requests, loading, respond, refresh }
}

// ── Invites ──────────────────────────────────────────────────────────────────

export function useAvailablePlayers(userId?: string, matchId?: string) {
  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const offsetRef = useRef(0)
  const limit = 50

  console.log("[useAvailablePlayers] init:", { userId: userId?.slice(0, 8), matchId: matchId?.slice(0, 8) })

  const refresh = useCallback(async (opts?: { append?: boolean; searchQuery?: string }) => {
    console.log("[useAvailablePlayers] refresh called:", { hasUserId: !!userId, userId: userId?.slice(0, 8) })
    if (!userId) { console.warn("[useAvailablePlayers] no userId, aborting"); setLoading(false); return }
    const isAppend = opts?.append ?? false
    const searchQuery = opts?.searchQuery ?? search
    if (!isAppend) { setLoading(true); setError(null) }
    else setLoadingMore(true)
    const currentOffset = isAppend ? offsetRef.current : 0
    try {
      const [result, statuses] = await Promise.all([
        withTimeout(
          fetchAvailablePlayers(userId, { offset: currentOffset, limit, search: searchQuery }),
          10_000,
          { players: [] as Player[], total: 0 }
        ),
        matchId
          ? withTimeout(fetchMatchPlayerStatuses(matchId), 10_000, {} as Record<string, string>)
          : Promise.resolve({} as Record<string, string>),
      ])
      console.log("[useAvailablePlayers] refresh result:", { playersCount: result.players.length, total: result.total })
      setPlayers(prev => isAppend ? [...prev, ...result.players] : result.players)
      setTotal(result.total)
      setPlayerStatuses(statuses)
      offsetRef.current = currentOffset + result.players.length
      if (result.players.length === 0 && !isAppend) {
        setError(null) // no error, just empty result
      }
    } catch (err: any) {
      console.error("[useAvailablePlayers] refresh error:", err)
      setError(err?.message || "Failed to load players")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId, matchId, search])

  useEffect(() => { console.log("[useAvailablePlayers] useEffect triggered"); refresh() }, [refresh])

  const loadMore = useCallback(() => {
    if (loadingMore || players.length >= total) return
    refresh({ append: true })
  }, [refresh, loadingMore, players.length, total])

  const sendInvite = async (matchId: string, playerId: string) => {
    const ok = await invitePlayer(matchId, playerId)
    if (ok) {
      setPlayerStatuses(prev => ({ ...prev, [playerId]: "invited" }))
    }
    return ok
  }

  return { players, total, playerStatuses, loading, loadingMore, error, loadMore, search, setSearch, refresh, sendInvite }
}

export function useMyInvites(userId?: string) {
  const [invites, setInvites] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async () => {
    console.log("[useMyInvites] refresh START")
    if (!userId) { if (mounted.current) setLoading(false); return }
    if (mounted.current) setLoading(true)
    try {
      const i = await withTimeout(fetchMyInvites(userId), 10_000, [] as Match[])
      console.log("[useMyInvites] fetched", i.length, "invites")
      if (mounted.current) setInvites(i)
    } catch (err) {
      console.error("[useMyInvites] unexpected error:", err)
    } finally {
      console.log("[useMyInvites] refresh END")
      if (mounted.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      console.warn("[useMyInvites] HARD FALLBACK: forcing loading=false after 8s")
      if (mounted.current) setLoading(false)
    }, 8_000)
    return () => clearTimeout(timer)
  }, [loading])

  useEffect(() => { refresh() }, [refresh])

  // Re-fetch when app returns from background
  useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false
    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("resume", () => { refresh() }).then((handle) => {
        if (cancelled) { handle.remove(); return }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [refresh])

  // Realtime: refresh when invites change for this user
  useRealtimeMyInvites(userId, useCallback(() => { refresh() }, [refresh]))

  const respond = async (matchId: string, accept: boolean) => {
    if (!userId) return false
    const ok = await respondToInvite(matchId, userId, accept)
    if (ok) await refresh()
    return ok
  }

  return { invites, loading, respond, refresh }
}

// ── Actions ──────────────────────────────────────────────────────────────────

export {
  joinMatchApi as joinMatch,
  requestJoinApi as requestToJoin,
  createMatchApi as createMatch,
  cancelMatchApi as cancelMatch,
  removePlayerApi as removePlayer,
  getShareDataApi as getShareMatchData,
  canSeePhoneApi as canSeePhone,
  fetchPhoneApi as fetchPlayerPhone,
  removeFromHistory,
  fetchAvailablePlayers,
  invitePlayer,
  fetchMyInvites,
  respondToInvite,
}
