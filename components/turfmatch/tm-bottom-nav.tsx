"use client"

import { Home, Trophy, Plus, MessageCircle } from "lucide-react"
import { StadiumIcon } from "@/components/turfmatch/stadium-icon"
import { useNav, type ScreenName } from "@/lib/turfmatch/navigation"
import { cn } from "@/lib/utils"

interface TabDef {
  id: ScreenName
  icon: typeof Home | typeof StadiumIcon
  label: string
  isAction?: boolean
  isHighlighted?: boolean
}

// Repo design: Home / Leagues / Create (FAB center) / Turfs (stadium) / Chat
const TABS: TabDef[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "tournaments", icon: Trophy, label: "Leagues" },
  { id: "createMatch", icon: Plus, label: "Create", isAction: true },
  { id: "turfMap", icon: StadiumIcon, label: "Turfs", isHighlighted: true },
  { id: "chatInbox", icon: MessageCircle, label: "Chat" },
]

export function TmBottomNav() {
  const { current, navigate } = useNav()
  return (
    <nav
      role="tablist"
      aria-label="Primary"
      className={cn(
        "absolute bottom-0 left-0 right-0 z-50",
        // Height expands to include safe-area so the nav never sits behind
        // the Android gesture bar or iOS home indicator
        "pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
        "pt-2 px-2",
        "bg-[var(--surface)]/90 backdrop-blur-xl border-t border-[var(--surface-container-high)]",
        "flex items-center justify-around",
      )}
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const isActive = current.screen === tab.id

        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              aria-label={tab.label}
              className={cn(
                "w-14 h-14 rounded-full",
                "bg-primary text-primary-foreground",
                "shadow-[0_0_24px_var(--brand-glow)]",
                "flex items-center justify-center",
                "active:scale-95 transition-transform",
                "border-4 border-[var(--surface)]",
              )}
            >
              <Icon className="w-7 h-7" strokeWidth={2.75} />
            </button>
          )
        }

        // Highlighted tab (Turfs) renders as a glowing primary pill
        // when active, matching the repo mockup.
        if (tab.isHighlighted && isActive) {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected
              onClick={() => navigate(tab.id)}
              className={cn(
                "w-12 h-12 rounded-full bg-primary text-primary-foreground",
                "shadow-[0_0_24px_var(--brand-glow)]",
                "flex items-center justify-center active:scale-95 transition-transform",
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={2.4} />
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => navigate(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl",
              "transition-colors active:scale-95",
              isActive
                ? "text-primary"
                : "text-[var(--outline)] hover:text-[var(--on-surface-variant)]",
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wide uppercase">
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
