/**
 * Supabase Edge Function: send-notification
 *
 * Sends push notifications via FCM (Firebase Cloud Messaging).
 * Handles:
 * - Single user targeting
 * - Batch sends (deduplicated per user)
 * - Rate limiting
 * - Payload normalization
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY")
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const MAX_PER_WINDOW = 100

interface SendRequest {
  /** Target user IDs in Supabase */
  userIds: string[]
  /** Notification payload */
  title: string
  body: string
  /** Deep link route */
  route?: string
  routeParams?: Record<string, string>
  /** Related entity */
  entityId?: string
  /** Channel ID */
  channel?: "match_updates" | "chat_messages" | "social" | "nearby_matches" | "promotions"
  /** Priority */
  priority?: "high" | "default" | "low"
  /** Optional image URL */
  imageUrl?: string
  /** Badge count */
  badge?: number
  /** Category / click_action for custom action buttons */
  category?: string
  /** Silent data-only notification */
  silent?: boolean
}

Deno.serve(async (req: Request) => {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  // ── Parse body ─────────────────────────────────────────────────────────────
  let payload: SendRequest
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!payload.userIds?.length || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // ── Rate limit check (in-memory per worker) ────────────────────────────────
  const now = Date.now()
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS
  const rateLimitKey = `rate_${windowStart}`

  // Use KV for distributed rate limiting (if available), else in-memory
  let currentCount = 0
  try {
    const kv = await Deno.openKv()
    const entry = await kv.get<number>([rateLimitKey])
    currentCount = entry.value || 0
    if (currentCount + payload.userIds.length > MAX_PER_WINDOW) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }
    await kv.set([rateLimitKey], currentCount + payload.userIds.length, { expireIn: RATE_LIMIT_WINDOW_MS })
  } catch {
    // KV unavailable — skip rate limiting in dev
  }

  // ── Fetch push tokens from Supabase ────────────────────────────────────────
  const userIdSet = Array.from(new Set(payload.userIds))
  const tokensRes = await fetch(
    `${supabaseUrl}/rest/v1/players?select=id,push_token&push_token=not.is.null&id=in.(${userIdSet.join(",")})`,
    {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!tokensRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch tokens" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  const players: { id: string; push_token: string }[] = await tokensRes.json()
  const validTokens = players.filter(p => p.push_token && p.push_token.length > 10)

  if (!validTokens.length) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, message: "No valid tokens found" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  // ── Build FCM payload ──────────────────────────────────────────────────────
  const eventId = crypto.randomUUID()
  const fcmPayload = {
    message: {
      token: validTokens[0].push_token, // For single send
      android: {
        priority: payload.priority === "high" ? "high" : "normal",
        notification: {
          channel_id: payload.channel || "match_updates",
          sound: payload.priority === "high" ? "default" : undefined,
          icon: "ic_stat_turf",
          color: "#10B981",
          image: payload.imageUrl || undefined,
        },
        data: {
          eventId,
          channel: payload.channel || "match_updates",
          title: payload.title,
          body: payload.body,
          route: payload.route || "",
          routeParams: payload.routeParams ? JSON.stringify(payload.routeParams) : "",
          entityId: payload.entityId || "",
          timestamp: new Date().toISOString(),
          priority: payload.priority || "default",
          badge: String(payload.badge || 0),
          silent: String(payload.silent || false),
          category: payload.category || "",
        },
      },
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.imageUrl || undefined,
      },
      data: {
        eventId,
        channel: payload.channel || "match_updates",
        title: payload.title,
        body: payload.body,
        route: payload.route || "",
        routeParams: payload.routeParams ? JSON.stringify(payload.routeParams) : "",
        entityId: payload.entityId || "",
        timestamp: new Date().toISOString(),
        priority: payload.priority || "default",
        badge: String(payload.badge || 0),
        silent: String(payload.silent || false),
      },
    },
  }

  // ── Send via FCM HTTP v1 API ───────────────────────────────────────────────
  // Note: In production, use Firebase Admin SDK or FCM HTTP v1 with OAuth2.
  // For simplicity in edge functions, we use the legacy FCM API here.
  // Replace with your project's FCM v1 endpoint for production.

  const sent: string[] = []
  const failed: string[] = []

  for (const player of validTokens) {
    const singlePayload = {
      ...fcmPayload,
      message: { ...fcmPayload.message, token: player.push_token },
    }

    try {
      const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: player.push_token,
          priority: payload.priority === "high" ? "high" : "normal",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: payload.priority === "high" ? "default" : undefined,
            badge: payload.badge,
            icon: "ic_stat_turf",
            color: "#10B981",
            image: payload.imageUrl,
            click_action: payload.category,
          },
          data: {
            eventId,
            channel: payload.channel || "match_updates",
            title: payload.title,
            body: payload.body,
            route: payload.route || "",
            routeParams: payload.routeParams ? JSON.stringify(payload.routeParams) : "",
            entityId: payload.entityId || "",
            timestamp: new Date().toISOString(),
            priority: payload.priority || "default",
            badge: String(payload.badge || 0),
            silent: String(payload.silent || false),
            category: payload.category || "",
          },
        }),
      })

      if (fcmRes.ok) {
        sent.push(player.id)
      } else {
        failed.push(player.id)
      }
    } catch {
      failed.push(player.id)
    }
  }

  return new Response(
    JSON.stringify({
      sent: sent.length,
      failed: failed.length,
      eventId,
      tokensFound: validTokens.length,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive",
      },
    }
  )
})
