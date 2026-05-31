"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, ChevronRight, MapPin, RefreshCw, SlidersHorizontal, Trophy } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { useMatches, useMe, useMyMatches, useNotificationBadge } from "@/lib/turfmatch/use-supabase"
import { MatchCard } from "@/components/turfmatch/match-card"

import { TmButton } from "@/components/turfmatch/tm-button"
import { AvailabilityCard } from "@/components/turfmatch/availability-card"
import { useLocation } from "@/lib/turfmatch/location-store"
import { cn } from "@/lib/utils"

type FeedFilter = "near_me" | "this_weekend" | "open_to_guests" | "all_pune"

const FILTER_PILLS: { id: FeedFilter; label: string }[] = [
  { id: "near_me", label: "Near Me" },
  { id: "this_weekend", label: "This Weekend" },
  { id: "open_to_guests", label: "Open to Guests" },
  { id: "all_pune", label: "All Pune" },
]



export function HomeScreen() {
  const { navigate } = useNav()
  const { me } = useMe()
  const { matches, loading, refresh } = useMatches()
  const { location: currentLocation, loading: locationLoading } = useLocation()

  const [filter, setFilter] = useState<FeedFilter>("near_me")
  const [matchLimit, setMatchLimit] = useState(20)

  const [showRetry, setShowRetry] = useState(false)

  // Show a retry button if loading spinner sits for > 5s
  useEffect(() => {
    if (!loading) { setShowRetry(false); return }
    const timer = setTimeout(() => setShowRetry(true), 5_000)
    return () => clearTimeout(timer)
  }, [loading])

  const { created, joined, pending } = useMyMatches()
  const { unreadCount } = useNotificationBadge()
  const activeMatchCount = created.length + joined.length
  const pendingCount = pending.length
  
  const upcomingMatches = useMemo(() => {
    return [...matches]
      .filter((m) => ["open", "upcoming", "filling_fast"].includes(m.status))
      .filter((m) => {
        switch (filter) {
          case "near_me": return true
          case "this_weekend": return m.day === "Sat" || m.day === "Sun"
          case "open_to_guests": return (m.slots?.open ?? 0) > 0
          case "all_pune": return true
          default: return true
        }
      })
      .sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime())
  }, [matches, filter])

  const displayedMatches = useMemo(() => {
    return upcomingMatches.slice(0, matchLimit)
  }, [upcomingMatches, matchLimit])

  const hasMoreMatches = upcomingMatches.length > matchLimit



  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header — repo design: location + brand + bell */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-[var(--surface-container-high)]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("profile")}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--on-surface-variant)] flex items-center gap-1.5">
                Current Location
                {locationLoading && (
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </p>
              <h2 className="text-foreground font-bold text-sm leading-tight max-w-[220px] line-clamp-2">
                {currentLocation}
              </h2>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("notifications")}
              aria-label="Notifications"
              className="relative p-2 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] rounded-full active:scale-90 transition-transform"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <button
              onClick={() => navigate("profile")}
              aria-label="Profile"
              className="active:scale-95 transition-transform"
            >
              <img
                src={me?.avatar || "/placeholder.svg"}
                alt={me?.name || "Profile"}
                className="w-9 h-9 rounded-full border border-[var(--surface-container-high)] object-cover"
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-nav-xl">
        {/* Availability toggle */}
        <div className="px-5 pt-4">
          <AvailabilityCard />
        </div>

        {/* Your Matches quick-action */}
        <div className="px-5 pt-3">
          <button
            onClick={() => navigate("yourMatches")}
            className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-foreground font-bold text-sm">Your Matches</p>
              <p className="text-[var(--on-surface-variant)] text-xs">
                {activeMatchCount > 0 ? `${activeMatchCount} active` : "No active matches"}
                {pendingCount > 0 && ` · ${pendingCount} pending`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--outline)]" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {FILTER_PILLS.map(p => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border",
                  filter === p.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-[var(--on-surface-variant)] border-[var(--surface-container-high)]",
                )}
              >
                {p.label}
              </button>
            ))}

          </div>
        </div>

        {/* Section header */}
        <div className="px-5 pt-4 pb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary">
              Live Feed
            </p>
            <h3 className="font-display text-2xl text-foreground tracking-wide leading-none mt-1">
              Matches Near You
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] font-bold">
            {upcomingMatches.length} {upcomingMatches.length === 1 ? "Match" : "Matches"} Found
          </span>
        </div>

        {/* Match list */}
        <div className="px-5 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <MatchSkeleton />
              <MatchSkeleton />
              <MatchSkeleton />
              {showRetry && (
                <div className="flex justify-center pt-2">
                  <TmButton variant="outline" onClick={() => refresh()} className="text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry loading matches
                  </TmButton>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Matches Near You
                </h3>
                <span className="text-sm font-bold text-primary">{upcomingMatches.length} matches</span>
              </div>
              {displayedMatches.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {displayedMatches.map((match) => (
                      <MatchCard key={match.id} match={match} onClick={() => navigate("matchDetail", { matchId: match.id })} />
                    ))}
                  </div>
                  {hasMoreMatches && (
                    <button
                      onClick={() => setMatchLimit((l) => l + 20)}
                      className="w-full py-3 rounded-xl border border-[var(--outline-variant)] text-sm font-medium text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)] transition-colors"
                    >
                      Load More Matches
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-container)] mx-auto flex items-center justify-center">
                    <SlidersHorizontal className="w-8 h-8 text-[var(--outline)]" />
                  </div>
                  <p className="text-sm text-[var(--on-surface-variant)]">No upcoming matches in this area</p>
                  <TmButton variant="primary" onClick={() => navigate("createMatch")}>
                    <Trophy className="w-4 h-4" /> Host a Match
                  </TmButton>
                </div>
              )}
            </div>
          )}
          {/* Trailing spacer — ensures the last card is never clipped by the bottom nav on small phones */}
          <div className="h-24" aria-hidden="true" />
        </div>
      </div>


    </div>
  )
}



function EmptyMatches({ onHost }: { onHost: () => void }) {
  return (
    <div className="bg-card border border-dashed border-[var(--surface-container-high)] rounded-3xl p-8 text-center">
      <p className="text-foreground font-bold mb-1">No matches near you yet</p>
      <p className="text-[var(--on-surface-variant)] text-sm mb-4">
        Be the first to host one in your area.
      </p>
      <TmButton variant="outline" onClick={onHost} fullWidth={false} className="px-6">
        Host a match
      </TmButton>
    </div>
  )
}

function MatchSkeleton() {
  return (
    <div className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl overflow-hidden">
      <div className="h-32 skeleton" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 rounded-full skeleton" />
          <div className="h-3 w-16 rounded-full skeleton" />
        </div>
        <div className="h-2 w-full rounded-full skeleton" />
        <div className="flex justify-between items-center pt-2">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-card skeleton" />
            ))}
          </div>
          <div className="h-3 w-20 rounded-full skeleton" />
        </div>
      </div>
    </div>
  )
}
