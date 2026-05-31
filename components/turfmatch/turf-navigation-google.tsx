"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { GoogleMap, useJsApiLoader, PolylineF, TrafficLayer } from "@react-google-maps/api"
import { LocateFixed, Loader2 } from "lucide-react"

const containerStyle = {
  width: "100%",
  height: "100%",
}

// Libraries must be a stable constant (not inline array) to avoid re-render loops
const GOOGLE_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = []

// Premium Dark Mode Map Style
const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#064e3b" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#34d399" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#020617" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#020617" }],
  },
]

interface TurfNavigationGoogleProps {
  userLat: number
  userLng: number
  userHeading?: number | null
  destLat: number
  destLng: number
  routePoints: [number, number][] | null
}

export function TurfNavigationGoogle({
  userLat,
  userLng,
  userHeading,
  destLat,
  destLng,
  routePoints,
}: TurfNavigationGoogleProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-nav-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBRARIES,
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const destMarkerRef = useRef<google.maps.Marker | null>(null)
  const [isTracking, setIsTracking] = useState(true)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    map.setTilt(45)
  }, [])

  const onUnmount = useCallback(() => {
    // Cleanup markers
    userMarkerRef.current?.setMap(null)
    userMarkerRef.current = null
    destMarkerRef.current?.setMap(null)
    destMarkerRef.current = null
    mapRef.current = null
  }, [])

  // Pan to user location when it changes (if tracking is on)
  useEffect(() => {
    if (mapRef.current && isTracking) {
      mapRef.current.panTo({ lat: userLat, lng: userLng })
    }
  }, [userLat, userLng, isTracking])

  // Update/create custom user marker using Overlay approach (no AdvancedMarker needed)
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        zIndex: 100,
        icon: {
          path: "M12 2L22 22L12 18L2 22L12 2Z",
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeWeight: 2.5,
          strokeColor: "#ffffff",
          rotation: userHeading ?? 0,
          anchor: new google.maps.Point(12, 12),
          scale: 1.8,
        },
      })
    }

    userMarkerRef.current.setPosition({ lat: userLat, lng: userLng })
    const icon = userMarkerRef.current.getIcon() as google.maps.Symbol
    userMarkerRef.current.setIcon({ ...icon, rotation: userHeading ?? 0 })
  }, [isLoaded, userLat, userLng, userHeading])

  // Create destination marker once
  useEffect(() => {
    if (!mapRef.current || !isLoaded || destMarkerRef.current) return

    destMarkerRef.current = new google.maps.Marker({
      position: { lat: destLat, lng: destLng },
      map: mapRef.current,
      zIndex: 50,
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#f43f5e",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
        anchor: new google.maps.Point(12, 24),
        scale: 1.5,
      },
    })
  }, [isLoaded, destLat, destLng])

  const handleDragStart = () => {
    setIsTracking(false)
  }

  const handleRecenter = () => {
    setIsTracking(true)
    if (mapRef.current) {
      mapRef.current.panTo({ lat: userLat, lng: userLng })
      mapRef.current.setZoom(18)
      mapRef.current.setTilt(45)
    }
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="text-red-400 text-sm font-medium">Map failed to load</div>
        <p className="text-xs text-slate-500 px-8 text-center">
          Check your Google Maps API key and enable the Maps JavaScript API in Google Cloud Console.
        </p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  const googleRoutePath = routePoints?.map((p) => ({ lat: p[0], lng: p[1] })) || []

  return (
    <div className="relative w-full h-full isolate">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: userLat, lng: userLng }}
        zoom={18}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragStart={handleDragStart}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          tilt: 45,
          clickableIcons: false,
        }}
      >
        {/* Live traffic overlay */}
        <TrafficLayer />

        {/* Route polyline — blue like Google Maps, clearly distinct from road surface */}
        {googleRoutePath.length > 0 && (
          <>
            {/* Outer glow/shadow */}
            <PolylineF
              path={googleRoutePath}
              options={{
                strokeColor: "#1e3a5f",
                strokeWeight: 14,
                strokeOpacity: 0.8,
                zIndex: 1,
              }}
            />
            {/* Main route — Google Maps blue */}
            <PolylineF
              path={googleRoutePath}
              options={{
                strokeColor: "#4285F4",
                strokeWeight: 8,
                strokeOpacity: 1.0,
                zIndex: 2,
              }}
            />
            {/* Bright highlight stripe */}
            <PolylineF
              path={googleRoutePath}
              options={{
                strokeColor: "#74aaff",
                strokeWeight: 3,
                strokeOpacity: 0.7,
                zIndex: 3,
              }}
            />
          </>
        )}
      </GoogleMap>

      {/* Recenter FAB — appears when user pans away */}
      {!isTracking && (
        <div className="absolute bottom-40 right-5 z-[9999]">
          <button
            onClick={handleRecenter}
            className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-emerald-400 shadow-2xl hover:bg-slate-800 transition-colors active:scale-95 animate-in fade-in zoom-in duration-200"
          >
            <LocateFixed className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}
