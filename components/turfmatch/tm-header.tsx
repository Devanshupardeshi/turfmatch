"use client"

import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TmHeaderProps {
  title?: string
  subtitle?: ReactNode
  onBack?: () => void
  rightSlot?: ReactNode
  transparent?: boolean
}

export function TmHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
  transparent = false,
}: TmHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-5 py-4 sticky top-0 z-40",
        transparent
          ? "bg-gradient-to-b from-black/70 to-transparent"
          : "bg-slate-950/85 backdrop-blur-md border-b border-slate-800",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className={cn(
              "w-10 h-10 shrink-0 rounded-full flex items-center justify-center",
              "text-white active:scale-90 transition-transform",
              transparent
                ? "bg-slate-900/50 backdrop-blur-md border border-white/10"
                : "bg-[var(--surface-container)] border border-[var(--surface-container-high)] hover:bg-[var(--surface-container-high)]",
            )}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
        )}
        <div className="min-w-0">
          {title && (
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {rightSlot && (
        <div className="flex items-center gap-1 shrink-0">{rightSlot}</div>
      )}
    </header>
  )
}
