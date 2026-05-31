"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Mobile-first app frame.
 * - On mobile (< sm): full-screen.
 * - On desktop: shows the app inside a phone-shaped device frame, centered,
 *   so the same UI works as a launchable web preview.
 */
export function TmAppFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-[100dvh] w-full bg-black flex items-center justify-center",
        "p-0 sm:p-6",
        "font-sans text-slate-100 selection:bg-emerald-500/30",
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-[420px] bg-slate-950 overflow-hidden",
          "h-[100dvh] sm:h-[860px] sm:max-h-[92vh]",
          "sm:rounded-[2.75rem] sm:border-[10px] sm:border-slate-900 sm:shadow-2xl",
          "flex flex-col",
        )}
      >
        {children}
      </div>
    </div>
  )
}
