/**
 * Supabase data service — replaces static mock data with live DB queries.
 * Each function mirrors the data shape from lib/turfmatch/types.ts so screens
 * can swap imports with minimal changes.
 */

import { supabase } from "@/lib/supabase"
import { guardFetch } from "@/lib/bootstrap/guarded-fetch"
import { waitForAuthInit } from "@/lib/bootstrap/session-manager"
import type {
  Player,
  Ground,
  Match,
  MatchJoinRequest,
  Tournament,
  AppNotification,
  ChatThread,
  ChatMessage,
} from "@/lib/turfmatch/types"

// Retry wrapper for Supabase cold-start resilience (PostgREST needs to introspect)
async function withRetry<T>(fn: () => PromiseLike<T>, maxRetries = 2, label = "query"): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      console.error(`[${label}] ERROR (attempt ${attempt}):`, err)
      if (attempt === maxRetries) throw err
      await new Promise(r => setTimeout(r, 1_000 * (attempt + 1)))
    }
  }
  throw new Error(`[${label}] exhausted all retries`)
}

/**
 * GUARDED retry — waits for auth + network BEFORE executing.
 * Use this for all startup-critical queries to prevent the auth race condition.
 */
async function guardedWithRetry<T>(
  fn: () => PromiseLike<T>,
  label: string,
  maxRetries = 2
): Promise<T> {
  return guardFetch(
    () => withRetry(fn, maxRetries, label),
    { label, maxRetries }
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Transform a DB player row into the frontend Player shape. */
function toPlayer(row: any): Player {
  return {
    id: row.id,
    name: row.name || "",
    avatar: row.avatar || `https://i.pravatar.cc/240?u=${row.id}`,
    role: row.role || "Batsman",
    city: row.city || "Pune",
    zone: row.zone || "",
    rating: Number(row.rating) || 4.0,
    reliability: row.reliability ?? 100,
    level: row.level ?? 1,
    badge: row.badge || undefined,
    careerStats: {
      matches: row.matches_played ?? 0,
      winRatePct: row.win_rate_pct ?? 0,
      runs: row.runs ?? 0,
      runsTopPercentile: row.runs_top_percentile ?? undefined,
      wickets: row.wickets ?? 0,
      economy: row.economy ? Number(row.economy) : undefined,
    },
    recentForm: [],
    availability: row.availability || "today",
    distanceKm: Number(row.distance_km) || 0,
    isFriend: false,
    phone: row.phone || undefined,
  }
}

function toGround(row: any): Ground {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    zone: row.zone,
    distanceKm: Number(row.distance_km) || 0,
    rating: Number(row.rating) || 4.5,
    userRatingCount: row.user_rating_count,
    pricePerHour: row.price_per_hour,
    image: row.image || "",
    features: row.features || [],
    availableSlots: row.available_slots || [],
    category: row.category,
    pitchType: row.pitch_type,
    verified: row.verified ?? false,
    upiReady: row.upi_ready ?? false,
    liveTeamsToday: row.live_teams_today ?? 0,
    lat: Number(row.lat) || 0,
    lng: Number(row.lng) || 0,
    phoneNumber: row.phone_number,
  }
}

/**
 * Checks whether a match's scheduled start (date + starts_at) is still in the
 * future. Returns `true` if the match has already started / passed.
 */
function isMatchExpired(row: any): boolean {
  const dateStr = row.date || row.match?.date
  const timeStr = row.starts_at || row.match?.starts_at
  if (!dateStr || !timeStr) return false // can't tell — keep it
  try {
    const matchDate = new Date(`${dateStr}T${timeStr}`)
    return isNaN(matchDate.getTime()) ? false : matchDate.getTime() < Date.now()
  } catch {
    return false
  }
}

function toMatch(row: any, ground: Ground, organizer: Player, players: Player[]): Match {
  return {
    id: row.id,
    title: row.title,
    ground,
    startsAt: row.starts_at,
    date: row.date,
    startsInLabel: row.starts_in_label || undefined,

    skillLevel: row.skill_level,
    visibility: row.visibility,
    totalSlots: row.total_slots,
    filledSlots: row.filled_slots,
    pricePerPlayer: row.price_per_player,
    organizer,
    players,
    rules: row.rules || [],
    status: row.status,
    score: row.score_team_a != null
      ? {
          teamA: row.score_team_a,
          wicketsA: row.score_wickets_a,
          oversA: Number(row.score_overs_a),
          teamB: row.score_team_b ?? 0,
          wicketsB: row.score_wickets_b,
          oversB: row.score_overs_b ? Number(row.score_overs_b) : undefined,
        }
      : null,
    liveBalls: row.live_balls || undefined,
    durationMinutes: row.duration_minutes,
    endsAt: row.ends_at,
    description: row.description,
    sportType: row.sport_type,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchGrounds(): Promise<Ground[]> {
  try {
    const { data, error } = await guardedWithRetry(async () =>
      await supabase
        .from("grounds")
        .select("*")
        .order("created_at", { ascending: false }),
      "fetchGrounds",
      2
    )
    if (error || !data) return []
    return data.map(toGround)
  } catch (err) {
    console.error("fetchGrounds failed after retries:", err)
    return []
  }
}

export async function fetchGroundById(id: string): Promise<Ground | null> {
  const { data, error } = await supabase
    .from("grounds")
    .select("*")
    .eq("id", id)
  if (error || !data) return null
  return toGround(data)
}

export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await guardedWithRetry(
    () => supabase.from("players").select("*"),
    "fetchPlayers",
    2
  )
  if (error) {
    console.error("fetchPlayers error:", error)
    return []
  }
  return (data || []).map(toPlayer)
}

export async function fetchPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single()
  if (error || !data) return null
  return toPlayer(data)
}

export async function fetchMatches(): Promise<Match[]> {
  console.log("[fetchMatches] START")
  const MAX_RETRIES = 2
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await guardedWithRetry(
        () => supabase
          .from("matches")
          .select(`
            *,
            ground:grounds(*),
            organizer:players!matches_organizer_id_fkey(*),
            match_players(player:players(*))
          `)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false }),
        "fetchMatches",
        0 // retry handled by outer loop
      )

      if (error) {
        console.error("[fetchMatches] ERROR (attempt", attempt, "):", error)
        if (attempt === MAX_RETRIES) return []
        // Longer backoff for Supabase PostgREST cold-start (1s, 2s)
        await new Promise(r => setTimeout(r, 1_000 * (attempt + 1)))
        continue
      }

      return (data || [])
        .filter((row: any) => !isMatchExpired(row))
        .map((row: any) => {
          const ground = row.ground ? toGround(row.ground) : {} as Ground
          const organizer = row.organizer ? toPlayer(row.organizer) : {} as Player
          const players = (row.match_players || [])
            .filter((mp: any) => mp.player && mp.status === "joined")
            .map((mp: any) => toPlayer(mp.player))
          return toMatch(row, ground, organizer, players)
        })
    } catch (err) {
      console.error("[fetchMatches] EXCEPTION (attempt", attempt, "):", err)
      if (attempt === MAX_RETRIES) return []
      await new Promise(r => setTimeout(r, 1_000 * (attempt + 1)))
    }
  }
  return []
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  try {
    const { data, error } = await withRetry(async () =>
      await supabase
        .from("matches")
        .select(`
          *,
          ground:grounds(*),
          organizer:players!matches_organizer_id_fkey(*),
          match_players(player:players(*), status, can_see_phone, id)
        `)
        .eq("id", id)
        .single(),
      2, "fetchMatchById"
    )

    if (error || !data) return null

    const ground = data.ground ? toGround(data.ground) : {} as Ground
    const organizer = data.organizer ? toPlayer(data.organizer) : {} as Player
    const players = (data.match_players || [])
      .filter((mp: any) => mp.player && mp.status === "joined")
      .map((mp: any) => toPlayer(mp.player))
    return toMatch(data, ground, organizer, players)
  } catch (err) {
    console.error("fetchMatchById failed after retries:", err)
    return null
  }
}

// ── Join / Request System ────────────────────────────────────────────────────

export async function joinMatch(matchId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from("match_players")
    .insert({ match_id: matchId, player_id: playerId, status: "joined", can_see_phone: true })

  if (error) { console.error("joinMatch:", error); return false }

  try { await supabase.rpc("increment_filled_slots", { match_uuid: matchId }) } catch {}

  // Notify match organizer
  const { data: matchData } = await supabase.from("matches").select("title, organizer_id").eq("id", matchId).single()
  const { data: playerData } = await supabase.from("players").select("name, avatar").eq("id", playerId).single()
  if (matchData && playerData) {
    await createNotification(
      matchData.organizer_id,
      "match_join",
      "New Player Joined!",
      `${playerData.name} joined "${matchData.title}"`,
      playerData.avatar,
      matchId
    )
  }

  return true
}

export async function requestToJoinMatch(matchId: string, playerId: string): Promise<boolean> {
  // Verify match exists and is not invite-only
  const { data: matchRow } = await supabase
    .from("matches")
    .select("visibility")
    .eq("id", matchId)
    .maybeSingle()

  if (matchRow?.visibility === "invite") {
    console.log("requestToJoinMatch: invite-only match, request blocked")
    return false
  }

  // Check if already requested
  const { data: existing } = await supabase
    .from("match_players")
    .select("id, status")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle()

  if (existing) {
    console.log("Already has entry:", existing.status)
    return false
  }

  const { error } = await supabase
    .from("match_players")
    .insert({ match_id: matchId, player_id: playerId, status: "pending" })
  if (error) { console.error("requestToJoinMatch:", error); return false }

  // Notification for the organizer is created automatically by the
  // `trg_notify_join_request` Postgres trigger on match_players INSERT —
  // no manual createNotification call needed (would duplicate).

  return true
}

export async function fetchJoinRequests(matchId: string): Promise<MatchJoinRequest[]> {
  const { data, error } = await supabase
    .from("match_players")
    .select("*, player:players(*)")
    .eq("match_id", matchId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })

  if (error) { console.error("fetchJoinRequests:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    player: toPlayer(row.player),
    status: row.status === "joined" ? "accepted" : row.status,
    requestedAt: new Date(row.requested_at).toLocaleString(),
    canSeePhone: row.can_see_phone,
  }))
}

export async function respondToJoinRequest(
  requestId: string,
  status: "joined" | "declined",
  matchId?: string
): Promise<boolean> {
  // Fetch match and requester details before mutating
  let playerId: string | null = null
  let matchTitle = "a match"
  let hostId: string | null = null

  if (matchId) {
    const { data: mpData } = await supabase
      .from("match_players")
      .select("player_id, match:matches(title, organizer_id)")
      .eq("id", requestId)
      .single()
    if (mpData) {
      playerId = mpData.player_id
      matchTitle = (mpData.match as any)?.title || "a match"
      hostId = (mpData.match as any)?.organizer_id
    }
  }

  if (status === "joined" && matchId) {
    const { error } = await supabase.rpc("accept_join_request", {
      request_uuid: requestId,
      match_uuid: matchId,
    })
    if (error) { console.error("accept_join_request:", error); return false }

    // Send push to accepted player
    if (playerId) {
      const title = `Request Accepted!`
      const body = `Your request to join "${matchTitle}" has been accepted. You're in the squad!`
      supabase.functions.invoke("send-notification", {
        body: {
          userIds: [playerId],
          title,
          body,
          route: `/match/${matchId}`,
          entityId: matchId,
          priority: "default",
          channel: "match_updates",
        }
      }).catch(err => console.error("accept_join_request push err:", err))
    }
  } else {
    const { error } = await supabase.rpc("decline_join_request", {
      request_uuid: requestId,
    })
    if (error) { console.error("decline_join_request:", error); return false }

    // Send push to declined player
    if (playerId) {
      const title = `Request Declined`
      const body = `Your request to join "${matchTitle}" was declined.`
      supabase.functions.invoke("send-notification", {
        body: {
          userIds: [playerId],
          title,
          body,
          route: `/match/${matchId}`,
          entityId: matchId,
          priority: "default",
          channel: "match_updates",
        }
      }).catch(err => console.error("decline_join_request push err:", err))
    }
  }
  return true
}

export async function removePlayerFromMatch(requestId: string, matchId: string): Promise<boolean> {
  const { error } = await supabase.rpc("remove_player_from_match", {
    request_uuid: requestId,
    match_uuid: matchId,
  })
  if (error) { console.error("removePlayerFromMatch:", error); return false }
  return true
}

// ── Create Match ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolves a Ground (which may have a UUID id from our DB or a Google Places
 * "ChIJ..." id) into a real UUID that can be stored in `matches.ground_id`.
 *
 * If the ground originated from Google Places, we lazily upsert it into the
 * local `grounds` table keyed by `google_place_id` so multiple users picking
 * the same turf share one DB row.
 */
async function ensureGroundUuid(ground: Ground): Promise<string | null> {
  // 1) Already a UUID — assume it's already in `grounds`.
  if (UUID_RE.test(ground.id)) return ground.id

  // 2) Look up by google_place_id first to avoid duplicates.
  const { data: existing } = await supabase
    .from("grounds")
    .select("id")
    .eq("google_place_id", ground.id)
    .maybeSingle()
  if (existing?.id) return existing.id

  // 3) Insert a new row mirroring the Places ground.
  const insertRow: any = {
    google_place_id: ground.id,
    name: ground.name || "Unnamed Turf",
    location: ground.location || "",
    zone: ground.zone || "",
    distance_km: ground.distanceKm ?? 0,
    rating: ground.rating ?? 4.5,
    price_per_hour: ground.pricePerHour ?? 0,
    image: ground.image || "",
    features: ground.features || [],
    available_slots: ground.availableSlots || [],
    category: ground.category || "Box Cricket",
    pitch_type: ground.pitchType || "Astroturf",
    verified: ground.verified ?? false,
    upi_ready: ground.upiReady ?? false,
    live_teams_today: ground.liveTeamsToday ?? 0,
    lat: ground.lat,
    lng: ground.lng,
  }
  const { data: created, error } = await supabase
    .from("grounds")
    .insert(insertRow)
    .select("id")
    .single()
  if (error) { console.error("ensureGroundUuid:", error); return null }
  return created?.id ?? null
}

export async function createMatch(matchData: {
  title: string
  /** Either a UUID from `grounds.id` OR a Google Places id (will be upserted). */
  ground_id: string
  /** Full Ground object — required when `ground_id` is a Google Places id. */
  ground?: Ground
  starts_at: string
  date: string

  skill_level: string
  visibility: string
  total_slots: number
  price_per_player: number
  organizer_id: string
  rules: string[]
  duration_minutes?: number
  description?: string
  sport_type?: string
}): Promise<string | null> {
  // Resolve ground_id to a real UUID if it's a Google Places id.
  let resolvedGroundId: string | null = matchData.ground_id
  if (!UUID_RE.test(matchData.ground_id)) {
    if (!matchData.ground) {
      console.error("createMatch: ground_id is not a UUID and no ground object was supplied")
      return null
    }
    resolvedGroundId = await ensureGroundUuid(matchData.ground)
    if (!resolvedGroundId) return null
  }

  // Compute ends_at
  let ends_at: string | null = null
  if (matchData.date && matchData.starts_at && matchData.duration_minutes) {
    try {
      const dateStr = matchData.date
      const timeStr = matchData.starts_at
      // Try to parse a date/time combo
      const start = new Date(`${dateStr}T${timeStr}`)
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + matchData.duration_minutes * 60_000)
        ends_at = end.toISOString()
      }
    } catch {}
  }

  const { data, error } = await supabase
    .from("matches")
    .insert({
      title: matchData.title,
      ground_id: resolvedGroundId,
      starts_at: matchData.starts_at,
      date: matchData.date,

      skill_level: matchData.skill_level,
      visibility: matchData.visibility,
      total_slots: matchData.total_slots,
      price_per_player: matchData.price_per_player,
      organizer_id: matchData.organizer_id,
      rules: matchData.rules,
      status: "open",
      filled_slots: 1,
      duration_minutes: matchData.duration_minutes || 60,
      ends_at,
      description: matchData.description || "",
      sport_type: matchData.sport_type || "cricket",
    })
    .select("id")
    .single()

  if (error || !data) { console.error("createMatch:", error); return null }

  // Auto-join organizer
  await supabase.from("match_players").insert({
    match_id: data.id,
    player_id: matchData.organizer_id,
    status: "joined",
    can_see_phone: true,
  })

  // Create chat thread for the match
  await supabase.from("chat_threads").insert({
    match_id: data.id,
    title: matchData.title,
    last_message: "Match created! Chat with your squad here.",
    last_message_time: "Just now",
    is_live: true,
  })

  return data.id
}

// ── Cancel Match ─────────────────────────────────────────────────────────────

/**
 * Hard-deletes a match so it disappears from every feed (home, search,
 * your-matches, history) on every device immediately.
 *
 * Before deleting we notify every joined player so they see
 * "Match X has been cancelled by the host" in their notifications feed
 * — otherwise the match would just silently vanish from their UI.
 *
 * `match_players` rows are removed automatically by the
 * `match_players_match_id_fkey ON DELETE CASCADE` constraint.
 */
export async function cancelMatch(matchId: string): Promise<boolean> {
  // 1) Look up match title + all joined player IDs (excluding the host).
  const { data: matchRow } = await supabase
    .from("matches")
    .select("title, organizer_id")
    .eq("id", matchId)
    .single()

  if (matchRow) {
    const { data: joined } = await supabase
      .from("match_players")
      .select("player_id")
      .eq("match_id", matchId)
      .eq("status", "joined")
      .neq("player_id", matchRow.organizer_id)

    // 2) Notify each joined player BEFORE deleting the match row.
    if (joined && joined.length > 0) {
      const rows = joined.map((p: any) => ({
        user_id: p.player_id,
        kind: "match_cancelled",
        title: "Match Cancelled",
        body: `"${matchRow.title}" has been cancelled by the host.`,
        time: "Just now",
      }))
      try { await supabase.from("notifications").insert(rows) } catch {}
    }
  }

  // 3) Delete the match row. `match_players` rows cascade automatically.
  const { error } = await supabase.from("matches").delete().eq("id", matchId)
  if (error) { console.error("cancelMatch:", error); return false }
  return true
}

// ── My Matches Queries ───────────────────────────────────────────────────────

export async function fetchMyCreatedMatches(userId: string): Promise<Match[]> {
  try {
    const { data, error } = await guardedWithRetry(async () =>
      await supabase
        .from("matches")
        .select(`
          *,
          ground:grounds(*),
          organizer:players!matches_organizer_id_fkey(*),
          match_players(player:players(*))
        `)
        .eq("organizer_id", userId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }),
      "fetchMyCreatedMatches",
      2
    )

    if (error) { console.error("fetchMyCreatedMatches:", error); return [] }
    return (data || [])
      .filter((row: any) => !isMatchExpired(row))
      .map((row: any) => {
        const ground = row.ground ? toGround(row.ground) : {} as Ground
        const organizer = row.organizer ? toPlayer(row.organizer) : {} as Player
        const players = (row.match_players || [])
          .filter((mp: any) => mp.player && mp.status === "joined")
          .map((mp: any) => toPlayer(mp.player))
        return toMatch(row, ground, organizer, players)
      })
  } catch (err) {
    console.error("fetchMyCreatedMatches failed after retries:", err)
    return []
  }
}

export async function fetchMyJoinedMatches(userId: string): Promise<Match[]> {
  try {
    const { data, error } = await guardedWithRetry(async () =>
      await supabase
        .from("match_players")
        .select(`
          match:matches(
            *,
            ground:grounds(*),
            organizer:players!matches_organizer_id_fkey(*),
            match_players(player:players(*))
          )
        `)
        .eq("player_id", userId)
        .eq("status", "joined"),
      "fetchMyJoinedMatches",
      2
    )

    if (error) { console.error("fetchMyJoinedMatches:", error); return [] }
    return (data || [])
      .filter((row: any) => row.match && row.match.organizer_id !== userId && row.match.status !== "cancelled" && !isMatchExpired(row))
      .map((row: any) => {
        const m = row.match
        const ground = m.ground ? toGround(m.ground) : {} as Ground
        const organizer = m.organizer ? toPlayer(m.organizer) : {} as Player
        const players = (m.match_players || [])
          .filter((mp: any) => mp.player && mp.status === "joined")
          .map((mp: any) => toPlayer(mp.player))
        return toMatch(m, ground, organizer, players)
      })
  } catch (err) {
    console.error("fetchMyJoinedMatches failed after retries:", err)
    return []
  }
}

export async function fetchMyPendingRequests(userId: string): Promise<{match: Match; requestId: string; status: string}[]> {
  try {
    const { data, error } = await guardedWithRetry(async () =>
      await supabase
        .from("match_players")
        .select(`
          id, status,
          match:matches(
            *,
            ground:grounds(*),
            organizer:players!matches_organizer_id_fkey(*),
            match_players(player:players(*))
          )
        `)
        .eq("player_id", userId)
        .eq("status", "pending"),
      "fetchMyPendingRequests",
      2
    )

    if (error) { console.error("fetchMyPendingRequests:", error); return [] }
    return (data || [])
      .filter((row: any) => row.match && row.match.status !== "cancelled" && !isMatchExpired(row))
      .map((row: any) => {
        const m = row.match
        const ground = m.ground ? toGround(m.ground) : {} as Ground
        const organizer = m.organizer ? toPlayer(m.organizer) : {} as Player
        const players = (m.match_players || [])
          .filter((mp: any) => mp.player && mp.status === "joined")
          .map((mp: any) => toPlayer(mp.player))
        return { match: toMatch(m, ground, organizer, players), requestId: row.id, status: row.status }
      })
  } catch (err) {
    console.error("fetchMyPendingRequests failed after retries:", err)
    return []
  }
}

export async function fetchMatchHistory(userId: string): Promise<Match[]> {
  // History = matches the user organized OR joined that have already passed.
  // We query both sources and merge them.
  await waitForAuthInit() // ensure auth before querying
  let createdRes: any, joinedRes: any
  try {
    [createdRes, joinedRes] = await Promise.all([
      withRetry(async () =>
        await supabase
          .from("matches")
          .select(`
            *,
            ground:grounds(*),
            organizer:players!matches_organizer_id_fkey(*),
            match_players(player:players(*))
          `)
          .eq("organizer_id", userId)
          .neq("status", "cancelled"),
        2, "fetchMatchHistory.created"
      ),
      withRetry(async () =>
        await supabase
          .from("match_players")
          .select(`
            match:matches(
              *,
              ground:grounds(*),
              organizer:players!matches_organizer_id_fkey(*),
              match_players(player:players(*))
            )
          `)
          .eq("player_id", userId)
          .eq("status", "joined"),
        2, "fetchMatchHistory.joined"
      ),
    ])
  } catch (err) {
    console.error("fetchMatchHistory failed after retries:", err)
    return []
  }

  if (createdRes.error) console.error("fetchMatchHistory created:", createdRes.error)
  if (joinedRes.error) console.error("fetchMatchHistory joined:", joinedRes.error)

  const created = (createdRes.data || [])
    .filter((row: any) => isMatchExpired(row))
    .map((row: any) => {
      const ground = row.ground ? toGround(row.ground) : {} as Ground
      const organizer = row.organizer ? toPlayer(row.organizer) : {} as Player
      const players = (row.match_players || [])
        .filter((mp: any) => mp.player && mp.status === "joined")
        .map((mp: any) => toPlayer(mp.player))
      return toMatch(row, ground, organizer, players)
    })

  const joined = (joinedRes.data || [])
    .filter((row: any) => row.match && row.match.status !== "cancelled" && isMatchExpired(row))
    .map((row: any) => {
      const m = row.match
      const ground = m.ground ? toGround(m.ground) : {} as Ground
      const organizer = m.organizer ? toPlayer(m.organizer) : {} as Player
      const players = (m.match_players || [])
        .filter((mp: any) => mp.player && mp.status === "joined")
        .map((mp: any) => toPlayer(mp.player))
      return toMatch(m, ground, organizer, players)
    })

  // Merge, dedupe by id, sort newest first
  const map = new Map<string, Match>()
  for (const m of created) map.set(m.id, m)
  for (const m of joined) map.set(m.id, m)
  return Array.from(map.values()).sort((a, b) => {
    // Sort by date+time descending (newest first)
    const da = new Date(`${a.date}T${a.startsAt}`).getTime()
    const db = new Date(`${b.date}T${b.startsAt}`).getTime()
    return db - da
  })
}

export async function removeFromHistory(matchId: string, playerId: string): Promise<boolean> {
  // Removes a joined match from the user's history by deleting their
  // match_players row. Only works for matches the user joined (not organized).
  const { error } = await supabase
    .from("match_players")
    .delete()
    .eq("match_id", matchId)
    .eq("player_id", playerId)
  if (error) { console.error("removeFromHistory:", error); return false }
  return true
}

export async function fetchIncomingRequests(userId: string): Promise<MatchJoinRequest[]> {
  // Get pending requests for all matches owned by this user
  const { data, error } = await supabase
    .from("match_players")
    .select(`
      *, player:players(*),
      match:matches!inner(id, title, organizer_id)
    `)
    .eq("status", "pending")
    .eq("match.organizer_id", userId)
    .order("requested_at", { ascending: false })

  if (error) { console.error("fetchIncomingRequests:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    player: toPlayer(row.player),
    status: row.status,
    requestedAt: new Date(row.requested_at).toLocaleString(),
    canSeePhone: row.can_see_phone,
  }))
}

// ── Player Join Status Check ─────────────────────────────────────────────────

export async function getPlayerMatchStatus(
  matchId: string,
  playerId: string
): Promise<{ status: string; requestId: string } | null> {
  const { data, error } = await supabase
    .from("match_players")
    .select("id, status")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle()

  if (error || !data) return null
  return { status: data.status, requestId: data.id }
}

// ── Phone Privacy Check ──────────────────────────────────────────────────────

export async function canSeePhone(
  matchId: string,
  viewerId: string,
  targetId: string
): Promise<boolean> {
  // Check if the match is still active (not completed)
  const { data: matchData } = await supabase
    .from("matches")
    .select("status, ends_at, organizer_id")
    .eq("id", matchId)
    .single()

  if (!matchData) return false
  if (matchData.status === "completed" || matchData.status === "cancelled") return false

  // Check if ends_at has passed
  if (matchData.ends_at && new Date(matchData.ends_at) < new Date()) return false

  // The organizer can always see phones of joined players
  if (matchData.organizer_id === viewerId) {
    const { data: targetEntry } = await supabase
      .from("match_players")
      .select("status")
      .eq("match_id", matchId)
      .eq("player_id", targetId)
      .eq("status", "joined")
      .maybeSingle()
    return !!targetEntry
  }

  // Viewer must be a joined player to see the organizer's phone
  const { data: viewerEntry } = await supabase
    .from("match_players")
    .select("can_see_phone")
    .eq("match_id", matchId)
    .eq("player_id", viewerId)
    .eq("status", "joined")
    .maybeSingle()

  return viewerEntry?.can_see_phone === true
}

// ── Fetch player phone (with privacy check) ─────────────────────────────────

export async function fetchPlayerPhone(playerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("players")
    .select("phone")
    .eq("id", playerId)
    .single()
  return data?.phone || null
}

// ── Invites ────────────────────────────────────────────────────────────────

export async function fetchAvailablePlayers(
  currentUserId: string,
  options?: { offset?: number; limit?: number; search?: string }
): Promise<{ players: Player[]; total: number }> {
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 50
  const search = options?.search?.trim().toLowerCase()

  console.log("[fetchAvailablePlayers] called with:", { currentUserId: currentUserId?.slice(0, 8), offset, limit, search })

  let query = supabase
    .from("players")
    .select("*", { count: "exact" })
    .neq("id", currentUserId)
    .in("availability", ["today", "tomorrow", "this_weekend"])

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error, count } = await query
    .order("rating", { ascending: false })
    .range(offset, offset + limit - 1)

  console.log("[fetchAvailablePlayers] result:", { dataLength: data?.length, error: error?.message, count })

  if (error) { console.error("fetchAvailablePlayers:", error); return { players: [], total: 0 } }
  return {
    players: (data || []).map((row: any) => toPlayer(row)),
    total: count ?? 0,
  }
}

export async function invitePlayer(
  matchId: string,
  playerId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("match_players")
      .insert({
        match_id: matchId,
        player_id: playerId,
        status: "invited",
        requested_at: new Date().toISOString(),
      })

    if (error) {
      // Unique violation = already invited, treat as success
      if (error.code === "23505") return true
      console.error("invitePlayer:", error)
      return false
    }

    // Fetch match and organizer details for the notification
    const { data: matchData } = await supabase
      .from("matches")
      .select("title, organizer_id")
      .eq("id", matchId)
      .single()

    let organizerName = "A player"
    let hostAvatar = undefined
    if (matchData?.organizer_id) {
      const { data: orgData } = await supabase
        .from("players")
        .select("name, avatar")
        .eq("id", matchData.organizer_id)
        .single()
      if (orgData) {
        organizerName = orgData.name
        hostAvatar = orgData.avatar
      }
    }

    const title = `Match Invite`
    const body = `${organizerName} invited you to play in "${matchData?.title || 'a match'}"`

    // 1. Send push notification via edge function
    supabase.functions.invoke("send-notification", {
      body: {
        userIds: [playerId],
        title,
        body,
        route: `/match/${matchId}`,
        category: "INVITE_ACTIONS", // Handled by Capacitor locally to show Accept/Reject
        entityId: matchId,
        priority: "high",
        imageUrl: hostAvatar
      }
    }).catch(err => console.error("invitePlayer edge function err:", err))

    // 2. Create in-app notification
    await createNotification(
      playerId,
      "invite",
      title,
      body,
      hostAvatar,
      matchId
    )

    return true
  } catch (e) {
    console.error("invitePlayer:", e)
    return false
  }
}

export async function fetchMyInvites(userId: string): Promise<Match[]> {
  try {
    const { data, error } = await withRetry(async () =>
      await supabase
        .from("match_players")
        .select(`
          match:matches(
            *,
            ground:grounds(*),
            organizer:players!matches_organizer_id_fkey(*),
            match_players(player:players(*))
          )
        `)
        .eq("player_id", userId)
        .eq("status", "invited")
        .order("requested_at", { ascending: false }),
      2, "fetchMyInvites"
    )

    if (error) { console.error("fetchMyInvites:", error); return [] }
    return (data || [])
      .filter((row: any) => row.match && row.match.status !== "cancelled")
      .map((row: any) => {
        const m = row.match
        const ground = m.ground ? toGround(m.ground) : {} as Ground
        const organizer = m.organizer ? toPlayer(m.organizer) : {} as Player
        const players = (m.match_players || [])
          .filter((mp: any) => mp.player && mp.status === "joined")
          .map((mp: any) => toPlayer(mp.player))
        return toMatch(m, ground, organizer, players)
      })
  } catch (err) {
    console.error("fetchMyInvites failed after retries:", err)
    return []
  }
}

export async function fetchMatchPlayerStatuses(matchId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("match_players")
    .select("player_id, status")
    .eq("match_id", matchId)

  if (error) { console.error("fetchMatchPlayerStatuses:", error); return {} }
  const result: Record<string, string> = {}
  data?.forEach((row: any) => {
    result[row.player_id] = row.status
  })
  return result
}

export async function respondToInvite(
  matchId: string,
  playerId: string,
  accept: boolean
): Promise<boolean> {
  // Fetch match and player details before mutating
  const { data: matchData } = await supabase
    .from("matches")
    .select("title, organizer_id")
    .eq("id", matchId)
    .single()

  const { data: playerData } = await supabase
    .from("players")
    .select("name")
    .eq("id", playerId)
    .single()

  const hostId = matchData?.organizer_id
  const matchTitle = matchData?.title || "a match"
  const playerName = playerData?.name || "A player"

  if (accept) {
    const { error } = await supabase
      .from("match_players")
      .update({ status: "joined", requested_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .eq("status", "invited")
    if (error) { console.error("respondToInvite accept:", error); return false }

    // Notify host that player accepted
    if (hostId) {
      const title = `Invite Accepted`
      const body = `${playerName} accepted your invite to "${matchTitle}"`
      supabase.functions.invoke("send-notification", {
        body: {
          userIds: [hostId],
          title,
          body,
          route: `/match/${matchId}`,
          entityId: matchId,
          priority: "default",
          channel: "match_updates",
        }
      }).catch(err => console.error("respondToInvite accept notify err:", err))
      await createNotification(hostId, "match_join", title, body, undefined, matchId)
    }
    return true
  } else {
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .eq("status", "invited")
    if (error) { console.error("respondToInvite decline:", error); return false }

    // Notify host that player declined
    if (hostId) {
      const title = `Invite Declined`
      const body = `${playerName} declined your invite to "${matchTitle}"`
      supabase.functions.invoke("send-notification", {
        body: {
          userIds: [hostId],
          title,
          body,
          route: `/match/${matchId}`,
          entityId: matchId,
          priority: "default",
          channel: "match_updates",
        }
      }).catch(err => console.error("respondToInvite decline notify err:", err))
      await createNotification(hostId, "match_cancelled", title, body, undefined, matchId)
    }
    return true
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  kind: string,
  title: string,
  body: string,
  actorAvatar?: string,
  entityId?: string
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId,
    kind,
    title,
    body,
    time: "Just now",
    read: false,
    actor_avatar: actorAvatar,
    entity_id: entityId,
  })
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await guardedWithRetry(
    () => supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    "fetchNotifications",
    2
  )

  if (error) { console.error("fetchNotifications:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    time: row.time,
    read: row.read,
    actorAvatar: row.actor_avatar,
    entityId: row.entity_id,
  }))
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false)
}

// ── Share Match Data ─────────────────────────────────────────────────────────

export async function getShareMatchData(matchId: string): Promise<{
  text: string
  title: string
  url: string
} | null> {
  const match = await fetchMatchById(matchId)
  if (!match) return null

  const slotsLeft = match.totalSlots - match.filledSlots
  const text = `🏏 Join my match at ${match.ground.name} on ${match.date} at ${match.startsAt}! ${slotsLeft} slots left. ₹${match.pricePerPlayer}/player.`
  const url = `https://turfmatch.app/match/${matchId}`

  return { text, title: match.title, url }
}

// ── Tournaments (unchanged) ──────────────────────────────────────────────────

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) { console.error("fetchTournaments:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    prize: row.prize,
    prizeAmount: row.prize_amount,
    dates: row.dates,
    startsAt: row.starts_at,
    format: row.format,
    teamsRegistered: row.teams_registered,
    teamsTotal: row.teams_total,
    registrationClosesIn: row.registration_closes_in,
    entryFee: row.entry_fee,
    image: row.image,
    rules: row.rules || [],
    bracket: row.bracket || [],
    fixtures: row.fixtures || [],
  }))
}

// ── Chat (unchanged) ─────────────────────────────────────────────────────────

export async function fetchChatThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) { console.error("fetchChatThreads:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    title: row.title,
    lastMessage: row.last_message,
    lastMessageTime: row.last_message_time,
    unread: row.unread,
    isLive: row.is_live,
  }))
}

export async function fetchChatMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) { console.error("fetchChatMessages:", error); return [] }
  return (data || []).map((row: any) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    text: row.text,
    time: row.time,
    isMine: row.is_mine,
    kind: row.kind,
    read: row.read,
  }))
}

export async function sendChatMessage(
  threadId: string,
  message: Omit<ChatMessage, "id">
): Promise<boolean> {
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    author_id: message.authorId,
    author_name: message.authorName,
    author_avatar: message.authorAvatar,
    text: message.text,
    time: message.time,
    is_mine: message.isMine ?? false,
    kind: message.kind ?? "text",
  })
  if (error) { console.error("sendChatMessage:", error); return false }
  return true
}
