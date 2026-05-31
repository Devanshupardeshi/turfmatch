"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// ── Custom Leaflet Icons ───────────────────────────────────────────────────────
const userIcon = new L.DivIcon({
  html: `<div style="transform: rotate(0deg);" class="w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const destIcon = new L.DivIcon({
  html: `<div class="w-10 h-10 bg-slate-900 rounded-full border-4 border-emerald-500 shadow-xl flex items-center justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
})

function MapController({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 })
    }
  }, [center, zoom, map])
  return null
}

export default function LiveNavigationMap({
  currentLocation,
  destLat,
  destLng,
  routePoints
}: {
  currentLocation: [number, number] | null
  destLat: number
  destLng: number
  routePoints: [number, number][]
}) {
  if (!currentLocation) return null

  return (
    <MapContainer
      center={currentLocation}
      zoom={17}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
      />
      
      <MapController center={currentLocation} zoom={18} />

      {routePoints.length > 0 && (
        <>
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#0f172a", weight: 10, opacity: 0.5, lineCap: "round", lineJoin: "round" }}
          />
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#10b981", weight: 6, lineCap: "round", lineJoin: "round" }}
            className="animate-pulse"
          />
        </>
      )}

      {currentLocation && (
        <Marker position={currentLocation} icon={userIcon} />
      )}

      <Marker position={[destLat, destLng]} icon={destIcon} />
    </MapContainer>
  )
}
