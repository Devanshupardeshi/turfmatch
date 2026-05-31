"use client"

import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import { useEffect } from "react"
import type { Ground } from "@/lib/turfmatch/types"

// Stadium glyph for markers — kept as a string so we can inject into Leaflet DivIcon HTML.
const STADIUM_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
     width="100%" height="100%" aria-hidden="true">
  <path d="M3 12 C 3 5, 21 5, 21 12"/>
  <path d="M6.5 12 v 5.5"/>
  <path d="M12 12 v 5.5"/>
  <path d="M17.5 12 v 5.5"/>
  <path d="M3 17.5 h 18"/>
</svg>`

// Build a DivIcon that matches the mockup pin styling — small dark circle for
// inactive grounds, large glowing mint circle with price chip for the active one.
function pinIcon(active: boolean, price: number): L.DivIcon {
  if (active) {
    return L.divIcon({
      className: "tm-pin tm-pin-active",
      iconSize: [120, 96],
      iconAnchor: [60, 30],
      html: `
        <div style="position:relative;width:120px;height:96px;display:flex;flex-direction:column;align-items:center;">
          <div style="
            position:absolute;top:0;left:50%;transform:translateX(-50%);
            width:60px;height:60px;border-radius:9999px;
            background:#4edea3;color:#003824;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 24px rgba(78,222,163,0.65), 0 0 48px rgba(78,222,163,0.35);
          ">
            <div style="width:30px;height:30px;">${STADIUM_SVG}</div>
          </div>
          <div style="
            position:absolute;top:64px;left:50%;transform:translateX(-50%);
            background:rgba(24,31,49,0.92);
            backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
            color:#dce2fa;
            font-family:'Lexend','Lexend Fallback',system-ui,sans-serif;
            font-size:11px;font-weight:700;letter-spacing:0.02em;
            padding:4px 10px;border-radius:999px;
            border:1px solid rgba(78,222,163,0.25);
            white-space:nowrap;
          ">₹${price}/hr</div>
        </div>
      `,
    })
  }
  return L.divIcon({
    className: "tm-pin",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `
      <div style="
        width:38px;height:38px;border-radius:9999px;
        background:rgba(24,31,49,0.85);
        backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
        border:1.5px solid rgba(78,222,163,0.45);
        color:#4edea3;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 10px rgba(0,0,0,0.4);
      ">
        <div style="width:20px;height:20px;">${STADIUM_SVG}</div>
      </div>
    `,
  })
}

interface MapViewProps {
  center: [number, number]
  grounds: Ground[]
  selectedId: string | undefined
  onSelect: (g: Ground) => void
  userLocation?: { lat: number; lng: number } | null
  routePoints?: [number, number][] | null
}

const userIcon = L.divIcon({
  className: "user-location-pin",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `
    <div style="
      width:24px;height:24px;border-radius:50%;
      background:rgba(59,130,246,0.2);
      display:flex;align-items:center;justify-content:center;
      animation: pulse 2s infinite;
    ">
      <div style="
        width:12px;height:12px;border-radius:50%;
        background:#3b82f6;border:2px solid #fff;
        box-shadow:0 0 8px rgba(59,130,246,0.8);
      "></div>
    </div>
  `
})

// Pan to selected ground when it changes.
function CenterOnSelected({ ground }: { ground: Ground | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!ground) return
    map.setView([ground.lat, ground.lng], 13, { animate: true })
  }, [map, ground])
  return null
}

export function MapView({
  center,
  grounds,
  selectedId,
  onSelect,
  userLocation,
  routePoints,
}: MapViewProps) {
  const selected = grounds.find(g => g.id === selectedId) ?? grounds[0]
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      {/* CartoDB Dark No-Labels — gives the bright-streets look from the mockup */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      
      {routePoints && (
        <Polyline 
          positions={routePoints} 
          pathOptions={{ color: '#4edea3', weight: 4, opacity: 0.8, dashArray: '8, 8' }} 
        />
      )}

      {userLocation && (
        <Marker 
          position={[userLocation.lat, userLocation.lng]} 
          icon={userIcon} 
          zIndexOffset={1000}
        />
      )}

      {grounds.map(g => (
        <Marker
          key={g.id}
          position={[g.lat, g.lng]}
          icon={pinIcon(g.id === selectedId, g.pricePerHour)}
          eventHandlers={{ click: () => onSelect(g) }}
        />
      ))}
      <CenterOnSelected ground={selected} />
    </MapContainer>
  )
}
