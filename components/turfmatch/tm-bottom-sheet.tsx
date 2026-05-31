"use client"

import { X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TmBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** Content to always pin at the bottom of the sheet (e.g. a CTA button) */
  footer?: ReactNode
  children: ReactNode
  size?: "auto" | "tall" | "full"
}

const SIZE_CLASS: Record<NonNullable<TmBottomSheetProps["size"]>, string> = {
  auto: "max-h-[80vh]",
  tall: "h-[75vh]",
  full: "h-[92vh]",
}

export function TmBottomSheet({
  isOpen,
  onClose,
  title,
  footer,
  children,
  size = "auto",
}: TmBottomSheetProps) {
  if (!isOpen) return null
  return (
    /*
     * z-[200]: must be above the bottom nav (z-50) and any other overlays.
     * The nav is rendered AFTER this sheet in the DOM, so equal z-indices
     * would let the nav win — this value guarantees the sheet always wins.
     */
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />

      {/* Sheet panel */}
      <div
        className={cn(
          "relative bg-slate-900 border-t border-slate-800",
          "rounded-t-3xl w-full max-w-md mx-auto",
          "flex flex-col animate-slide-up",
          // Horizontal padding; vertical split between header/footer/scroll
          "px-6 pt-4",
          SIZE_CLASS[size],
        )}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 shrink-0" />

        {/* Title row — never scrolls */}
        {title && (
          <div className="flex justify-between items-center mb-5 shrink-0">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/*
          Scrollable content area.
          flex-1 + overflow-y-auto means this grows/shrinks within the sheet.
          pb-2 gives a small gap between the last item and the footer.
        */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-2 hide-scrollbar">
          {children}
        </div>

        {/*
          Sticky footer — rendered OUTSIDE the scroll area so it is always
          fully visible at the bottom, never scrolled out of sight.
          padding-bottom uses env(safe-area-inset-bottom) so it clears the
          Android gesture bar / iOS home indicator automatically.
        */}
        {footer && (
          <div
            className="shrink-0 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            style={{ borderTop: "1px solid rgb(30 41 59 / 0.6)" }}
          >
            {footer}
          </div>
        )}

        {/* When no footer prop is provided, just add safe-area bottom padding */}
        {!footer && (
          <div className="shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]" />
        )}
      </div>
    </div>
  )
}
