"use client"

/**
 * LocationProvider — fetches the user's location ONCE at app startup,
 * caches it, and exposes it via useLocation() hook.
 *
 * Rules:
 *  - Fetch runs only on initial mount (never again unless refresh() is called).
 *  - Previous value stays visible while a new fetch is in-flight.
 *  - All consumers read the same cached value — no duplicate API calls.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Geolocation } from "@capacitor/geolocation"

interface LocationContextValue {
  location: string
  coords: { lat: number; lng: number } | null
  loading: boolean
  error: string | null
  refresh: () => void
}

const DEFAULT_LOCATION = "Pune"

const LocationContext = createContext<LocationContextValue | null>(null)

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timer = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), ms)
  })
  return Promise.race([p, timer])
}

export async function resolveLocation(): Promise<{ location: string; coords: { lat: number; lng: number } | null }> {
  // Check/request permissions (native only — web falls through silently)
  try {
    const perms = await withTimeout(Geolocation.checkPermissions(), 3_000, { location: "granted" } as any)
    if (perms.location !== "granted") {
      const req = await withTimeout(Geolocation.requestPermissions(), 3_000, { location: "denied" } as any)
      if (req.location !== "granted") {
        throw new Error("permission_denied")
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ""
    if (msg === "permission_denied") throw e
  }

  // Try Capacitor (native) first, then browser fallback — hard capped at 8s
  let coords: { latitude: number; longitude: number } | null = null

  try {
    const pos = await withTimeout(
      Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }),
      8_000,
      null as any,
    )
    coords = pos?.coords ?? null
  } catch {
    /* ignore */
  }

  if (!coords && typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      coords = await withTimeout(
        new Promise<{ latitude: number; longitude: number }>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p.coords),
            reject,
            { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
          ),
        ),
        8_000,
        null as any,
      )
    } catch {
      /* ignore */
    }
  }

  if (!coords) throw new Error("no_coords")

  // Reverse geocode — hard capped at 5s so the UI never waits forever
  const res = await withTimeout(
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=14`,
      { headers: { "Accept-Language": "en" } },
    ),
    5_000,
    null as unknown as Response,
  )

  if (!res || !res.ok) throw new Error("nominatim_failed")
  const data = await res.json()
  const addr = data.address ?? {}

  const parts: string[] = []
  const neighborhood =
    addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.village
  const city =
    addr.city || addr.town || addr.municipality || addr.county || addr.state_district

  if (neighborhood) parts.push(neighborhood)
  if (city) parts.push(city)

  const unique = Array.from(new Set(parts))
  const locString = unique.length > 0 ? unique.slice(0, 2).join(", ") : DEFAULT_LOCATION
  
  return {
    location: locString,
    coords: { lat: coords.latitude, lng: coords.longitude }
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<string>(DEFAULT_LOCATION)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await resolveLocation()
      setLocation(result.location)
      setCoords(result.coords)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown"
      setError(msg)
      // Keep the last known / default location — don't blank it out
    } finally {
      setLoading(false)
    }
  }, [])

  // Run only once at mount
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    if (typeof window === "undefined") return
    fetch()
  }, [fetch])

  const refresh = useCallback(() => {
    hasFetched.current = false
    fetch()
  }, [fetch])

  return (
    <LocationContext.Provider value={{ location, coords, loading, error, refresh }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error("useLocation must be used inside <LocationProvider>")
  return ctx
}

export function useCoords() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error("useCoords must be used inside <LocationProvider>")
  return ctx.coords
}
