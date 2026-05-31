"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Custom icons
const createIcon = (svg: string, size: [number, number], anchor: [number, number]) => {
  return L.divIcon({
    html: svg,
    className: "bg-transparent border-none",
    iconSize: size,
    iconAnchor: anchor,
  })
}

const createUserIcon = (heading: number | null) => {
  if (heading !== null) {
    // A navigation arrow that points to the heading
    return L.divIcon({
      html: `<div style="transform: rotate(${heading}deg); transform-origin: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.5s ease-out;">
               <svg viewBox="0 0 24 24" width="36" height="36" fill="#10b981" stroke="white" stroke-width="2" class="drop-shadow-lg">
                 <path d="M12 2L22 22L12 18L2 22L12 2Z"></path>
               </svg>
             </div>`,
      className: "bg-transparent border-none",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }

  // Fallback pulsating dot
  return L.divIcon({
    html: `<div class="relative w-8 h-8">
             <div class="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-50"></div>
             <div class="absolute inset-2 bg-emerald-400 border-2 border-white rounded-full shadow-lg"></div>
           </div>`,
    className: "bg-transparent border-none",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const destIcon = createIcon(
  `<svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="#10b981" stroke-linecap="round" stroke-linejoin="round" class="text-white drop-shadow-md"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  [32, 32],
  [16, 32]
)

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    // Animate map panning smoothly
    map.setView([lat, lng], map.getZoom() || 17, { animate: true, duration: 1.0 })
  }, [lat, lng, map])
  return null
}

interface TurfNavigationLeafletProps {
  userLat: number
  userLng: number
  userHeading?: number | null
  destLat: number
  destLng: number
  routePoints: [number, number][] | null
}

export function TurfNavigationLeaflet({ userLat, userLng, userHeading, destLat, destLng, routePoints }: TurfNavigationLeafletProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={17}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full bg-slate-950"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <RecenterMap lat={userLat} lng={userLng} />

      {routePoints && (
        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#10b981", weight: 6, opacity: 0.8, lineCap: "round", lineJoin: "round" }}
        />
      )}

      <Marker position={[userLat, userLng]} icon={createUserIcon(userHeading ?? null)} zIndexOffset={100} />
      <Marker position={[destLat, destLng]} icon={destIcon} />
    </MapContainer>
  )
}
