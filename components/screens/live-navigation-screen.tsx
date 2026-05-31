"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import polyline from "@mapbox/polyline"
import {
  ChevronLeft,
  Navigation,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react"

import { useNav } from "@/lib/turfmatch/navigation"
import { useCoords } from "@/lib/turfmatch/location-store"
import { fetchDirections, type DirectionsResult } from "@/lib/turfmatch/google-maps"

// Dynamically import Google Maps nav — keeps Maps JS SDK out of SSR
const TurfNavigationGoogle = dynamic(
  () =>
    import("@/components/turfmatch/turf-navigation-google").then((m) => ({
      default: m.TurfNavigationGoogle,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    ),
  }
)

// ── Maneuver → icon helper ───────────────────────────────────────────────────
function getManeuverIcon(maneuver: string | undefined) {
  if (!maneuver) return ArrowUp
  const m = maneuver.toLowerCase()
  if (m.includes("left") && m.includes("sharp")) return CornerUpLeft
  if (m.includes("right") && m.includes("sharp")) return CornerUpRight
  if (m.includes("left")) return ArrowLeft
  if (m.includes("right")) return ArrowRight
  if (m.includes("uturn")) return CornerUpLeft
  if (m.includes("destination")) return MapPin
  return ArrowUp
}

export function LiveNavigationScreen({
  destLat,
  destLng,
  destName,
}: {
  destLat: number
  destLng: number
  destName?: string
}) {
  const { goBack } = useNav()
  const originCoords = useCoords()

  // Route data
  const [routeData, setRouteData] = useState<DirectionsResult | null>(null)
  const [routePoints, setRoutePoints] = useState<[number, number][]>([])
  const [routeLoading, setRouteLoading] = useState(true)

  // Live GPS position
  const [userLat, setUserLat] = useState<number | null>(originCoords?.lat ?? null)
  const [userLng, setUserLng] = useState<number | null>(originCoords?.lng ?? null)
  const [userHeading, setUserHeading] = useState<number | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const simulTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simulIdxRef = useRef(0)
  const routePointsRef = useRef<[number, number][]>([])

  // Keep ref in sync with state (for simulation closure)
  useEffect(() => {
    routePointsRef.current = routePoints
  }, [routePoints])

  // ── Simulation walker (used when real GPS is unavailable) ──────────────────
  const startSimulation = useCallback(() => {
    if (simulTimerRef.current) return
    simulTimerRef.current = setInterval(() => {
      const pts = routePointsRef.current
      if (pts.length === 0) return
      simulIdxRef.current = Math.min(simulIdxRef.current + 1, pts.length - 1)
      const [lat, lng] = pts[simulIdxRef.current]
      setUserLat(lat)
      setUserLng(lng)
      if (simulIdxRef.current >= pts.length - 1) {
        clearInterval(simulTimerRef.current!)
        simulTimerRef.current = null
      }
    }, 1200)
  }, [])

  // ── Start real GPS watch on mount ──────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // No geolocation API — wait for route then simulate
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading)
        }
      },
      (err) => {
        console.warn("[LiveNav] GPS error:", err.message)
        // Fallback: simulate after route is loaded (handled in route effect below)
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  // ── Fetch route once we have an origin position ────────────────────────────
  useEffect(() => {
    const originLat = originCoords?.lat ?? userLat
    const originLng = originCoords?.lng ?? userLng
    if (!originLat || !originLng) return

    setRouteLoading(true)
    fetchDirections(originLat, originLng, destLat, destLng)
      .then((res) => {
        if (res?.points) {
          setRouteData(res)
          const decoded = polyline.decode(res.points) as [number, number][]
          setRoutePoints(decoded)
          routePointsRef.current = decoded

          // If no real GPS watch succeeded, start simulation now that we have points
          if (watchIdRef.current == null) {
            startSimulation()
          }
        }
      })
      .finally(() => setRouteLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destLat, destLng])

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulTimerRef.current) {
        clearInterval(simulTimerRef.current)
        simulTimerRef.current = null
      }
    }
  }, [])

  // ── Current nav step based on simulation progress ──────────────────────────
  const stepIndex = useMemo(() => {
    if (!routeData?.steps || routePoints.length === 0) return 0
    const pct = simulIdxRef.current / Math.max(routePoints.length - 1, 1)
    return Math.min(
      Math.floor(pct * routeData.steps.length),
      routeData.steps.length - 1
    )
  }, [routeData, routePoints.length])

  const currentStep = routeData?.steps?.[stepIndex] ?? null

  const instructionText = currentStep?.navigationInstruction?.instructions
    ? currentStep.navigationInstruction.instructions.replace(/<[^>]*>?/gm, "")
    : "Head towards destination"

  const StepIcon = getManeuverIcon(currentStep?.navigationInstruction?.maneuver)

  // ── ETA / distance display ─────────────────────────────────────────────────
  const etaLabel = routeData?.duration ?? "--"
  const distLabel = routeData?.distance ?? "--"

  const arrivalTime = useMemo(() => {
    if (!routeData?.durationSeconds) return ""
    const now = new Date()
    now.setSeconds(now.getSeconds() + routeData.durationSeconds)
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [routeData])

  const isReady = userLat !== null && userLng !== null

  return (
    // "absolute inset-0" fills the phone frame on desktop preview AND the full screen on mobile
    <div className="absolute inset-0 bg-slate-950 flex flex-col font-sans overflow-hidden" style={{ zIndex: 100 }}>

      {/* ── Map layer (full background) ─────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {isReady ? (
          <TurfNavigationGoogle
            userLat={userLat!}
            userLng={userLng!}
            userHeading={userHeading}
            destLat={destLat}
            destLng={destLng}
            routePoints={routePoints.length > 0 ? routePoints : null}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Navigation className="w-10 h-10 text-emerald-500 animate-pulse" />
              <p className="font-medium text-sm animate-pulse">Acquiring GPS…</p>
            </div>
          </div>
        )}
      </div>

      {/* ── TOP BAR — Back + ETA ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-10 pb-3 pointer-events-none">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700 flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="pointer-events-auto flex-1 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl px-4 py-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-xl font-black leading-tight">{etaLabel}</p>
                <p className="text-slate-400 text-xs font-semibold tracking-wide">
                  {distLabel}{arrivalTime ? ` · Arrives ${arrivalTime}` : ""}
                </p>
              </div>
              {routeLoading && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
            </div>
          </div>
        </div>
      </div>

      {/* ── TURN CARD ────────────────────────────────────────────────────── */}
      {isReady && !routeLoading && (
        <div className="absolute z-10 left-4 right-4 pointer-events-none" style={{ top: "120px" }}>
          <div className="bg-emerald-500 rounded-2xl p-4 flex items-center gap-4 shadow-2xl shadow-emerald-900/40">
            <div className="w-12 h-12 bg-slate-950/25 rounded-xl flex items-center justify-center shrink-0">
              <StepIcon className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              {currentStep && (
                <p className="text-emerald-100 text-xs font-bold mb-0.5 tracking-wide uppercase">
                  In {currentStep.distanceMeters > 1000
                    ? `${(currentStep.distanceMeters / 1000).toFixed(1)} km`
                    : `${currentStep.distanceMeters} m`}
                </p>
              )}
              <h3 className="text-white text-sm font-bold leading-tight line-clamp-2">
                {instructionText}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM INFO BAR ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-4 pt-10 pb-6">
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl">
            <div className="min-w-0 flex-1 mr-3">
              <h3 className="text-white font-bold text-base leading-tight truncate">
                {destName || "Destination"}
              </h3>
              <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Live traffic enabled
              </p>
            </div>
            <button
              onClick={goBack}
              className="shrink-0 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-colors active:scale-95"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
