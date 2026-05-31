"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Ground } from "@/lib/turfmatch/types"
import { useCoords, useLocation } from "./location-store"
import { fetchNearbyTurfs } from "./google-maps"
import { fetchGrounds } from "./supabase-data"
import { GROUNDS } from "./data"

export interface FilterState {
  distanceKm: number
  priceRange: [number, number]
  rating: number
  turfTypes: string[]
  openNow: boolean
  availableSlots: boolean
  indoorOutdoor: "Both" | "Indoor" | "Outdoor"
  sortBy: "Popular" | "Nearby" | "Top Rated" | "Price: Low to High"
}

export const defaultFilterState: FilterState = {
  distanceKm: 15,
  priceRange: [0, 5000],
  rating: 0,
  turfTypes: [],
  openNow: false,
  availableSlots: false,
  indoorOutdoor: "Both",
  sortBy: "Nearby"
}

interface NearbyTurfsContextValue {
  grounds: Ground[]
  filteredGrounds: Ground[]
  loading: boolean
  error: string | null
  refresh: () => void
  source: "places" | "supabase" | "mock" | "loading"
  filterState: FilterState
  setFilterState: (state: FilterState | ((prev: FilterState) => FilterState)) => void
}

const NearbyTurfsContext = createContext<NearbyTurfsContextValue | null>(null)

// Haversine distance formula to check if user moved significantly
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const CACHE_KEY = "tm_turfs_cache_v2" // v2: relevance filtering upgrade
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const MOVEMENT_THRESHOLD_METERS = 500 // Re-fetch if moved more than 500m

export function NearbyTurfsProvider({ children }: { children: ReactNode }) {
  const coords = useCoords()
  const { loading: locationLoading } = useLocation()
  const [grounds, setGrounds] = useState<Ground[]>([])
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<NearbyTurfsContextValue["source"]>("loading")
  const hasFetchedRef = useRef(false)
  const lastFetchedRadiusRef = useRef(15000)

  const fetchTurfs = useCallback(async (lat: number, lng: number, forceRefresh = false, radius = 15000) => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Check Cache
      if (!forceRefresh && typeof window !== "undefined") {
        try {
          const cachedStr = localStorage.getItem(CACHE_KEY)
          if (cachedStr) {
            const cached = JSON.parse(cachedStr)
            const age = Date.now() - cached.timestamp
            
            if (age < CACHE_TTL_MS) {
              const dist = calculateDistance(lat, lng, cached.lat, cached.lng)
              if (dist < MOVEMENT_THRESHOLD_METERS) {
                console.log("[NearbyTurfs] Using cached data:", cached.grounds.length, "turfs")
                setGrounds(cached.grounds as Ground[])
                setSource("places")
                setLoading(false)
                return
              }
            }
          }
        } catch {
          // localStorage might be unavailable — continue to fetch
        }
      }

      // 2. Fetch from Google Places
      console.log("[NearbyTurfs] Fetching from Google Places API...", { lat, lng, radius })
      const fetchedPlaces = await fetchNearbyTurfs(lat, lng, radius)
      let fetchedGrounds: Ground[] = fetchedPlaces as Ground[]
      let currentSource: "places" | "supabase" | "mock" = "places"
      console.log("[NearbyTurfs] Google Places returned:", fetchedGrounds.length, "turfs")

      // 3. Fallback to Supabase if Google fails or returns 0
      if (fetchedGrounds.length === 0) {
        console.log("[NearbyTurfs] No results from Places, trying Supabase...")
        fetchedGrounds = await fetchGrounds()
        currentSource = fetchedGrounds.length > 0 ? "supabase" : "mock"
      }

      // 4. Final fallback to mock data
      if (fetchedGrounds.length === 0) {
        console.log("[NearbyTurfs] No Supabase data, using mock data")
        fetchedGrounds = GROUNDS
        currentSource = "mock"
      }

      setGrounds(fetchedGrounds)
      setSource(currentSource)

      // 5. Save to Cache (only if from Places API)
      if (currentSource === "places" && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              grounds: fetchedGrounds,
              lat,
              lng,
              timestamp: Date.now(),
            })
          )
        } catch {
          // localStorage full or unavailable
        }
      }
    } catch (err: unknown) {
      console.error("[NearbyTurfs] Failed to fetch nearby turfs:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch nearby turfs")
      
      // Fallback chain: Supabase → Mock
      try {
        const fallbackGrounds = await fetchGrounds()
        if (fallbackGrounds.length > 0) {
          setGrounds(fallbackGrounds)
          setSource("supabase")
        } else {
          setGrounds(GROUNDS)
          setSource("mock")
        }
      } catch {
        setGrounds(GROUNDS)
        setSource("mock")
      }
    } finally {
      setLoading(false)
      hasFetchedRef.current = true
      lastFetchedRadiusRef.current = radius
    }
  }, [])

  // Load mock data immediately as a fallback to prevent stuck loading
  const loadFallbackData = useCallback(async () => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    console.log("[NearbyTurfs] No coords available, loading fallback data...")
    setLoading(true)
    
    try {
      const supabaseGrounds = await fetchGrounds()
      if (supabaseGrounds.length > 0) {
        setGrounds(supabaseGrounds)
        setSource("supabase")
      } else {
        setGrounds(GROUNDS)
        setSource("mock")
      }
    } catch {
      setGrounds(GROUNDS)
      setSource("mock")
    } finally {
      setLoading(false)
    }
  }, [])

  // Track whether location fetch has had a chance to run
  const locationCheckedRef = useRef(false)

  useEffect(() => {
    if (coords) {
      // We have live coordinates — fetch real turfs
      hasFetchedRef.current = false // Allow re-fetch with new coords
      locationCheckedRef.current = true
      fetchTurfs(coords.lat, coords.lng, false, filterState.distanceKm * 1000)
    } else if (locationLoading) {
      // Location is still loading — wait for it to finish before deciding fallback
      locationCheckedRef.current = true
    } else if (!hasFetchedRef.current && locationCheckedRef.current) {
      // Location loading finished but no coords (denied/failed)
      // AND we already waited for it — load fallback data
      loadFallbackData()
    } else if (!locationCheckedRef.current) {
      // First mount — mark that we've checked location status
      locationCheckedRef.current = true
    }
  }, [coords, locationLoading, fetchTurfs, loadFallbackData])

  // Safety timeout: if loading takes more than 8 seconds, show fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !hasFetchedRef.current) {
        console.log("[NearbyTurfs] Safety timeout reached, loading fallback data")
        loadFallbackData()
      }
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading, loadFallbackData])

  const refresh = useCallback(() => {
    hasFetchedRef.current = false
    if (coords) {
      fetchTurfs(coords.lat, coords.lng, true)
    } else {
      // Fallback refresh without coords
      setLoading(true)
      fetchGrounds().then((g: Ground[]) => {
        if (g.length > 0) {
          setGrounds(g)
          setSource("supabase")
        } else {
          setGrounds(GROUNDS)
          setSource("mock")
        }
        setLoading(false)
      }).catch(() => {
        setGrounds(GROUNDS)
        setSource("mock")
        setLoading(false)
      })
    }
  }, [coords, fetchTurfs])

  // Trigger fetch if filter distance exceeds last fetched distance
  useEffect(() => {
    if (coords && filterState.distanceKm * 1000 > lastFetchedRadiusRef.current) {
      fetchTurfs(coords.lat, coords.lng, true, filterState.distanceKm * 1000)
    }
  }, [filterState.distanceKm, coords, fetchTurfs])

  // Apply filters client-side
  const filteredGrounds = grounds.filter(g => {
    if (g.distanceKm > filterState.distanceKm) return false
    if (g.pricePerHour < filterState.priceRange[0] || g.pricePerHour > filterState.priceRange[1]) return false
    if (g.rating < filterState.rating) return false
    if (filterState.turfTypes.length > 0 && !filterState.turfTypes.includes(g.category)) return false
    if (filterState.availableSlots && g.availableSlots.length === 0) return false
    // Note: Indoor/Outdoor not strictly typed in Ground, ignoring for now or map via pitchType
    if (filterState.indoorOutdoor === "Indoor" && g.pitchType !== "Astroturf") return false
    if (filterState.indoorOutdoor === "Outdoor" && g.pitchType === "Astroturf") return false
    return true
  }).sort((a, b) => {
    switch (filterState.sortBy) {
      case "Price: Low to High": return a.pricePerHour - b.pricePerHour
      case "Top Rated": return b.rating - a.rating
      case "Popular": return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0)
      case "Nearby":
      default:
        return a.distanceKm - b.distanceKm
    }
  })

  return (
    <NearbyTurfsContext.Provider value={{ 
      grounds, 
      filteredGrounds,
      loading, 
      error, 
      refresh, 
      source,
      filterState,
      setFilterState
    }}>
      {children}
    </NearbyTurfsContext.Provider>
  )
}

export function useNearbyTurfs() {
  const ctx = useContext(NearbyTurfsContext)
  if (!ctx) throw new Error("useNearbyTurfs must be used inside <NearbyTurfsProvider>")
  return ctx
}
