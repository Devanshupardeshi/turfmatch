"use client"

import { useRef, useState, useEffect } from "react"
import {
  Activity,
  Loader2,
  MessageCircle,
  Share2,
  Shield,
  Trash2,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Phone,
  History,
  MapPin,
  MailPlus,
  Search,
  Star,
  Lock,
} from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmButton } from "@/components/turfmatch/tm-button"
import { TmBottomSheet } from "@/components/turfmatch/tm-bottom-sheet"
import { useMatch, useMe, usePlayerMatchStatus, requestToJoin, cancelMatch, getShareMatchData, removeFromHistory, useAvailablePlayers, respondToInvite } from "@/lib/turfmatch/use-supabase"
import { useAuth } from "@/lib/auth-context"
import { requestNotificationPermission } from "@/lib/notifications/permission"
import { ShareCard } from "./share-card"
import { cn } from "@/lib/utils"

export function MatchDetailScreen({ matchId, inviteAction }: { matchId?: string, inviteAction?: string }) {
  const { navigate, goBack, reset } = useNav()
  const { match: dbMatch, loading, refresh } = useMatch(matchId)
  const { me, hasPhone } = useMe()
  const { user } = useAuth()
  const { status: playerStatus, loading: statusLoading } = usePlayerMatchStatus(matchId)
  const match = dbMatch
  const currentUser = me
  const isHost = match && currentUser ? match.organizer.id === currentUser.id : false

  const [showShare, setShowShare] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [showPhoneSheet, setShowPhoneSheet] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [showInviteSheet, setShowInviteSheet] = useState(false)
  const [cancelSheet, setCancelSheet] = useState(false)
  const [showInviteLockSheet, setShowInviteLockSheet] = useState(false)

  // Past match check — if the match start time has passed, show read-only summary
  const matchDateTime = match ? new Date(`${match.date}T${match.startsAt}`) : new Date(NaN)
  const isPast = match ? !isNaN(matchDateTime.getTime()) && matchDateTime.getTime() < Date.now() : false

  const isFull = match ? match.filledSlots >= match.totalSlots : false
  const isJoined = playerStatus === "joined"
  const isPending = playerStatus === "pending"
  const isDeclined = playerStatus === "declined"
  const isInvited = playerStatus === "invited"
  const isInviteOnly = match ? match.visibility === "invite" : false
  const canJoinInviteOnly = isHost || isJoined || isInvited

  // Automatically process deep link invite actions
  useEffect(() => {
    if (inviteAction && matchId && user && isInvited) {
      // Clear the inviteAction param so we don't re-run it
      navigate("matchDetail", { matchId })
      
      const isAccept = inviteAction === "accept"
      setJoinLoading(true)
      respondToInvite(matchId, user.id, isAccept).then(() => {
        refresh()
        setJoinLoading(false)
      })
    }
  }, [inviteAction, matchId, user, isInvited, navigate, refresh])

  const handleJoinOrRequest = async () => {
    if (!user) return
    if (!hasPhone) {
      setShowPhoneSheet(true)
      return
    }
    setJoinLoading(true)
    try {
      // All matches: send request for host approval
      await requestToJoin(matchId!, user.id)
      await refresh()
      // Ask for notification permission after first meaningful interaction
      requestNotificationPermission("first_join").catch(() => {})
    } finally {
      setJoinLoading(false)
    }
  }

  const handleCancelMatch = async () => {
    if (!matchId) return
    await cancelMatch(matchId)
    setCancelSheet(false)
    navigate("home")
  }

  const handleShare = async () => {
    if (!matchId) return
    setShowShare(true)
  }

  if (showShare && match) {
    return <ShareCard match={match} onClose={() => setShowShare(false)} />
  }

  if (loading || !match) {
    return <MatchDetailSkeleton />
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col relative">
      <div className="relative h-64 shrink-0">
        <img
          src={match.ground.image || "/placeholder.svg"}
          alt={match.ground.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute top-0 left-0 right-0">
          <TmHeader
            onBack={goBack}
            transparent
            rightSlot={
              <button
                onClick={handleShare}
                aria-label="Share"
                className="p-2 -mr-2 rounded-full hover:bg-white/10 text-white"
              >
                <Share2 className="w-5 h-5" />
              </button>
            }
          />
        </div>
        <div className="absolute bottom-4 left-5 right-5">

          {isPast && (
            <span className="bg-[var(--on-surface-variant)] text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-2 ml-2">
              <History className="w-3 h-3 inline-block mr-1" /> Past Match
            </span>
          )}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {match.ground.name}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            {match.startsAt} · {match.date}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32">
        {/* Host actions — hidden for past matches */}
      {isHost && !isPast && (
          <div className="mb-3 p-3 bg-slate-900 border border-slate-800 rounded-3xl grid grid-cols-2 gap-2">
            <TmButton
              onClick={() => setShowInviteSheet(true)}
              variant="secondary"
              className="py-2 text-sm"
            >
              <MailPlus className="w-4 h-4" /> Invite players
            </TmButton>
            <TmButton
              onClick={() => navigate("manageRequests", { matchId: match.id })}
              variant="secondary"
              className="py-2 text-sm"
            >
              <Users className="w-4 h-4" /> Manage requests
            </TmButton>
            <TmButton
              onClick={() => navigate("scoreEntry", { matchId: match.id })}
              variant="secondary"
              className="py-2 text-sm relative"
            >
              <Activity className="w-4 h-4" /> Update score
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                SOON
              </span>
            </TmButton>
            <button
              onClick={() => setCancelSheet(true)}
              aria-label="Cancel match"
              className="col-span-2 p-2 bg-red-500/10 text-red-400 rounded-2xl text-sm font-bold hover:bg-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Cancel match
            </button>
          </div>
        )}

        {/* Live scorecard — only for active matches */}
        {match.score && !isPast && (
          <button
            onClick={() => navigate("liveScorecard", { matchId: match.id })}
            className="mb-6 w-full p-4 bg-gradient-to-r from-emerald-900/30 to-slate-900 border border-emerald-500/20 rounded-3xl text-center relative active:scale-[0.99] transition-transform"
          >
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse absolute -top-2 left-1/2 -translate-x-1/2">
              LIVE
            </span>
            <h3 className="text-slate-400 text-sm font-medium mt-1">Team A vs Team B</h3>
            <p className="text-3xl font-extrabold text-white mt-1">
              {match.score.teamA}/{match.score.wicketsA}{" "}
              <span className="text-lg text-slate-500 font-normal">
                ({match.score.oversA} Ov)
              </span>
            </p>
            <p className="text-emerald-400 text-xs font-semibold mt-2">
              View live scorecard →
            </p>
          </button>
        )}

        {/* Past Match Summary */}
        {isPast && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Match Summary
            </h3>
            <div className="space-y-3">
              <Row label="Date" value={`${match.date} at ${match.startsAt}`} />
              <Row label="Location" value={match.ground.name} />

              <Row label="Players" value={`${match.filledSlots}/${match.totalSlots}`} />
              <Row label="Price" value={`₹${match.pricePerPlayer} / player`} />
              {match.score && (
                <Row
                  label="Result"
                  value={`Team A ${match.score.teamA}/${match.score.wicketsA} (${match.score.oversA} Ov)`}
                />
              )}
            </div>
          </div>
        )}

        {/* TurfMatch protection — only for active matches */}
        {!isPast && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">TurfMatch protection active</p>
              <p className="text-slate-400 text-xs">
                Refunds if the match is cancelled by the host.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-white">
            Squad ({match.filledSlots}/{match.totalSlots})
          </h3>
          {!isPast && (
            <button
              onClick={() => navigate("chatRoom", { matchId: match.id })}
              className="text-emerald-400 text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <MessageCircle className="w-4 h-4" />
              Open chat
            </button>
          )}
        </div>
        <div className="space-y-2">
          {match.players.map(p => (
            <button
              key={p.id}
              onClick={() => navigate("playerProfile", { playerId: p.id })}
              className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-800/60 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.avatar || "/placeholder.svg"}
                  alt={p.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="text-left">
                  <p className="text-white text-sm font-medium flex items-center gap-2">
                    {p.name}
                    {p.id === match.organizer.id && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        HOST
                      </span>
                    )}
                  </p>
                  <p className="text-slate-500 text-xs">{p.role}</p>
                </div>
              </div>
              <span className="text-emerald-400 text-xs font-bold">
                {p.reliability}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer — active matches show join/leave, past matches show Remove from History */}
      {isPast ? (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
          <button
            onClick={async () => {
              if (!user || !matchId) return
              setRemoveLoading(true)
              const ok = await removeFromHistory(matchId, user.id)
              setRemoveLoading(false)
              if (ok) goBack()
            }}
            disabled={removeLoading}
            className="w-full py-3 bg-red-500/10 text-red-400 rounded-2xl text-sm font-bold hover:bg-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {removeLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Remove from History
          </button>
        </div>
      ) : !isHost && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
          {isJoined ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/15 text-emerald-400 font-bold rounded-2xl text-sm">
              <CheckCircle className="w-5 h-5" />
              You&apos;re in the squad!
            </div>
          ) : isPending ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-secondary/15 text-secondary font-bold rounded-2xl text-sm">
              <Clock className="w-5 h-5" />
              Request pending...
            </div>
          ) : isDeclined ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-red-500/15 text-red-400 font-bold rounded-2xl text-sm">
              <XCircle className="w-5 h-5" />
              Request declined
            </div>
          ) : isInviteOnly && !canJoinInviteOnly ? (
            <button
              onClick={() => setShowInviteLockSheet(true)}
              className="w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Lock className="w-4 h-4" />
              Invite Only — Locked
            </button>
          ) : isFull ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-400 font-bold rounded-2xl text-sm">
              Match Full
            </div>
          ) : (
            <TmButton onClick={handleJoinOrRequest} disabled={joinLoading}>
              {joinLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </span>
              ) : (
                "Send Request"
              )}
            </TmButton>
          )}
        </div>
      )}

      <TmBottomSheet
        isOpen={cancelSheet}
        onClose={() => setCancelSheet(false)}
        title="Cancel match?"
      >
        <p className="text-slate-400 mb-6 leading-relaxed">
          This will refund all {Math.max(match.filledSlots - 1, 0)} joined players.
          Your reliability score may be affected.
        </p>
        <div className="space-y-3">
          <TmButton
            variant="danger"
            onClick={handleCancelMatch}
          >
            Yes, cancel match
          </TmButton>
          <TmButton variant="ghost" onClick={() => setCancelSheet(false)}>
            Keep match
          </TmButton>
        </div>
      </TmBottomSheet>

      {/* Invite Players Sheet */}
      <InvitePlayersSheet
        isOpen={showInviteSheet}
        onClose={() => setShowInviteSheet(false)}
        matchId={matchId}
      />

      {/* Invite Only Lock Explanation */}
      <TmBottomSheet
        isOpen={showInviteLockSheet}
        onClose={() => setShowInviteLockSheet(false)}
        title="Invite Only Match"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-foreground font-bold text-base mb-2">
            This match is invite-only
          </p>
          <p className="text-[var(--on-surface-variant)] text-sm mb-6">
            The host controls who gets in. You can only join if the host sends you a direct invite.
          </p>
          <TmButton onClick={() => setShowInviteLockSheet(false)}>
            Got it
          </TmButton>
        </div>
      </TmBottomSheet>

      {/* Phone Required Sheet */}
      <TmBottomSheet
        isOpen={showPhoneSheet}
        onClose={() => setShowPhoneSheet(false)}
        title="Phone number required"
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-primary" />
          </div>
          <p className="text-foreground font-bold text-base mb-2">
            Add your phone number to join matches
          </p>
          <p className="text-[var(--on-surface-variant)] text-sm mb-6">
            Your number is shared only with match participants so they can coordinate.
          </p>
          <TmButton
            onClick={() => {
              setShowPhoneSheet(false)
              navigate("profile")
            }}
          >
            Go to Profile
          </TmButton>
        </div>
      </TmBottomSheet>
    </div>
  )
}

function InvitePlayersSheet({
  isOpen,
  onClose,
  matchId,
}: {
  isOpen: boolean
  onClose: () => void
  matchId?: string
}) {
  const { user } = useAuth()
  const {
    players,
    total,
    playerStatuses,
    loading,
    loadingMore,
    error: inviteError,
    loadMore,
    search,
    setSearch,
    refresh,
    sendInvite,
  } = useAvailablePlayers(user?.id, matchId)
  const [sending, setSending] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Debounced search: refresh API when user stops typing for 300ms
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      refresh({ searchQuery: value })
    }, 300)
  }

  const invitedIds = new Set(
    Object.entries(playerStatuses)
      .filter(([_, status]) => status === "invited")
      .map(([id]) => id)
  )

  const handleInvite = async (playerId: string) => {
    if (!matchId) return
    if (invitedIds.has(playerId)) return
    setSending(playerId)
    await sendInvite(matchId, playerId)
    setSending(null)
  }

  // Infinite scroll: load more when user scrolls near bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom) loadMore()
  }

  return (
    <TmBottomSheet isOpen={isOpen} onClose={onClose} title="Invite Players">
      {/* Header count + search */}
      <div className="mb-3">
        <p className="text-emerald-400 text-xs font-semibold mb-2">
          {total.toLocaleString()} active {total === 1 ? "player" : "players"} available
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search players by name..."
            className="w-full bg-slate-900/50 border border-slate-800/60 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      {inviteError ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-bold text-sm mb-1">
            Couldn&apos;t load players
          </p>
          <p className="text-slate-500 text-xs mb-3">{inviteError}</p>
          <button
            onClick={() => refresh()}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-bold text-sm mb-1">
            {search ? "No players match your search" : "No available players right now"}
          </p>
          <p className="text-slate-500 text-xs">
            {search
              ? "Try a different search term."
              : "Players who set their availability will show up here."}
          </p>
        </div>
      ) : (
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-[55vh] overflow-y-auto pr-1"
        >
          {players.map((p) => {
            const status = playerStatuses[p.id]
            const isInvited = status === "invited"
            const isJoined = status === "joined"
            const isPending = status === "pending"
            const isDisabled = sending === p.id || isInvited || isJoined || isPending

            let btnText = "Invite"
            if (sending === p.id) btnText = ""
            else if (isInvited) btnText = "Invited"
            else if (isJoined) btnText = "Joined"
            else if (isPending) btnText = "Requested"

            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-800/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.avatar || "/placeholder.svg"}
                    alt={p.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium flex items-center gap-1 truncate">
                      {p.name}
                      <span className="text-emerald-400 text-[10px] shrink-0">
                        <Star className="w-3 h-3 inline fill-current" /> {p.rating.toFixed(1)}
                      </span>
                    </p>
                    <p className="text-slate-500 text-xs">
                      {p.role} · {p.reliability}% reliability
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(p.id)}
                  disabled={isDisabled}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ml-2",
                    isInvited || isJoined || isPending
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95",
                    "disabled:opacity-50 disabled:active:scale-100",
                  )}
                >
                  {sending === p.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    btnText
                  )}
                </button>
              </div>
            )
          })}

          {/* Load more indicator / button */}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
          )}
          {!loadingMore && players.length < total && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadMore}
                className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
              >
                Load more ({total - players.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </TmBottomSheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-300">
      <span>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

function MatchDetailSkeleton() {
  return (
    <div className="h-full bg-slate-950 flex flex-col relative">
      {/* Hero image skeleton */}
      <div className="relative h-64 shrink-0 skeleton" />

      {/* Header bar skeleton */}
      <div className="absolute top-0 left-0 right-0 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="w-8 h-8 rounded-full skeleton" />
        </div>
      </div>

      {/* Title skeleton */}
      <div className="absolute bottom-4 left-5 right-5 space-y-2">
        <div className="h-3 w-16 rounded-full skeleton" />
        <div className="h-7 w-3/4 rounded-full skeleton" />
        <div className="h-3 w-32 rounded-full skeleton" />
      </div>

      {/* Body skeleton */}
      <div className="flex-1 px-5 pt-6 pb-32 space-y-4">
        <div className="h-24 rounded-3xl skeleton" />
        <div className="h-40 rounded-3xl skeleton" />
        <div className="h-16 rounded-3xl skeleton" />
      </div>
    </div>
  )
}
