/**
 * Client-side Google Maps API utilities.
 *
 * Uses Google Places API (New) for turf discovery and
 * Google Routes API for live directions/navigation.
 *
 * Because the app uses `output: "export"` (static HTML for Capacitor),
 * we can't use Next.js API routes. All Google API calls happen directly
 * from the client using the NEXT_PUBLIC_ prefixed key.
 */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

// ── Deterministic mock hydration ────────────────────────────────────────────
// Google Places doesn't return cricket-specific metadata (prices, slots, etc.)
// so we generate consistent fake values from the placeId hash.

const CATEGORIES = ["Box Cricket", "Net Practice", "Full Ground"] as const
const PITCH_TYPES = ["Hard Pitch", "Astroturf", "Dusty Pitch", "Concrete"] as const
const FEATURES = ["Floodlights", "Washroom", "Drinking Water", "Parking", "Seating Area"]

function deterministicMock(placeId: string) {
  let hash = 0
  for (let i = 0; i < placeId.length; i++) {
    hash = placeId.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)

  const pricePerHour = 500 + (hash % 15) * 100
  const category = CATEGORIES[hash % CATEGORIES.length]
  const pitchType = PITCH_TYPES[(hash >> 1) % PITCH_TYPES.length]

  const allSlots = ["06:00 AM", "07:00 AM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM"]
  const availableSlots = allSlots.filter((_, i) => (hash >> i) % 2 === 0)
  if (availableSlots.length === 0) availableSlots.push("07:00 PM", "08:00 PM")

  const groundFeatures = FEATURES.filter((_, i) => (hash >> (i + 2)) % 2 === 0)
  if (groundFeatures.length === 0) groundFeatures.push("Floodlights", "Parking")

  return {
    pricePerHour,
    category,
    pitchType,
    availableSlots,
    features: groundFeatures,
    verified: hash % 2 === 0,
    upiReady: hash % 3 !== 0,
    liveTeamsToday: hash % 10,
  }
}

// ── Haversine helper ────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
}

// ── Photo URL builder ───────────────────────────────────────────────────────

export function getPlacePhotoUrl(photoName: string, maxWidth = 400): string {
  if (!API_KEY || !photoName) return "/placeholder.svg"
  return `https://places.googleapis.com/v1/${photoName}/media?key=${API_KEY}&maxWidthPx=${maxWidth}`
}

// ── Relevance scoring & filtering ───────────────────────────────────────────

/**
 * Keywords that MUST appear in the name or address for a place to be considered
 * a sports turf / cricket ground. This filters out amusement parks, hotels,
 * restaurants, etc. that Google sometimes returns.
 */
const TURF_KEYWORDS = [
  "turf", "cricket", "ground", "stadium", "arena", "sports",
  "futsal", "football", "soccer", "badminton", "court",
  "nets", "net practice", "pitch", "academy", "club",
  "playing field", "playground", "box cricket",
]

/**
 * Google Places types that are definitely NOT sports turfs.
 * If a place's primary type is one of these, we reject it.
 */
const BLOCKED_TYPES = new Set([
  "amusement_park", "amusement_center", "aquarium", "zoo",
  "restaurant", "cafe", "bar", "bakery", "meal_delivery", "meal_takeaway",
  "hotel", "lodging", "motel", "resort_hotel",
  "shopping_mall", "department_store", "clothing_store",
  "hospital", "doctor", "pharmacy", "dentist",
  "movie_theater", "night_club", "casino",
  "car_dealer", "car_repair", "gas_station",
  "school", "university", "library",
  "church", "mosque", "hindu_temple",
  "bank", "atm", "insurance_agency",
  "beauty_salon", "hair_care", "spa",
  "real_estate_agency", "travel_agency",
  "parking", "bus_station", "train_station", "airport",
  "park", "campground",
  "supermarket", "grocery_or_supermarket", "convenience_store",
])

/**
 * Google Places types that are strong signals FOR sports turfs.
 */
const SPORTS_TYPES = new Set([
  "sports_complex", "stadium", "gym", "fitness_center",
  "athletic_field", "sports_club",
])

/**
 * Score a place for turf relevance. Returns -1 to reject, 0-100 for ranking.
 */
function scoreTurfRelevance(place: any): number {
  const name = (place.displayName?.text || "").toLowerCase()
  const address = (place.formattedAddress || "").toLowerCase()
  const types: string[] = place.types || []
  const primaryType: string = place.primaryType || ""

  // ── Hard reject: blocked primary type ──────────────────────────────────
  if (BLOCKED_TYPES.has(primaryType)) return -1

  // ── Hard reject: any blocked type and NO sports keyword in name ────────
  const hasBlockedType = types.some(t => BLOCKED_TYPES.has(t))
  const nameAndAddr = name + " " + address
  const hasTurfKeyword = TURF_KEYWORDS.some(kw => nameAndAddr.includes(kw))

  if (hasBlockedType && !hasTurfKeyword) return -1

  // ── Score calculation ──────────────────────────────────────────────────
  let score = 0

  // Name keyword matches (strongest signal)
  const nameKeywordHits = TURF_KEYWORDS.filter(kw => name.includes(kw)).length
  score += nameKeywordHits * 25

  // Address keyword matches (weaker signal)
  const addrKeywordHits = TURF_KEYWORDS.filter(kw => address.includes(kw)).length
  score += addrKeywordHits * 5

  // Sports-related Google type bonus
  const sportsTypeHits = types.filter(t => SPORTS_TYPES.has(t)).length
  score += sportsTypeHits * 15

  // If NO turf keyword AND no sports type — likely irrelevant
  if (nameKeywordHits === 0 && sportsTypeHits === 0) return -1

  // Clamp to 100
  return Math.min(score, 100)
}

// ── Fetch nearby turfs (Text Search — best for cricket turfs) ───────────────

export async function fetchNearbyTurfs(lat: number, lng: number, radius: number = 15000) {
  if (!API_KEY) {
    console.warn("[GoogleMaps] No API key configured")
    return []
  }

  try {
    console.log(`[GoogleMaps] Searching for turfs near (${lat}, ${lng})...`)

    // Use highly specific queries to minimize irrelevant results
    const [turfs, cricket, boxCricket, football] = await Promise.all([
      searchByText("sports turf ground near me", lat, lng, radius),
      searchByText("cricket ground turf", lat, lng, radius),
      searchByText("box cricket turf", lat, lng, radius),
      searchByText("football turf futsal court", lat, lng, radius),
    ])

    // Combine all results
    const combined = [...turfs, ...cricket, ...boxCricket, ...football]

    // Deduplicate by place id
    const uniqueMap = new Map()
    for (const place of combined) {
      if (place?.id && !uniqueMap.has(place.id)) {
        uniqueMap.set(place.id, place)
      }
    }

    const uniquePlaces = Array.from(uniqueMap.values())
    console.log(`[GoogleMaps] ${uniquePlaces.length} unique places before filtering`)

    // ── Apply relevance scoring — reject non-turf results ───────────────
    const scoredPlaces = uniquePlaces
      .map(p => ({ place: p, score: scoreTurfRelevance(p) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)

    const filteredPlaces = scoredPlaces.map(({ place }) => place)
    console.log(`[GoogleMaps] ${filteredPlaces.length} turfs after relevance filtering (rejected ${uniquePlaces.length - filteredPlaces.length})`)

    if (filteredPlaces.length === 0) return []

    return formatPlaces(filteredPlaces, lat, lng)
  } catch (err) {
    console.error("[GoogleMaps] fetchNearbyTurfs error:", err)
    return []
  }
}

// ── Text Search API ─────────────────────────────────────────────────────────

async function searchByText(query: string, lat: number, lng: number, radius: number): Promise<any[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.currentOpeningHours,places.userRatingCount,places.types,places.primaryType,places.nationalPhoneNumber,places.internationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radius,
        },
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    console.error(`[GoogleMaps] Text search error ${res.status}:`, errText)
    return []
  }

  const data = await res.json()
  return data.places || []
}

// ── Format places into Ground objects ───────────────────────────────────────

function formatPlaces(places: any[], userLat: number, userLng: number) {
  const turfs = places.map((p: any) => {
    const mock = deterministicMock(p.id)

    let image = "/placeholder.svg"
    if (p.photos?.length) {
      image = getPlacePhotoUrl(p.photos[0].name, 400)
    }

    // Prefer national phone (e.g. 020 1234 5678), fall back to international
    const phoneNumber = p.nationalPhoneNumber || p.internationalPhoneNumber || undefined

    return {
      id: p.id,
      name: p.displayName?.text || "Unknown Turf",
      location: p.formattedAddress?.split(",")[0] || "Pune",
      zone: p.formattedAddress?.split(",").slice(1, 3).join(",").trim() || "Pune",
      distanceKm: haversineKm(userLat, userLng, p.location.latitude, p.location.longitude),
      rating: p.rating || 4.0,
      userRatingCount: p.userRatingCount || 0,
      image,
      lat: p.location.latitude,
      lng: p.location.longitude,
      phoneNumber,
      ...mock,
    }
  })

  // Sort by distance, closest first
  turfs.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
  return turfs
}

// ── Fetch directions using Google Routes API v2 ─────────────────────────────

export interface RouteStep {
  distanceMeters: number;
  staticDuration: string;
  polyline: { encodedPolyline: string };
  startLocation: { latLng: { latitude: number; longitude: number } };
  endLocation: { latLng: { latitude: number; longitude: number } };
  navigationInstruction?: {
    maneuver: string;
    instructions: string;
  };
}

export interface DirectionsResult {
  /** Encoded polyline string */
  points: string
  /** Human-readable distance (e.g., "7.9 km") */
  distance: string
  /** Human-readable duration (e.g., "22 mins") */
  duration: string
  /** Distance in meters for calculations */
  distanceMeters: number
  /** Duration in seconds for calculations */
  durationSeconds: number
  /** Turn by turn steps */
  steps?: RouteStep[]
}

export async function fetchDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DirectionsResult | null> {
  if (!API_KEY) return null

  try {
    // Use Google Routes API v2 (CORS-friendly, modern, traffic-aware)
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: originLat, longitude: originLng } },
        },
        destination: {
          location: { latLng: { latitude: destLat, longitude: destLng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
      }),
    })

    if (!res.ok) {
      console.warn("[GoogleMaps] Routes API error:", res.status)
      // Fallback to OSRM
      return fetchDirectionsOSRM(originLat, originLng, destLat, destLng)
    }

    const data = await res.json()
    if (!data.routes?.[0]) {
      console.warn("[GoogleMaps] No routes returned")
      return fetchDirectionsOSRM(originLat, originLng, destLat, destLng)
    }

    const route = data.routes[0]
    const distMeters = route.distanceMeters || 0
    const distKm = (distMeters / 1000).toFixed(1)
    // Duration comes as "1314s" format
    const durStr = route.duration || "0s"
    const durSeconds = parseInt(durStr.replace("s", "")) || 0
    const durMin = Math.round(durSeconds / 60)
    
    // Extract steps from the first leg
    const steps = route.legs?.[0]?.steps || []

    return {
      points: route.polyline?.encodedPolyline || "",
      distance: `${distKm} km`,
      duration: durMin < 60 ? `${durMin} mins` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`,
      distanceMeters: distMeters,
      durationSeconds: durSeconds,
      steps: steps,
    }
  } catch (err) {
    console.error("[GoogleMaps] fetchDirections error:", err)
    // Fallback to OSRM
    return fetchDirectionsOSRM(originLat, originLng, destLat, destLng)
  }
}

// ── OSRM fallback for directions ────────────────────────────────────────────

async function fetchDirectionsOSRM(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DirectionsResult | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originLng},${originLat};${destLng},${destLat}` +
      `?overview=full&geometries=polyline`

    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    if (data.code !== "Ok" || !data.routes?.[0]) return null

    const route = data.routes[0]
    const distMeters = route.distance || 0
    const distKm = (distMeters / 1000).toFixed(1)
    const durSeconds = route.duration || 0
    const durMin = Math.round(durSeconds / 60)

    return {
      points: route.geometry,
      distance: `${distKm} km`,
      duration: durMin < 60 ? `${durMin} mins` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`,
      distanceMeters: distMeters,
      durationSeconds: durSeconds,
    }
  } catch {
    return null
  }
}
