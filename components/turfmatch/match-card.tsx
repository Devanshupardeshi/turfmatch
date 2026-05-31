"use client"

import { memo, useCallback, useState } from "react"
import { Clock } from "lucide-react"
import type { Match } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  onClick?: () => void
}

const STATUS_BADGE: Record<
  Match["status"],
  { label: string; className: string } | null
> = {
  open: null,
  filling_fast: {
    label: "FILLING FAST",
    className: "bg-secondary text-secondary-foreground",
  },
  locked: {
    label: "FULL",
    className: "bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)]",
  },
  live: {
    label: "LIVE",
    className: "bg-destructive text-destructive-foreground",
  },
  completed: {
    label: "COMPLETED",
    className: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  },
  cancelled: {
    label: "CANCELLED",
    className: "bg-destructive/20 text-destructive",
  },
}

function MatchCardInner({ match, onClick }: MatchCardProps) {
  const slotsLeft = match.totalSlots - match.filledSlots
  const isFull = match.status === "locked" || slotsLeft <= 0
  const statusBadge = STATUS_BADGE[match.status]
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleImgLoad = useCallback(() => setImgLoaded(true), [])

  return (
    <button
      onClick={onClick}
      disabled={isFull}
      className={cn(
        "w-full text-left gpu-layer",
        "bg-card border border-[var(--surface-container-high)] rounded-2xl overflow-hidden",
        "card-press hover:border-primary/40",
        isFull && "opacity-70",
      )}
    >
      {/* Hero ground image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={match.ground.image || "/placeholder.svg"}
          alt={match.ground.name}
          loading="lazy"
          onLoad={handleImgLoad}
          className={cn(
            "w-full h-full object-cover",
            imgLoaded && "loaded"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold tracking-wider uppercase">
            {match.skillLevel}
          </span>
          {statusBadge && (
            <span
              className={cn(
                "px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase",
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="font-display text-2xl text-white tracking-wide leading-none">
            {match.ground.name}
          </h4>
          <p className="text-white/80 text-xs flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {match.startsAt}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Players needed banner */}
        {!isFull && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">
              {slotsLeft} {slotsLeft === 1 ? "Player" : "Players"} Needed
            </span>
            <span className="text-[var(--on-surface-variant)] text-xs">
              {match.filledSlots}/{match.totalSlots} confirmed
            </span>
          </div>
        )}
        {isFull && (
          <div className="mb-3">
            <span className="text-[var(--on-surface-variant)] font-bold text-xs uppercase tracking-wider">
              Squad locked · {match.filledSlots}/{match.totalSlots}
            </span>
          </div>
        )}

        {/* Slot fill bar */}
        <div className="h-1 bg-[var(--surface-container-highest)] rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isFull ? "bg-[var(--outline)]" : "bg-primary",
            )}
            style={{
              width: `${Math.round((match.filledSlots / match.totalSlots) * 100)}%`,
            }}
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[var(--surface-container-high)]">
          <div className="flex -space-x-2">
            {match.players.slice(0, 4).map((p) => (
              <img
                key={p.id}
                src={p.avatar || "/placeholder.svg"}
                alt={p.name}
                loading="lazy"
                className="w-7 h-7 rounded-full border-2 border-card object-cover"
              />
            ))}
            {slotsLeft > 0 && (
              <span className="w-7 h-7 rounded-full bg-[var(--surface-container-high)] border-2 border-card flex items-center justify-center text-[10px] text-foreground font-bold">
                +{slotsLeft}
              </span>
            )}
          </div>

          {isFull ? (
            <span className="text-xs uppercase tracking-wider font-bold text-[var(--on-surface-variant)]">
              Slot Full
            </span>
          ) : (
            <span className="text-primary text-xs uppercase tracking-wider font-bold">
              Request to Join →
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export const MatchCard = memo(MatchCardInner)
