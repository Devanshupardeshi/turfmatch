"use client"

import { useMemo, useState } from "react"
import { Search, Shield, Star, Calendar, Zap } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { PLAYERS, ME } from "@/lib/turfmatch/data"
import { usePlayers, useMe } from "@/lib/turfmatch/use-supabase"
import type { AvailabilityWindow, PlayerRole } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const ROLE_FILTERS: ("All" | PlayerRole)[] = [
  "All",
  "Batsman",
  "Bowler",
  "All-Rounder",
  "Wicket-Keeper",
]

const AVAILABILITY_FILTERS: { id: "any" | AvailabilityWindow; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_weekend", label: "This weekend" },
]

const AVAILABILITY_LABEL: Record<AvailabilityWindow, { text: string; tone: string }> = {
  today: { text: "Available today", tone: "bg-primary/15 text-primary" },
  tomorrow: { text: "Available tomorrow", tone: "bg-primary/15 text-primary" },
  this_weekend: { text: "Available this weekend", tone: "bg-secondary/15 text-secondary" },
  not_available: {
    text: "Not playing this week",
    tone: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  },
}

export function PlayersScreen() {
  const { navigate, goBack } = useNav()
  const { players: dbPlayers } = usePlayers()
  const { me } = useMe()
  const currentUser = me || ME
  const allPlayers = dbPlayers.length > 0 ? dbPlayers : PLAYERS
  const [query, setQuery] = useState("")
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]>("All")
  const [availability, setAvailability] =
    useState<(typeof AVAILABILITY_FILTERS)[number]["id"]>("any")
  const [scope, setScope] = useState<"nearby" | "all_pune">("nearby")

  const players = useMemo(() => {
    let list = allPlayers.filter(p => p.id !== currentUser.id)
    if (query) list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    if (role !== "All") list = list.filter(p => p.role === role)
    if (availability !== "any") list = list.filter(p => p.availability === availability)
    if (scope === "nearby") {
      list = list.filter(p => p.distanceKm <= 8)
      list.sort((a, b) => a.distanceKm - b.distanceKm)
    } else {
      list.sort((a, b) => b.reliability - a.reliability || a.distanceKm - b.distanceKm)
    }
    return list
  }, [query, role, availability, scope, allPlayers, currentUser.id])

  const availableCount = players.filter(p => p.availability !== "not_available").length

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="Players"
        subtitle={`${availableCount} available · Pune`}
        onBack={goBack}
      />

      <div className="px-5 pt-2 pb-3 bg-background sticky top-[68px] z-20">
        {/* Nearby vs All Pune scope toggle */}
        <div className="flex bg-card border border-[var(--surface-container-high)] rounded-full p-1 mb-3">
          {(["nearby", "all_pune"] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-colors",
                scope === s
                  ? "bg-primary text-primary-foreground"
                  : "text-[var(--on-surface-variant)]",
              )}
            >
              {s === "nearby" ? "Nearby (8 km)" : "All Pune"}
            </button>
          ))}
        </div>

        <label className="relative block mb-3">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players"
            className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl pl-11 pr-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary"
          />
        </label>

        {/* Availability filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {AVAILABILITY_FILTERS.map(a => (
            <button
              key={a.id}
              onClick={() => setAvailability(a.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5",
                availability === a.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-[var(--on-surface-variant)] border border-[var(--surface-container-high)]",
              )}
            >
              <Calendar className="w-3 h-3" />
              {a.label}
            </button>
          ))}
        </div>

        {/* Role filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mt-1">
          {ROLE_FILTERS.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors",
                role === r
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-card text-[var(--on-surface-variant)] border border-[var(--surface-container-high)]",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 space-y-3">
        {players.length === 0 && (
          <p className="text-center text-[var(--on-surface-variant)] text-sm py-12">
            No players match your filters.
          </p>
        )}
        {players.map(p => {
          const av = AVAILABILITY_LABEL[p.availability]
          return (
            <button
              key={p.id}
              onClick={() => navigate("playerProfile", { playerId: p.id })}
              className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            >
              <div className="relative shrink-0">
                <img
                  src={p.avatar || "/placeholder.svg"}
                  alt={p.name}
                  className="w-14 h-14 rounded-full object-cover border border-[var(--surface-container-high)]"
                />
                {p.availability !== "not_available" && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-foreground font-bold truncate">{p.name}</p>
                  {p.badge === "Elite" && (
                    <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Elite
                    </span>
                  )}
                </div>
                <p className="text-[var(--on-surface-variant)] text-xs mt-0.5">
                  {p.role} · {p.zone} · {p.distanceKm} km
                </p>
                <div className="flex gap-3 mt-1.5 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1 text-secondary">
                    <Star className="w-3 h-3 fill-current" /> {p.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Shield className="w-3 h-3" /> {p.reliability}%
                  </span>
                  <span className="flex items-center gap-1 text-[var(--on-surface-variant)]">
                    <Zap className="w-3 h-3" /> Lv {p.level}
                  </span>
                </div>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      av.tone,
                    )}
                  >
                    {av.text}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
