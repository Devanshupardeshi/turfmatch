"use client"

import { Check, Loader2, Shield, Star, X, Zap } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { JOIN_REQUESTS, MATCHES } from "@/lib/turfmatch/data"
import { useMatch, useJoinRequests } from "@/lib/turfmatch/use-supabase"
import type { MatchJoinRequest } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

type Status = MatchJoinRequest["status"]

export function ManageRequestsScreen({ matchId }: { matchId?: string }) {
  const { goBack, navigate } = useNav()
  const { match: dbMatch } = useMatch(matchId)
  const match = dbMatch || MATCHES.find(m => m.id === matchId) || MATCHES[0]
  const { requests: dbRequests, loading, respond } = useJoinRequests(matchId)

  // Use DB requests if available, otherwise fall back to mock
  const mockRequests = JOIN_REQUESTS.filter(r => r.matchId === match.id)
  const requests = dbRequests.length > 0 ? dbRequests : mockRequests

  const handleAccept = async (reqId: string) => {
    await respond(reqId, "joined")
  }

  const handleDecline = async (reqId: string) => {
    await respond(reqId, "declined")
  }

  const pending = requests.filter(r => r.status === "pending")

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="Join requests"
        subtitle={`${pending.length} pending · ${match.title}`}
        onBack={goBack}
      />

      <div className="px-5 pt-4 pb-2 bg-background sticky top-[68px] z-10">
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-foreground font-bold text-sm truncate">
              {match.title}
            </p>
            <p className="text-[var(--on-surface-variant)] text-xs">
              {match.startsAt} · {match.filledSlots}/{match.totalSlots} confirmed
            </p>
          </div>
          <button
            onClick={() => navigate("matchDetail", { matchId: match.id })}
            className="text-primary text-xs font-bold uppercase tracking-wider shrink-0"
          >
            View match →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-12 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-foreground font-bold mb-1">No requests yet</p>
            <p className="text-[var(--on-surface-variant)] text-sm">
              Players who request to join will appear here.
            </p>
          </div>
        ) : (
          requests.map(req => {
            const p = req.player
            const auto = p.reliability >= 85
            return (
              <div
                key={req.id}
                className={cn(
                  "bg-card border rounded-2xl p-4 transition-colors",
                  req.status === "accepted"
                    ? "border-primary/40"
                    : req.status === "declined"
                      ? "border-destructive/40 opacity-60"
                      : "border-[var(--surface-container-high)]",
                )}
              >
                <button
                  onClick={() =>
                    navigate("playerProfile", { playerId: p.id })
                  }
                  className="w-full flex items-center gap-3 text-left mb-3"
                >
                  <img
                    src={p.avatar || "/placeholder.svg"}
                    alt={p.name}
                    className="w-12 h-12 rounded-full object-cover border border-[var(--surface-container-high)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-bold truncate">
                        {p.name}
                      </p>
                      {auto && (
                        <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Auto-approve
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--on-surface-variant)] text-xs mt-0.5">
                      {p.role} · {p.zone} · Requested {req.requestedAt}
                    </p>
                    <div className="flex gap-3 mt-1.5 text-[11px] flex-wrap">
                      <span className="flex items-center gap-1 text-secondary">
                        <Star className="w-3 h-3 fill-current" />{" "}
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <Shield className="w-3 h-3" /> {p.reliability}%
                      </span>
                      <span className="flex items-center gap-1 text-[var(--on-surface-variant)]">
                        <Zap className="w-3 h-3" /> Lv {p.level}
                      </span>
                    </div>
                  </div>
                </button>

                {req.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 bg-primary text-primary-foreground font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 active:scale-[0.97] transition-transform"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="flex-1 bg-card text-destructive font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 border border-destructive/30 active:scale-[0.97] transition-transform"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-center text-xs font-bold uppercase tracking-wider py-2",
                      req.status === "accepted"
                        ? "text-primary"
                        : "text-destructive",
                    )}
                  >
                    {req.status === "accepted"
                      ? "✓ In the squad"
                      : "Declined"}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
