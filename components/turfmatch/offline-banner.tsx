"use client"

import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { cn } from "@/lib/utils"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute top-2 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-destructive text-destructive-foreground",
        "text-[11px] font-bold uppercase tracking-wider",
        "shadow-lg animate-fade-in",
      )}
    >
      <WifiOff className="w-3.5 h-3.5" />
      No internet — using cached data
    </div>
  )
}
