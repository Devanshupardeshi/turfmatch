"use client"

import { CalendarCheck2, Eye, EyeOff } from "lucide-react"
import { useAvailability } from "@/lib/turfmatch/availability-store"
import type { AvailabilityWindow } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const PILLS: { id: AvailabilityWindow; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_weekend", label: "Weekend" },
  { id: "not_available", label: "Not avl." },
]

export function AvailabilityCard() {
  const { availability, setAvailability, isAvailableNow } = useAvailability()

  return (
    <div
      className={cn(
        "rounded-3xl p-4 border transition-colors",
        isAvailableNow
          ? "bg-primary/10 border-primary/40 shadow-[0_0_24px_var(--brand-glow)]"
          : "bg-card border-[var(--surface-container-high)]",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center",
            isAvailableNow
              ? "bg-primary text-primary-foreground"
              : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
          )}
        >
          {isAvailableNow ? (
            <CalendarCheck2 className="w-5 h-5" strokeWidth={2.4} />
          ) : (
            <EyeOff className="w-5 h-5" strokeWidth={2.2} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary leading-none">
            Availability
          </p>
          <h3 className="font-display text-foreground text-base leading-tight mt-1 uppercase tracking-wide">
            {isAvailableNow
              ? "You're shown to other players"
              : "You're hidden from search"}
          </h3>
          <p className="text-[11px] text-[var(--on-surface-variant)] mt-0.5 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {isAvailableNow
              ? "Hosts can invite you to fill open slots."
              : "Mark when you can play to get match invites."}
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Availability"
        className="mt-3 grid grid-cols-4 gap-1.5"
      >
        {PILLS.map(p => {
          const isActive = availability === p.id
          const isOff = p.id === "not_available"
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => setAvailability(p.id)}
              className={cn(
                "py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider",
                "border transition-colors active:scale-95",
                isActive
                  ? isOff
                    ? "bg-[var(--surface-container-high)] border-[var(--outline)] text-foreground"
                    : "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_var(--brand-glow)]"
                  : "bg-card/60 border-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
