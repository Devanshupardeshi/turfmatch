"use client"

import { useState } from "react"
import { Shield, Calendar, Clock, ChevronLeft, Loader2, Timer, Phone } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"
import { TmBottomSheet } from "@/components/turfmatch/tm-bottom-sheet"
import { GROUNDS, MATCHES } from "@/lib/turfmatch/data"
import { useGrounds, useMe, createMatch } from "@/lib/turfmatch/use-supabase"
import { useAuth } from "@/lib/auth-context"
import { requestNotificationPermission } from "@/lib/notifications/permission"
import type { MatchVisibility } from "@/lib/turfmatch/types"
import { ShareCard } from "./share-card"
import { cn } from "@/lib/utils"


const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hrs", value: 90 },
  { label: "2 hours", value: 120 },
]
const VISIBILITY: { id: MatchVisibility; label: string; desc: string; comingSoon?: boolean }[] = [
  { id: "public", label: "Public", desc: "Open to anyone nearby" },
  { id: "private", label: "Private", desc: "Visible only to friends" },
  { id: "invite", label: "Invite only", desc: "Host invites players directly" },
  { id: "squad", label: "Squad only", desc: "Your verified squad only", comingSoon: true },
]

export function CreateMatchScreen({ groundId }: { groundId?: string }) {
  const { navigate, goBack } = useNav()
  const { grounds: dbGrounds } = useGrounds()
  const { me, hasPhone } = useMe()
  const { user } = useAuth()
  const displayGrounds = dbGrounds && dbGrounds.length > 0 ? dbGrounds : GROUNDS

  const [step, setStep] = useState(1)

  const [slots, setSlots] = useState(14)
  const [price, setPrice] = useState(150)
  const [matchDate, setMatchDate] = useState("")
  const [matchTime, setMatchTime] = useState("")
  const [duration, setDuration] = useState(60)
  const [visibility, setVisibility] = useState<MatchVisibility>("public")
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(groundId ?? null)
  const [showShare, setShowShare] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPhoneSheet, setShowPhoneSheet] = useState(false)

  const selectedGround = displayGrounds.find(g => g.id === selectedGroundId)
  const matchTitle = selectedGround
    ? `Match at ${selectedGround.name}`
    : "New Match"

  if (showShare) {
    const shareMatch = {
      ...MATCHES[0],
      id: createdMatchId || MATCHES[0].id,
      title: matchTitle,
      ground: selectedGround || MATCHES[0].ground,
      startsAt: matchTime || MATCHES[0].startsAt,
      date: matchDate || MATCHES[0].date,
      totalSlots: slots,
      filledSlots: 1,
      pricePerPlayer: price,

      visibility,
    }
    return <ShareCard match={shareMatch} onClose={() => navigate("home")} />
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
    else navigate("home")
  }

  const handleNext = async () => {
    if (step === 1) { setStep(2); return }
    if (step === 2) { setStep(3); return }

    // Step 3 — actually create the match
    if (!user || !selectedGroundId) return
    if (!hasPhone) {
      setShowPhoneSheet(true)
      return
    }
    setCreating(true)
    setError(null)

    try {
      const matchId = await createMatch({
        title: matchTitle,
        ground_id: selectedGroundId,
        ground: selectedGround,
        starts_at: matchTime || "18:00",
        date: matchDate || new Date().toISOString().split("T")[0],

        skill_level: "Intermediate",
        visibility,
        total_slots: slots,
        price_per_player: price,
        organizer_id: user.id,
        rules: [],
        duration_minutes: duration,
        description: "",
        sport_type: "cricket",
      })

      if (matchId) {
        setCreatedMatchId(matchId)
        setShowShare(true)
        // Ask for notification permission after first meaningful action
        requestNotificationPermission("first_match_created").catch(() => {})
      } else {
        setError("Failed to create match. Please try again.")
      }
    } catch (e) {
      setError("Something went wrong. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const isFutureDateTime = (date: string, time: string) => {
    if (!date || !time) return false
    const selected = new Date(`${date}T${time}`)
    const now = new Date()
    // Round down to minute to avoid edge cases
    now.setSeconds(0, 0)
    return selected.getTime() > now.getTime()
  }

  const canNext =
    (step === 1 && slots > 0 && !!matchDate && !!matchTime && isFutureDateTime(matchDate, matchTime)) ||
    (step === 2 && !!selectedGroundId) ||
    step === 3

  const stepTitle = step === 1 ? "Match Details" : step === 2 ? "Choose Turf" : "Visibility"
  const stepSubtitle =
    step === 1
      ? "Set the date, time and slots"
      : step === 2
        ? "Pick where you'll play"
        : "Who can see and join this match"

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      {/* ── Custom Header with Back ── */}
      <header className="flex items-center gap-3 px-5 py-4 sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-300 active:scale-90 transition-transform shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight leading-tight truncate">
            {stepTitle}
          </h1>
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{stepSubtitle}</p>
        </div>
      </header>

      {/* ── Step Progress Bar ── */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                s <= step ? "bg-emerald-500" : "bg-slate-800",
              )}
            />
          ))}
        </div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-2">
          Step {step} of 3
        </p>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* ──── STEP 1 ──── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* ── Premium Date Picker ── */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Match Date
              </label>
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {(() => {
                  const today = new Date()
                  const chips: { label: string; sub: string; value: string }[] = []
                  for (let i = 0; i < 7; i++) {
                    const d = new Date(today)
                    d.setDate(today.getDate() + i)
                    const iso = d.toISOString().split("T")[0]
                    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" })
                    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    chips.push({ label: dayName, sub: dateLabel, value: iso })
                  }
                  return chips.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setMatchDate(c.value)}
                      className={cn(
                        "flex-shrink-0 px-4 py-3 rounded-2xl border text-center transition-all active:scale-95 min-w-[5rem]",
                        matchDate === c.value
                          ? "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700",
                      )}
                    >
                      <span className={cn(
                        "block text-sm font-bold",
                        matchDate === c.value ? "text-emerald-300" : "text-white",
                      )}>{c.label}</span>
                      <span className={cn(
                        "block text-[10px] mt-0.5 font-medium",
                        matchDate === c.value ? "text-emerald-400/70" : "text-slate-500",
                      )}>{c.sub}</span>
                    </button>
                  ))
                })()}
              </div>
              <input
                id="match-date"
                type="date"
                value={matchDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setMatchDate(e.target.value)}
                className={cn(
                  "w-full bg-slate-900/60 border rounded-2xl px-4 py-3 text-white text-sm",
                  "focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]",
                  matchDate ? "border-emerald-500/30" : "border-slate-800",
                )}
              />
            </div>

            {/* ── Premium Time Picker ── */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Match Time
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {["06:00", "07:00", "08:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map(t => {
                  const [h] = t.split(":")
                  const hour = parseInt(h)
                  const label = hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMatchTime(t)}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-bold transition-all active:scale-95",
                        matchTime === t
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-900/80 border-slate-800 text-white hover:border-slate-700",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-medium">Custom:</span>
                <input
                  id="match-time"
                  type="time"
                  value={matchTime}
                  onChange={e => setMatchTime(e.target.value)}
                  className={cn(
                    "flex-1 bg-slate-900/60 border rounded-xl px-4 py-2.5 text-white text-sm",
                    "focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]",
                    matchTime ? "border-emerald-500/30" : "border-slate-800",
                  )}
                />
              </div>
            </div>

            {/* Slots & Price */}
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Total Slots"
                value={slots}
                onChange={setSlots}
                min={4}
                max={25}
              />
              <NumberField
                label="Price / Player (₹)"
                value={price}
                onChange={setPrice}
                min={0}
                max={2000}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Match Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95",
                      duration === d.value
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-white",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date validation error */}
            {!!matchDate && !!matchTime && !isFutureDateTime(matchDate, matchTime) && (
              <p className="text-red-400 text-xs font-medium">
                Match date and time must be in the future.
              </p>
            )}

            {/* Protection notice */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3 items-start">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">TurfMatch Protection active</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Players get auto-refunds if you cancel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ──── STEP 2 ──── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Choose a Turf
            </p>
            {displayGrounds.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroundId(g.id)}
                className={cn(
                  "w-full p-3 rounded-3xl border transition-all flex gap-4 items-center text-left active:scale-[0.98]",
                  selectedGroundId === g.id
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700",
                )}
              >
                <img
                  src={g.image || "/placeholder.svg"}
                  alt={g.name}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold truncate">{g.name}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {g.location} · {g.distanceKm} km
                  </p>
                  <p className="text-emerald-400 font-bold text-sm mt-1">₹{g.pricePerHour}/hr</p>
                </div>
                <span
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedGroundId === g.id ? "border-emerald-500" : "border-slate-600",
                  )}
                >
                  {selectedGroundId === g.id && (
                    <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ──── STEP 3 ──── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Who Can Join?
            </p>
            {VISIBILITY.map(v => (
              <button
                key={v.id}
                type="button"
                disabled={v.comingSoon}
                onClick={() => !v.comingSoon && setVisibility(v.id)}
                className={cn(
                  "w-full p-4 rounded-2xl border flex justify-between items-center transition-all text-left",
                  v.comingSoon
                    ? "bg-slate-900/50 border-slate-800/60 opacity-60 cursor-not-allowed"
                    : visibility === v.id
                      ? "bg-emerald-500/10 border-emerald-500 active:scale-[0.98]"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 active:scale-[0.98]",
                )}
              >
                <div>
                  <p className="text-white font-bold flex items-center gap-2">
                    {v.label}
                    {v.comingSoon && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Coming Soon
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{v.desc}</p>
                </div>
                {!v.comingSoon && (
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 shrink-0",
                      visibility === v.id
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-600",
                    )}
                  />
                )}
              </button>
            ))}

            {/* Summary card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
                Match Summary
              </p>

              <SummaryRow label="Slots" value={`${slots} players`} />
              <SummaryRow label="Price" value={`₹${price} / player`} />
              <SummaryRow
                label="Date"
                value={matchDate || "Not set"}
              />
              <SummaryRow
                label="Time"
                value={matchTime || "Not set"}
              />
              <SummaryRow label="Turf" value={selectedGround?.name ?? "Not selected"} />
              <SummaryRow label="Duration" value={DURATIONS.find(d => d.value === duration)?.label || `${duration} min`} />
            </div>
          </div>
        )}

        {/* Bottom spacer so content scrolls above the fixed CTA */}
        <div className="h-24" />
      </div>

      {/* ── Fixed CTA Button ── */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 safe-area-pb">
        {error && (
          <p className="text-red-400 text-xs text-center mb-2 font-medium">{error}</p>
        )}
        <TmButton onClick={handleNext} disabled={!canNext || creating}>
          {creating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Creating...
            </span>
          ) : step < 3 ? "Next →" : "Create Match & Share"}
        </TmButton>
      </div>

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
            Add your phone number to host matches
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:scale-95 transition-transform text-lg leading-none"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-white font-bold text-lg tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center active:scale-95 transition-transform text-lg leading-none"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}
