"use client"

import { useState } from "react"
import {
  Calendar,
  MapPin,
  MessageCircle,
  Shield,
  Star,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmButton } from "@/components/turfmatch/tm-button"
import { PLAYERS } from "@/lib/turfmatch/data"
import { usePlayer } from "@/lib/turfmatch/use-supabase"
import type { AvailabilityWindow } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const AVAILABILITY_LABEL: Record<
  AvailabilityWindow,
  { text: string; tone: string }
> = {
  today: { text: "Available today", tone: "bg-primary/15 text-primary" },
  tomorrow: { text: "Available tomorrow", tone: "bg-primary/15 text-primary" },
  this_weekend: {
    text: "Available this weekend",
    tone: "bg-secondary/15 text-secondary",
  },
  not_available: {
    text: "Not playing this week",
    tone: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  },
}

export function PlayerProfileScreen({ playerId }: { playerId?: string }) {
  const { goBack, navigate } = useNav()
  const { player: dbPlayer } = usePlayer(playerId)
  const player = dbPlayer || PLAYERS.find(p => p.id === playerId) || PLAYERS[1]
  const [connected, setConnected] = useState(player.isFriend)
  const av = AVAILABILITY_LABEL[player.availability]

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader onBack={goBack} />
      <div className="flex-1 overflow-y-auto px-5 pb-12">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-50 blur" />
            <img
              src={player.avatar || "/placeholder.svg"}
              alt={player.name}
              className="relative w-28 h-28 rounded-full border-4 border-card object-cover"
            />
            {player.badge && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-background uppercase tracking-wider">
                {player.badge}
              </span>
            )}
          </div>
          <h2 className="font-display text-3xl text-foreground tracking-wide mt-4">
            {player.name}
          </h2>
          <p className="text-[var(--on-surface-variant)] text-sm mt-1 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {player.role} · Lv {player.level} · {player.zone} ·{" "}
            {player.distanceKm} km
          </p>
          <div className="mt-3">
            <span
              className={cn(
                "inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                av.tone,
              )}
            >
              <Calendar className="inline w-3 h-3 mr-1" />
              {av.text}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="bg-secondary/15 text-secondary text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Star className="w-3 h-3 fill-current" />{" "}
              {player.rating.toFixed(1)}
            </span>
            <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Shield className="w-3 h-3" /> {player.reliability}%
            </span>
            <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Zap className="w-3 h-3" /> Lv {player.level}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex justify-center gap-2 mb-8">
          <TmButton
            variant={connected ? "secondary" : "primary"}
            onClick={() => setConnected(c => !c)}
            fullWidth={false}
            className="px-6 py-2.5"
          >
            {connected ? (
              "Squad teammate"
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Add to squad
              </>
            )}
          </TmButton>
          <TmButton
            variant="outline"
            fullWidth={false}
            className="px-4 py-2.5"
            onClick={() => navigate("chatInbox")}
          >
            <MessageCircle className="w-4 h-4" />
          </TmButton>
        </div>

        {/* Career Stats */}
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">
            Career Stats
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Stat
            label="Matches"
            value={player.careerStats.matches.toString()}
          />
          <Stat
            label="Win Rate"
            value={`${player.careerStats.winRatePct}%`}
          />
          <Stat
            label="Runs"
            value={player.careerStats.runs.toLocaleString()}
            extra={
              player.careerStats.runsTopPercentile
                ? `Top ${player.careerStats.runsTopPercentile}%`
                : undefined
            }
          />
          <Stat
            label="Wickets"
            value={player.careerStats.wickets.toString()}
            extra={
              player.careerStats.economy
                ? `Econ: ${player.careerStats.economy}`
                : undefined
            }
          />
        </div>

        {/* Recent Form */}
        <h3 className="text-foreground font-bold text-sm uppercase tracking-wider mb-3">
          Recent Form
        </h3>
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 mb-6">
          <div className="flex gap-2 mb-4">
            {player.recentForm.map((r, i) => (
              <span
                key={i}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                  r.result === "W"
                    ? "bg-primary text-primary-foreground"
                    : r.result === "L"
                      ? "bg-destructive/20 text-destructive border border-destructive"
                      : "bg-secondary/15 text-secondary",
                )}
                title={`${r.result} vs ${r.vsTeam} ${r.margin}`}
              >
                {r.result}
              </span>
            ))}
          </div>
          <ul className="space-y-2">
            {player.recentForm.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">
                  {r.result === "W" ? "Won" : r.result === "L" ? "Lost" : "Tied"}{" "}
                  {r.margin}
                </span>
                <span className="text-[var(--on-surface-variant)] text-xs">
                  vs {r.vsTeam}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reliability explainer */}
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-bold mb-2">
            Reliability score · {player.reliability}%
          </p>
          <p className="text-foreground text-sm leading-relaxed">
            Calculated from confirmed-match attendance over the last 90 days.
            Players above 85% are auto-approved for any open match.
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: string
}) {
  return (
    <div className="bg-card border border-[var(--surface-container-high)] p-4 rounded-2xl">
      <p className="text-[var(--on-surface-variant)] text-[10px] uppercase tracking-wider font-bold mb-1">
        {label}
      </p>
      <p className="font-display text-3xl text-foreground tracking-wide leading-none">
        {value}
      </p>
      {extra && <p className="text-primary text-[11px] font-bold mt-1.5">{extra}</p>}
    </div>
  )
}
