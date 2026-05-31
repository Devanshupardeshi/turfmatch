// Stylised cricket-stadium glyph — used on Turfs nav tab and as map markers.
// Renders an SVG so it can be sized via Tailwind/Leaflet alike.

import type { SVGProps } from "react"

export function StadiumIcon({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Dome roof */}
      <path d="M3 12 C 3 5, 21 5, 21 12" />
      {/* Three pillars / stumps */}
      <path d="M6.5 12 v 5.5" />
      <path d="M12 12 v 5.5" />
      <path d="M17.5 12 v 5.5" />
      {/* Pitch base line */}
      <path d="M3 17.5 h 18" />
    </svg>
  )
}
