"use client"

import { Filter, Map, MapPin, Star, RefreshCw, ChevronLeft, ChevronRight, Navigation } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { useNearbyTurfs, defaultFilterState } from "@/lib/turfmatch/nearby-turfs-store"
import { FilterSheet } from "@/components/turfmatch/filter-sheet"
import { useState, useCallback } from "react"
import type { Ground } from "@/lib/turfmatch/types"

export function GroundsHubScreen() {
  const { navigate, goBack } = useNav()
  const { grounds, filteredGrounds, loading, refresh, source, filterState } = useNearbyTurfs()
  const [showFilters, setShowFilters] = useState(false)
  const [featuredIdx, setFeaturedIdx] = useState(0)

  const featuredTurf: Ground | null = filteredGrounds.length > 0
    ? filteredGrounds[featuredIdx % filteredGrounds.length]
    : null

  const goPrev = useCallback(() => {
    setFeaturedIdx(prev => {
      const len = filteredGrounds.length
      return len === 0 ? 0 : (prev - 1 + len) % len
    })
  }, [filteredGrounds.length])

  const goNext = useCallback(() => {
    setFeaturedIdx(prev => {
      const len = filteredGrounds.length
      return len === 0 ? 0 : (prev + 1) % len
    })
  }, [filteredGrounds.length])

  // Wait until loading finishes, then use fetched grounds (fallback is handled in hook)
  if (loading) {
    return (
      <div className="h-full bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader
        title="Turfs Near You"
        subtitle={
          <div className="flex items-center gap-2 text-xs">
            <span>{filteredGrounds.length} grounds found</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              source === "places" ? "bg-emerald-500/20 text-emerald-400" :
              source === "mock" ? "bg-amber-500/20 text-amber-400" :
              "bg-blue-500/20 text-blue-400"
            }`}>
              {source === "places" ? "LIVE" : source === "mock" ? "OFFLINE" : "DB"}
            </span>
          </div>
        }
        onBack={goBack}
        rightSlot={
          <div className="flex items-center gap-1 -mr-2">
            <button
              aria-label="Refresh"
              onClick={refresh}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-300"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              aria-label="Map view"
              onClick={() => navigate("turfMap")}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-300"
            >
              <Map className="w-5 h-5" />
            </button>
            <button
              aria-label="Filter"
              onClick={() => setShowFilters(true)}
              className={`p-2 rounded-full hover:bg-slate-800 relative ${
                filterState.distanceKm !== defaultFilterState.distanceKm ||
                filterState.turfTypes.length > 0 ||
                filterState.rating > 0 ||
                filterState.availableSlots ||
                filterState.sortBy !== defaultFilterState.sortBy
                  ? "text-emerald-400"
                  : "text-slate-300"
              }`}
            >
              <Filter className="w-5 h-5" />
              {(filterState.distanceKm !== defaultFilterState.distanceKm ||
                filterState.turfTypes.length > 0 ||
                filterState.rating > 0 ||
                filterState.availableSlots ||
                filterState.sortBy !== defaultFilterState.sortBy) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24 space-y-4">

        {/* ── Featured Turf Carousel ─────────────────────────────────── */}
        {featuredTurf && (
          <div className="relative mb-2">
            {/* Label */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">
                Featured Turf
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                {(featuredIdx % filteredGrounds.length) + 1} / {filteredGrounds.length}
              </p>
            </div>

            {/* Card */}
            <button
              onClick={() => navigate("groundDetail", { groundId: featuredTurf.id })}
              className="w-full text-left relative rounded-3xl overflow-hidden active:scale-[0.98] transition-transform group"
            >
              <img
                src={featuredTurf.image || "/placeholder.svg"}
                alt={featuredTurf.name}
                className="w-full h-52 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg"
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Content over image */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-white truncate drop-shadow-lg">
                      {featuredTurf.name}
                    </h2>
                    <p className="text-slate-300 text-sm flex items-center gap-1.5 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {featuredTurf.location} · {featuredTurf.distanceKm} km
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="flex items-center gap-1 bg-slate-900/70 backdrop-blur-sm text-yellow-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <Star className="w-3 h-3 fill-current" /> {featuredTurf.rating}
                      {featuredTurf.userRatingCount ? (
                        <span className="text-slate-400 font-medium">({featuredTurf.userRatingCount})</span>
                      ) : null}
                    </span>
                    <span className="bg-emerald-500/20 backdrop-blur-sm text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                      ₹{featuredTurf.pricePerHour}/hr
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Navigation Arrows */}
            {filteredGrounds.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev() }}
                  aria-label="Previous turf"
                  className="absolute left-2 top-1/2 -translate-y-1/2 mt-3 w-9 h-9 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 active:scale-90 transition-all z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext() }}
                  aria-label="Next turf"
                  className="absolute right-2 top-1/2 -translate-y-1/2 mt-3 w-9 h-9 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 active:scale-90 transition-all z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dot indicators */}
            {filteredGrounds.length > 1 && filteredGrounds.length <= 10 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {filteredGrounds.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFeaturedIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === featuredIdx % filteredGrounds.length
                        ? "w-6 bg-emerald-400"
                        : "w-1.5 bg-slate-700 hover:bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Divider ────────────────────────────────────────────────── */}
        {filteredGrounds.length > 0 && (
          <div className="flex items-center gap-3 pt-1 pb-2">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              All Turfs
            </p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
        )}

        {/* ── Turf List ──────────────────────────────────────────────── */}
        {filteredGrounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Filter className="w-10 h-10 mb-2 opacity-20" />
            <p>No turfs match your filters</p>
            <button 
              onClick={() => setShowFilters(true)}
              className="mt-4 text-emerald-400 font-medium text-sm hover:underline"
            >
              Adjust Filters
            </button>
          </div>
        ) : (
          filteredGrounds.map(g => (
          <button
            key={g.id}
            onClick={() => navigate("groundDetail", { groundId: g.id })}
            className="w-full text-left bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
          >
            <img
              src={g.image || "/placeholder.svg"}
              alt={g.name}
              className="w-full h-40 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg"
              }}
            />
            <div className="p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{g.name}</h3>
                  <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {g.location} · {g.distanceKm} km
                  </p>
                </div>
                <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-xs font-bold shrink-0">
                  <Star className="w-3 h-3 fill-current" /> {g.rating}
                  {g.userRatingCount ? (
                    <span className="text-yellow-600 font-medium ml-0.5">({g.userRatingCount})</span>
                  ) : null}
                </span>
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
                {g.availableSlots.slice(0, 4).map(s => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 shrink-0 border border-slate-700"
                  >
                    {s}
                  </span>
                ))}
                <span className="px-3 py-1 bg-emerald-500/10 rounded-lg text-xs text-emerald-400 shrink-0 border border-emerald-500/20 font-bold">
                  ₹{g.pricePerHour}/hr
                </span>
              </div>
            </div>
          </button>
        )))}
      </div>

      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
      />
    </div>
  )
}
