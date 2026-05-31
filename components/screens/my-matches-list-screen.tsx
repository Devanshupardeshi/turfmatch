"use client"

import { memo, useState } from "react"
import {
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  Trophy,
  CheckCircle2,
  Loader2,
  MapPin,
  CircleDot,
  History,
  Mail,
  Check,
  XCircle,
} from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { useMyMatches, respondToInvite } from "@/lib/turfmatch/use-supabase"
import { useAuth } from "@/lib/auth-context"
import type { Match } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

type ListType = "created" | "joined" | "pending" | "invites" | "history"

const CONFIG: Record<
  ListType,
  {
    title: string
    emptyTitle: string
    emptySubtitle: string
    emptyIcon: React.ReactNode
    ctaLabel?: string
    ctaScreen?: import("@/lib/turfmatch/navigation").ScreenName
  }
> = {
  created: {
    title: "Created",
    emptyTitle: "No matches hosted yet",
    emptySubtitle: "Be the host — create your first match and invite players!",
    emptyIcon: <Trophy className="w-12 h-12 text-[var(--outline)]" />,
    ctaLabel: "Host a Match",
    ctaScreen: "createMatch",
  },
  joined: {
    title: "Joined",
    emptyTitle: "No matches joined",
    emptySubtitle: "Browse live matches near you and jump into the action!",
    emptyIcon: <CheckCircle2 className="w-12 h-12 text-[var(--outline)]" />,
    ctaLabel: "Browse Matches",
    ctaScreen: "home",
  },
  pending: {
    title: "Pending",
    emptyTitle: "No pending requests",
    emptySubtitle: "Your join requests will appear here once you apply.",
    emptyIcon: <CircleDot className="w-12 h-12 text-[var(--outline)]" />,
    ctaLabel: "Find Matches",
    ctaScreen: "home",
  },
  invites: {
    title: "Invites",
    emptyTitle: "No invites yet",
    emptySubtitle: "When a host invites you to a match, it will show up here.",
    emptyIcon: <Mail className="w-12 h-12 text-[var(--outline)]" />,
  },
  history: {
    title: "History",
    emptyTitle: "No match history",
    emptySubtitle: "Past matches appear automatically once their time passes.",
    emptyIcon: <History className="w-12 h-12 text-[var(--outline)]" />,
  },
}

export function MyMatchesListScreen({ type }: { type: ListType }) {
  const { goBack, navigate } = useNav()
  const { user } = useAuth()
  const { created, joined, pending, history, invites, loading, refresh } = useMyMatches()
  const [respondLoading, setRespondLoading] = useState<string | null>(null)
  const config = CONFIG[type]

  const list =
    type === "created"
      ? created
      : type === "joined"
        ? joined
        : type === "pending"
          ? pending
          : type === "invites"
            ? invites
            : history

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-[var(--surface-container-high)]">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-container)] active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-foreground font-bold text-lg">{config.title}</h1>
            <p className="text-[var(--on-surface-variant)] text-xs">
              {list.length} {list.length === 1 ? "match" : "matches"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon}
            title={config.emptyTitle}
            subtitle={config.emptySubtitle}
            ctaLabel={config.ctaLabel}
            onCta={config.ctaScreen ? () => navigate(config.ctaScreen!) : undefined}
          />
        ) : type === "pending" ? (
          <div className="space-y-3 content-fade">
            {(list as { match: Match; requestId: string; status: string }[]).map((p) => (
              <PendingCard
                key={p.requestId}
                match={p.match}
                onTap={() => navigate("matchDetail", { matchId: p.match.id })}
              />
            ))}
          </div>
        ) : type === "invites" ? (
          <div className="space-y-3 content-fade">
            {(list as Match[]).map((m) => (
              <div
                key={m.id}
                className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Invited by host
                  </span>
                </div>
                <h3 className="text-foreground font-bold text-sm mb-1 truncate">{m.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--on-surface-variant)] mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {m.ground?.name || "TBA"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {m.date} · {m.startsAt}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setRespondLoading(m.id)
                      const ok = await respondToInvite(m.id, user!.id, true)
                      setRespondLoading(null)
                      if (ok) refresh()
                    }}
                    disabled={respondLoading === m.id}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {respondLoading === m.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      setRespondLoading(m.id)
                      const ok = await respondToInvite(m.id, user!.id, false)
                      setRespondLoading(null)
                      if (ok) refresh()
                    }}
                    disabled={respondLoading === m.id}
                    className="flex-1 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 content-fade">
            {(list as Match[]).map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                onTap={() => navigate("matchDetail", { matchId: m.id })}
                showManage={type === "created"}
                onManage={
                  type === "created"
                    ? () => navigate("manageRequests", { matchId: m.id })
                    : undefined
                }
                isHistory={type === "history"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Match Row Card ───────────────────────────────────────────────────────────

const MatchRow = memo(function MatchRow({
  match,
  onTap,
  showManage,
  onManage,
  isHistory,
}: {
  match: Match
  onTap: () => void
  showManage?: boolean
  onManage?: () => void
  isHistory?: boolean
}) {
  const slotsLeft = match.totalSlots - match.filledSlots

  return (
    <button
      onClick={onTap}
      className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 text-left card-press"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
            isHistory
              ? "bg-[var(--on-surface-variant)]/15 text-[var(--on-surface-variant)]"
              : match.status === "open"
                ? "bg-primary/15 text-primary"
                : match.status === "live"
                  ? "bg-red-500/15 text-red-400"
                  : match.status === "completed"
                    ? "bg-[var(--on-surface-variant)]/15 text-[var(--on-surface-variant)]"
                    : "bg-secondary/15 text-secondary",
          )}
        >
          {isHistory ? "Past" : match.status === "filling_fast" ? "Filling Fast" : match.status}
        </span>
      </div>

      <h3 className="text-foreground font-bold text-sm mb-1 truncate">{match.title}</h3>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--on-surface-variant)]">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {match.ground?.name || "TBA"}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {match.date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {match.startsAt}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {match.filledSlots}/{match.totalSlots}
          {slotsLeft > 0 && slotsLeft <= 3 && (
            <span className="text-secondary ml-1">({slotsLeft} left!)</span>
          )}
        </span>
      </div>

      {showManage && onManage && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onManage()
          }}
          className="mt-3 w-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider py-2 rounded-xl active:scale-[0.97] transition-transform"
        >
          Manage Requests
        </button>
      )}
    </button>
  )
})

// ── Pending Card ─────────────────────────────────────────────────────────────

const PendingCard = memo(function PendingCard({ match, onTap }: { match: Match; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="w-full bg-card border border-secondary/30 rounded-2xl p-4 text-left card-press"
    >
      <div className="flex items-center gap-2 mb-2">
        <CircleDot className="w-4 h-4 text-secondary animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
          Awaiting approval
        </span>
      </div>
      <h3 className="text-foreground font-bold text-sm mb-1 truncate">{match.title}</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--on-surface-variant)]">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {match.ground?.name || "TBA"}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {match.date} · {match.startsAt}
        </span>
      </div>
    </button>
  )
})

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      {icon}
      <p className="text-foreground font-bold mt-3 mb-1">{title}</p>
      <p className="text-[var(--on-surface-variant)] text-sm">{subtitle}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-16 rounded-full skeleton" />
      </div>
      <div className="h-4 w-3/4 rounded-full skeleton mb-2" />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="h-3 w-20 rounded-full skeleton" />
        <div className="h-3 w-24 rounded-full skeleton" />
        <div className="h-3 w-16 rounded-full skeleton" />
      </div>
    </div>
  )
}
