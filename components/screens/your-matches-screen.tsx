"use client"

import {
  Trophy,
  CheckCircle2,
  Clock,
  Mail,
  History,
  ChevronRight,
  Plus,
} from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { useMyMatches } from "@/lib/turfmatch/use-supabase"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  {
    id: "createdMatches" as const,
    label: "Created",
    desc: "Matches you are hosting",
    icon: Trophy,
    color: "bg-emerald-500/15 text-emerald-400",
    countKey: "created" as const,
  },
  {
    id: "joinedMatches" as const,
    label: "Joined",
    desc: "Matches you are playing in",
    icon: CheckCircle2,
    color: "bg-blue-500/15 text-blue-400",
    countKey: "joined" as const,
  },
  {
    id: "pendingRequests" as const,
    label: "Pending",
    desc: "Awaiting host approval",
    icon: Clock,
    color: "bg-amber-500/15 text-amber-400",
    countKey: "pending" as const,
  },
  {
    id: "matchInvites" as const,
    label: "Invites",
    desc: "Host invites for you",
    icon: Mail,
    color: "bg-violet-500/15 text-violet-400",
    countKey: "invites" as const,
  },
  {
    id: "matchHistory" as const,
    label: "History",
    desc: "Past matches",
    icon: History,
    color: "bg-slate-500/15 text-slate-400",
    countKey: "history" as const,
  },
]

export function YourMatchesScreen() {
  const { goBack, navigate } = useNav()
  const { created, joined, pending, history, invites } = useMyMatches()

  const counts = { created, joined, pending, invites, history }
  const activeCount = created.length + joined.length
  const pendingCount = pending.length

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="Your Matches"
        subtitle={`${activeCount} active · ${pendingCount} pending`}
        onBack={goBack}
      />

      {/* Create Match CTA */}
      <div className="px-5 pt-4">
        <button
          onClick={() => navigate("createMatch")}
          className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="text-foreground font-bold text-sm">Host a Match</p>
            <p className="text-[var(--on-surface-variant)] text-xs">
              Create and invite players
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--outline)]" />
        </button>
      </div>

      {/* Category list */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-3">
          Categories
        </p>
        <div className="space-y-2.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = (counts as any)[cat.countKey].length as number
            return (
              <button
                key={cat.id}
                onClick={() => navigate(cat.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border text-left",
                  "bg-card border-[var(--surface-container-high)] active:scale-[0.98] transition-transform"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold text-sm">{cat.label}</span>
                    {count > 0 && (
                      <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--on-surface-variant)] text-xs mt-0.5">{cat.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--outline)] shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24" />
    </div>
  )
}
