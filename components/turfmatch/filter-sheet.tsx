"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { X, Check, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useNearbyTurfs, defaultFilterState, type FilterState } from "@/lib/turfmatch/nearby-turfs-store"
import { AnimatePresence, motion } from "framer-motion"

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
}

const DISTANCE_OPTIONS = [2, 5, 10, 15, 25]
const TURF_TYPES = ["Box Cricket", "Net Practice", "Full Ground", "Football Turf"]
const RATING_OPTIONS = [0, 3, 4, 4.5]
const SORT_OPTIONS: FilterState["sortBy"][] = ["Nearby", "Popular", "Top Rated", "Price: Low to High"]
const INDOOR_OUTDOOR_OPTIONS: FilterState["indoorOutdoor"][] = ["Both", "Indoor", "Outdoor"]

function FilterSheetContent({ isOpen, onClose }: FilterSheetProps) {
  const { filterState, setFilterState } = useNearbyTurfs()
  const [localState, setLocalState] = useState<FilterState>(filterState)

  // Re-sync local state every time the sheet opens
  useEffect(() => {
    if (isOpen) setLocalState(filterState)
  }, [isOpen, filterState])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (localState.distanceKm !== defaultFilterState.distanceKm) count++
    if (localState.turfTypes.length > 0) count++
    if (localState.rating > 0) count++
    if (localState.availableSlots) count++
    if (localState.sortBy !== defaultFilterState.sortBy) count++
    if (localState.indoorOutdoor !== defaultFilterState.indoorOutdoor) count++
    return count
  }, [localState])

  const handleApply = () => {
    setFilterState(localState)
    onClose()
  }

  const handleReset = () => {
    setLocalState(defaultFilterState)
  }

  const toggleTurfType = (type: string) => {
    setLocalState(prev => ({
      ...prev,
      turfTypes: prev.turfTypes.includes(type)
        ? prev.turfTypes.filter(t => t !== type)
        : [...prev.turfTypes, type],
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99998, backdropFilter: "blur(4px)" }}
          />

          {/* Sheet container — uses inline styles to avoid any Tailwind/overflow issues */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              background: "#0f172a",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: "1px solid rgba(100,116,139,0.3)",
            }}
          >
            {/* ── Drag handle ─────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#475569" }} />
            </div>

            {/* ── Header ──────────────────────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: "1px solid #1e293b", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SlidersHorizontal style={{ width: 20, height: 20, color: "#34d399" }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Filters</span>
                {activeFilterCount > 0 && (
                  <span style={{
                    background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 900,
                    width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close filters"
                style={{ padding: 8, borderRadius: 999, background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* ── Scrollable filter body ──────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 28, minHeight: 0 }}>

              {/* Distance Radius */}
              <section>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Distance Radius</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#34d399" }}>{localState.distanceKm} km</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DISTANCE_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setLocalState(s => ({ ...s, distanceKm: d }))}
                      style={{
                        padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                        background: localState.distanceKm === d ? "#10b981" : "#1e293b",
                        color: localState.distanceKm === d ? "#fff" : "#cbd5e1",
                        boxShadow: localState.distanceKm === d ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
                      }}
                    >
                      {d} KM
                    </button>
                  ))}
                </div>
                <input
                  type="range" min="1" max="50"
                  value={localState.distanceKm}
                  onChange={(e) => setLocalState(s => ({ ...s, distanceKm: parseInt(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#10b981", marginTop: 8 }}
                />
              </section>

              {/* Turf Type */}
              <section>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 10 }}>Turf Type</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TURF_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTurfType(t)}
                      style={{
                        padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        background: localState.turfTypes.includes(t) ? "#10b981" : "#1e293b",
                        color: localState.turfTypes.includes(t) ? "#fff" : "#cbd5e1",
                        boxShadow: localState.turfTypes.includes(t) ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
                      }}
                    >
                      {localState.turfTypes.includes(t) && <Check style={{ width: 14, height: 14 }} />}
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              {/* Venue Type */}
              <section>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 10 }}>Venue Type</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {INDOOR_OUTDOOR_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setLocalState(s => ({ ...s, indoorOutdoor: opt }))}
                      style={{
                        padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                        background: localState.indoorOutdoor === opt ? "#8b5cf6" : "#1e293b",
                        color: localState.indoorOutdoor === opt ? "#fff" : "#cbd5e1",
                        boxShadow: localState.indoorOutdoor === opt ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </section>

              {/* Sort By */}
              <section>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 10 }}>Sort By</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SORT_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setLocalState(prev => ({ ...prev, sortBy: s }))}
                      style={{
                        padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                        background: localState.sortBy === s ? "#3b82f6" : "#1e293b",
                        color: localState.sortBy === s ? "#fff" : "#cbd5e1",
                        boxShadow: localState.sortBy === s ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              {/* Minimum Rating */}
              <section>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 10 }}>Minimum Rating</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RATING_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setLocalState(s => ({ ...s, rating: r }))}
                      style={{
                        padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                        background: localState.rating === r ? "#eab308" : "#1e293b",
                        color: localState.rating === r ? "#000" : "#cbd5e1",
                        boxShadow: localState.rating === r ? "0 4px 12px rgba(234,179,8,0.3)" : "none",
                      }}
                    >
                      {r === 0 ? "Any" : `${r}+ ★`}
                    </button>
                  ))}
                </div>
              </section>

              {/* Quick Filters */}
              <section>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 10 }}>Quick Filters</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    onClick={() => setLocalState(s => ({ ...s, availableSlots: !s.availableSlots }))}
                    style={{
                      padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      background: localState.availableSlots ? "#a855f7" : "#1e293b",
                      color: localState.availableSlots ? "#fff" : "#cbd5e1",
                      boxShadow: localState.availableSlots ? "0 4px 12px rgba(168,85,247,0.3)" : "none",
                    }}
                  >
                    {localState.availableSlots && <Check style={{ width: 14, height: 14 }} />}
                    Has Available Slots
                  </button>
                </div>
              </section>

              {/* Bottom spacer to ensure scroll doesn't hide behind buttons */}
              <div style={{ height: 8, flexShrink: 0 }} />
            </div>

            {/* ── ACTION BUTTONS — always visible, never clipped ──────── */}
            <div style={{
              flexShrink: 0,
              borderTop: "1px solid rgba(100,116,139,0.3)",
              background: "#0f172a",
              padding: "16px 20px 32px 20px",
              display: "flex",
              gap: 12,
            }}>
              <button
                onClick={handleReset}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 16, fontSize: 14, fontWeight: 700,
                  background: "transparent", border: "1px solid #334155", color: "#cbd5e1", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <RotateCcw style={{ width: 15, height: 15 }} />
                Reset
              </button>
              <button
                onClick={handleApply}
                style={{
                  flex: 2, padding: "14px 0", borderRadius: 16, fontSize: 15, fontWeight: 800,
                  background: "#10b981", border: "none", color: "#fff", cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Check style={{ width: 18, height: 18 }} />
                Apply Filters
                {activeFilterCount > 0 && (
                  <span style={{
                    background: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 900,
                    padding: "2px 7px", borderRadius: 10, marginLeft: 2,
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * FilterSheet — renders via React Portal to document.body
 * so it escapes TmAppFrame's overflow-hidden clipping.
 */
export function FilterSheet(props: FilterSheetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <FilterSheetContent {...props} />,
    document.body
  )
}
