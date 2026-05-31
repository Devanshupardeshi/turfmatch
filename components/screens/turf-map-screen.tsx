"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { Bell, Bookmark, List, MapPin, Search, SlidersHorizontal, Star, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { GROUNDS } from "@/lib/turfmatch/data"
import { useNearbyTurfs, defaultFilterState } from "@/lib/turfmatch/nearby-turfs-store"
import { FilterSheet } from "@/components/turfmatch/filter-sheet"
import { useCoords } from "@/lib/turfmatch/location-store"
import type { Ground } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

// Leaflet pulls window/document; load purely on the client.
const MapView = dynamic(
  () => import("./turf-map-leaflet").then(m => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-low)]">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
)

// Quick-filter chips — practical sort/filter options for live turf data
type ChipKey = "ALL" | "NEAREST" | "TOP RATED" | "BUDGET" | "UNDER 5 KM"
const CHIPS: ChipKey[] = ["ALL", "NEAREST", "TOP RATED", "BUDGET", "UNDER 5 KM"]

export function TurfMapScreen() {
  const { navigate } = useNav()
  const [activeChip, setActiveChip] = useState<ChipKey>("ALL")
  const [query, setQuery] = useState("")

  const { filteredGrounds, loading, refresh, filterState } = useNearbyTurfs()
  const displayGrounds = filteredGrounds
  const [showFilters, setShowFilters] = useState(false)

  const visibleGrounds = useMemo(() => {
    let list = [...displayGrounds]

    // Apply chip sort/filter
    switch (activeChip) {
      case "NEAREST":
        list = list.filter(g => g.distanceKm <= 5)
        list.sort((a, b) => a.distanceKm - b.distanceKm)
        break
      case "TOP RATED":
        list = list.filter(g => g.rating >= 4.0)
        list.sort((a, b) => b.rating - a.rating)
        break
      case "BUDGET":
        list.sort((a, b) => a.pricePerHour - b.pricePerHour)
        break
      case "UNDER 5 KM":
        list = list.filter(g => g.distanceKm <= 5)
        list.sort((a, b) => a.distanceKm - b.distanceKm)
        break
      default: // ALL
        break
    }

    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.zone.toLowerCase().includes(q) ||
        g.location.toLowerCase().includes(q),
    )
  }, [activeChip, query, displayGrounds])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Keep selection valid when filters change
  const selected: Ground =
    visibleGrounds.find(g => g.id === selectedId) ??
    visibleGrounds[0] ??
    displayGrounds[0]

  const userLocation = useCoords()
  const [routePoints, setRoutePoints] = useState<[number, number][] | null>(null)

  useEffect(() => {
    if (!userLocation || !selected) {
      setRoutePoints(null)
      return
    }

    let isMounted = true
    const fetchRoute = async () => {
      try {
        const { fetchDirections } = await import("@/lib/turfmatch/google-maps")
        const result = await fetchDirections(userLocation.lat, userLocation.lng, selected.lat, selected.lng)
        if (result?.points && isMounted) {
          const polyline = await import('@mapbox/polyline')
          const decoded = polyline.default.decode(result.points)
          setRoutePoints(decoded)
        } else {
          if (isMounted) setRoutePoints(null)
        }
      } catch (err) {
        console.error("Error fetching directions:", err)
        if (isMounted) setRoutePoints(null)
      }
    }
    fetchRoute()
    return () => { isMounted = false }
  }, [userLocation, selected?.id, selected?.lat, selected?.lng])

  const center = useMemo<[number, number]>(() => {
    if (visibleGrounds.length === 0) {
      return displayGrounds.length > 0 
        ? [displayGrounds[0].lat, displayGrounds[0].lng] 
        : (userLocation ? [userLocation.lat, userLocation.lng] : [18.5204, 73.8567]) // Pune fallback
    }
    const lat =
      visibleGrounds.reduce((acc, g) => acc + g.lat, 0) / visibleGrounds.length
    const lng =
      visibleGrounds.reduce((acc, g) => acc + g.lng, 0) / visibleGrounds.length
    return [lat, lng]
  }, [visibleGrounds, displayGrounds, userLocation])

  return (
    <div className="h-full bg-background relative overflow-hidden isolate">
      {/* Full-bleed map underneath the chrome */}
      <div className="absolute inset-0">
        <MapView
          center={center}
          grounds={visibleGrounds}
          selectedId={selected?.id}
          onSelect={g => setSelectedId(g.id)}
          userLocation={userLocation}
          routePoints={routePoints}
        />
      </div>

      {/* Loading overlay if fetching */}
      {loading && (
        <div className="absolute inset-0 z-[350] flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Top chrome ── */}
      <div className="relative z-[400] pt-3 px-4 pb-3 pointer-events-none">
        {/* Logo pill + bell */}
        <div className="flex items-center justify-between gap-3 pointer-events-auto">
          <div
            className={cn(
              "flex items-center gap-2 pl-2 pr-4 py-2 rounded-full",
              "bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)]",
            )}
          >
            <div className="w-8 h-8 rounded-md bg-[var(--surface-container-highest)] flex items-center justify-center">
              <span className="text-[10px] font-display text-primary tracking-tight">
                TM
              </span>
            </div>
            <span className="font-display text-lg text-primary tracking-wide italic">
              TURFMATCH
            </span>
          </div>
          <button
            aria-label="Notifications"
            onClick={() => navigate("notifications")}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center",
              "bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)]",
              "text-foreground active:scale-95 transition-transform",
            )}
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Search bar */}
        <div
          className={cn(
            "mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl pointer-events-auto",
            "bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)]",
          )}
        >
          <Search className="w-4 h-4 text-[var(--outline)] shrink-0" />
          <input
            type="search"
            placeholder="Search areas or turfs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={cn(
              "flex-1 bg-transparent text-foreground placeholder:text-[var(--outline)]",
              "outline-none text-sm",
            )}
          />
          <button
            aria-label="Refresh Turfs"
            onClick={refresh}
            className="w-7 h-7 rounded-full bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-primary flex items-center justify-center transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} strokeWidth={2.2} />
          </button>
          <button
            aria-label="Filters"
            onClick={() => setShowFilters(true)}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-colors relative",
              filterState.distanceKm !== defaultFilterState.distanceKm ||
              filterState.turfTypes.length > 0 ||
              filterState.rating > 0 ||
              filterState.availableSlots ||
              filterState.sortBy !== defaultFilterState.sortBy
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-primary"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2.2} />
            {(filterState.distanceKm !== defaultFilterState.distanceKm ||
              filterState.turfTypes.length > 0 ||
              filterState.rating > 0 ||
              filterState.availableSlots ||
              filterState.sortBy !== defaultFilterState.sortBy) && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Quick-filter chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar pointer-events-auto">
          {CHIPS.map(c => {
            const isActive = c === activeChip
            return (
              <button
                key={c}
                onClick={() => setActiveChip(c)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full",
                  "text-[11px] tracking-wider uppercase font-bold",
                  "border transition-colors",
                  isActive
                    ? "bg-card border-primary text-primary shadow-[0_0_18px_var(--brand-glow)]"
                    : "bg-card/85 backdrop-blur-md border-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
                )}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Show All Turfs pill ── */}
      {selected && visibleGrounds.length > 0 && (
        <button
          onClick={() => navigate("groundsHub")}
          className={cn(
            "absolute z-[400] left-1/2 -translate-x-1/2",
            "bottom-[260px]",
            "px-5 py-2.5 rounded-full",
            "bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)]",
            "text-primary font-bold text-xs uppercase tracking-wider",
            "flex items-center gap-2",
            "active:scale-95 transition-transform",
            "shadow-lg shadow-black/20",
          )}
        >
          <List className="w-4 h-4" />
          Show All Turfs ({visibleGrounds.length})
        </button>
      )}

      {/* ── Bottom turf card with left/right arrows ── */}
      {selected && (
        <div className="absolute bottom-[88px] left-0 right-0 z-[400] px-4 animate-fade-in">
          <div className="relative flex items-center gap-1">
            {/* Left arrow */}
            {visibleGrounds.length > 1 && (
              <button
                onClick={() => {
                  const idx = visibleGrounds.findIndex(g => g.id === selected.id)
                  const prev = (idx - 1 + visibleGrounds.length) % visibleGrounds.length
                  setSelectedId(visibleGrounds[prev].id)
                }}
                aria-label="Previous turf"
                className="shrink-0 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)] flex items-center justify-center text-foreground active:scale-90 transition-transform z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Card — key change triggers CSS animation */}
            <button
              key={selected.id}
              onClick={() => navigate("groundDetail", { groundId: selected.id })}
              className={cn(
                "flex-1 min-w-0 text-left",
                "bg-card/95 backdrop-blur-md border border-[var(--surface-container-high)]",
                "rounded-3xl p-3",
                "active:scale-[0.99] transition-transform",
                "animate-[slideIn_0.25s_ease-out]",
              )}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex gap-3">
                {/* Thumbnail with rating chip */}
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                  <img
                    src={selected.image || "/placeholder.svg"}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={cn(
                      "absolute top-1.5 left-1.5",
                      "flex items-center gap-1 bg-secondary/95 text-secondary-foreground",
                      "px-1.5 py-0.5 rounded-md text-[10px] font-extrabold",
                    )}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {selected.rating}
                  </div>
                </div>

                {/* Right content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-foreground text-lg leading-tight uppercase truncate">
                      {selected.name}
                    </h3>
                    <Bookmark className="w-5 h-5 text-[var(--on-surface-variant)] shrink-0 -mt-0.5" />
                  </div>

                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="flex items-center gap-1 text-[var(--on-surface-variant)]">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {selected.distanceKm} km
                    </span>
                    <span className="text-[var(--outline)]">·</span>
                    <span className="text-primary font-bold">
                      ₹{selected.pricePerHour}/hr
                    </span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      navigate("groundDetail", { groundId: selected.id })
                    }}
                    className={cn(
                      "mt-2 w-full py-2.5 rounded-xl",
                      "bg-primary text-primary-foreground",
                      "font-display text-sm uppercase tracking-wider",
                      "shadow-[0_0_18px_var(--brand-glow)]",
                      "active:scale-[0.98] transition-transform",
                    )}
                  >
                    Quick Book
                  </button>
                </div>
              </div>
            </button>

            {/* Right arrow */}
            {visibleGrounds.length > 1 && (
              <button
                onClick={() => {
                  const idx = visibleGrounds.findIndex(g => g.id === selected.id)
                  const next = (idx + 1) % visibleGrounds.length
                  setSelectedId(visibleGrounds[next].id)
                }}
                aria-label="Next turf"
                className="shrink-0 w-8 h-8 rounded-full bg-card/90 backdrop-blur-md border border-[var(--surface-container-high)] flex items-center justify-center text-foreground active:scale-90 transition-transform z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Counter dots */}
          {visibleGrounds.length > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {visibleGrounds.slice(0, 8).map((g, i) => (
                <div
                  key={g.id}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    g.id === selected.id ? "w-5 bg-primary" : "w-1.5 bg-[var(--surface-container-highest)]",
                  )}
                />
              ))}
              {visibleGrounds.length > 8 && (
                <span className="text-[9px] text-[var(--on-surface-variant)] ml-1 self-center">
                  +{visibleGrounds.length - 8}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty filter result hint */}
      {visibleGrounds.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-card/95 backdrop-blur-md border border-[var(--surface-container-high)] rounded-2xl px-4 py-3 text-center">
          <p className="text-foreground text-sm font-bold">No turfs match</p>
          <p className="text-[var(--on-surface-variant)] text-xs mt-1">
            Try adjusting your filters or search
          </p>
          <button 
            onClick={() => setShowFilters(true)}
            className="mt-3 px-4 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider"
          >
            Filters
          </button>
        </div>
      )}

      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
      />
    </div>
  )
}
