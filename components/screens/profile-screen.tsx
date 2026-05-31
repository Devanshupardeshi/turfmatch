"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { resolveLocation, useLocation } from "@/lib/turfmatch/location-store"
import { retryPushTokenSync, unregisterPushToken } from "@/lib/notifications/push-token"
import {
  ChevronLeft,
  Trophy,
  Star,
  MapPin,
  Edit3,
  Camera,
  Save,
  Check,
  Bell,
  Shield,
  LogOut,
  WifiOff,
  CreditCard,
  HelpCircle,
  Settings,
  Zap,
  Phone,
  Calendar,
} from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmBottomSheet } from "@/components/turfmatch/tm-bottom-sheet"
import { TmButton } from "@/components/turfmatch/tm-button"
import { useMe, useMatches } from "@/lib/turfmatch/use-supabase"
import { useAvailability } from "@/lib/turfmatch/availability-store"
import type { AvailabilityWindow } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const AVAILABILITY_OPTIONS: { id: AvailabilityWindow; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_weekend", label: "This weekend" },
  { id: "not_available", label: "Not available" },
]

export function ProfileScreen() {
  const { navigate, reset, goBack } = useNav()
  const { me: currentUser, loading: meLoading } = useMe()
  const { matches: dbMatches } = useMatches()
  const { signOut, user, profile, updateProfile } = useAuth()
  const { availability, setAvailability } = useAvailability()
  const [showSettings, setShowSettings] = useState(false)
  const [phone, setPhone] = useState("")
  const [phoneSaved, setPhoneSaved] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locSaved, setLocSaved] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [manualZone, setManualZone] = useState("")
  const [manualCity, setManualCity] = useState("")
  const recentMatches = dbMatches.slice(0, 2)

  // Live location from GPS
  const { location: liveLocation, refresh: refreshLocation } = useLocation()

  // Refresh live location when profile screen opens
  useEffect(() => {
    refreshLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync phone input from profile (strip +91 prefix)
  useEffect(() => {
    if (profile?.phone) {
      const digits = profile.phone.replace(/^\+91/, "")
      setPhone(digits)
    }
  }, [profile?.phone])

  // Show loading state while auth resolves
  if (meLoading || !currentUser) {
    return (
      <div className="h-full bg-background flex flex-col">
        <TmHeader title="My Profile" onBack={goBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-28 h-28 bg-card rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-40 bg-card rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-56 bg-card rounded mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="My Profile"
        onBack={goBack}
        rightSlot={
          <button
            aria-label="Settings"
            onClick={() => setShowSettings(true)}
            className="p-2 -mr-2 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]"
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-50 blur" />
            <img
              src={currentUser.avatar || "/placeholder.svg"}
              alt={currentUser.name}
              className="relative w-28 h-28 rounded-full border-4 border-card object-cover"
            />
            {currentUser.badge === "Elite" && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-background uppercase tracking-wider">
                {currentUser.reliability}% {currentUser.badge}
              </span>
            )}
          </div>
          <h2 className="font-display text-3xl text-foreground tracking-wide mt-4">
            {currentUser.name}
          </h2>
          <p className="text-[var(--on-surface-variant)] text-sm mt-1">
            {currentUser.role} · Level {currentUser.level} · {liveLocation || `${currentUser.zone || "Pune"}, ${currentUser.city || "Pune"}`}
          </p>
          {/* Show email */}
          {user?.email && (
            <p className="text-[var(--on-surface-variant)] text-xs mt-1 opacity-60">
              {user.email}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="bg-secondary/15 text-secondary text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Star className="w-3 h-3 fill-current" /> {currentUser.rating.toFixed(1)}
            </span>
            <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Shield className="w-3 h-3" /> {currentUser.reliability}%
            </span>
            <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
              <Zap className="w-3 h-3" /> Lv {currentUser.level}
            </span>
          </div>
        </div>

        {/* Location / Zone */}
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="text-foreground font-bold text-sm">Home Zone</p>
            {locSaved && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Check className="w-3 h-3" /> Updated
              </span>
            )}
          </div>

          {/* Current location row: text left, compact detect right */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium truncate">
                {currentUser.zone || "Unknown"}, {currentUser.city || "Pune"}
              </p>
              <p className="text-[10px] text-[var(--on-surface-variant)] opacity-60">
                {currentUser.zone === "Baner" ? "Hardcoded default — update below" : "Tap detect to update from GPS"}
              </p>
            </div>
            <button
              onClick={async () => {
                setLocating(true)
                setLocError(null)
                console.log("[Profile] Detect location clicked")
                try {
                  const loc = await resolveLocation()
                  console.log("[Profile] resolveLocation result:", loc)
                  const parts = loc.location.split(", ")
                  const zone = parts[0] || "Pune"
                  const city = parts[1] || "Pune"
                  console.log("[Profile] Updating profile zone=", zone, "city=", city)
                  await updateProfile({ zone, city })
                  console.log("[Profile] updateProfile success")
                  setLocSaved(true)
                  setTimeout(() => setLocSaved(false), 3000)
                } catch (err: any) {
                  console.error("[Profile] Detect location failed:", err?.message || err)
                  setLocError(err?.message || "Could not detect location")
                } finally {
                  setLocating(false)
                }
              }}
              disabled={locating}
              className="shrink-0 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-transform disabled:opacity-40 flex items-center gap-1"
            >
              {locating ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              Detect
            </button>
          </div>

          {/* Manual inputs: stacked vertically so they never overflow */}
          <div className="space-y-2">
            <input
              type="text"
              value={manualZone}
              onChange={(e) => { setManualZone(e.target.value); setLocError(null) }}
              placeholder="Zone (e.g. Wanwori)"
              className="w-full px-3 py-2.5 text-sm bg-background border border-[var(--surface-container-high)] rounded-xl focus:outline-none focus:border-primary placeholder:text-[var(--on-surface-variant)]/40"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCity}
                onChange={(e) => { setManualCity(e.target.value); setLocError(null) }}
                placeholder="City"
                className="flex-1 px-3 py-2.5 text-sm bg-background border border-[var(--surface-container-high)] rounded-xl focus:outline-none focus:border-primary placeholder:text-[var(--on-surface-variant)]/40"
              />
              <button
                onClick={async () => {
                  if (!manualZone.trim() || !manualCity.trim()) return
                  console.log("[Profile] Manual update zone=", manualZone, "city=", manualCity)
                  try {
                    await updateProfile({ zone: manualZone.trim(), city: manualCity.trim() })
                    console.log("[Profile] Manual updateProfile success")
                    setLocSaved(true)
                    setTimeout(() => setLocSaved(false), 3000)
                    setManualZone("")
                    setManualCity("")
                  } catch (err: any) {
                    console.error("[Profile] Manual update failed:", err?.message || err)
                    setLocError(err?.message || "Update failed")
                  }
                }}
                disabled={!manualZone.trim() || !manualCity.trim()}
                className="shrink-0 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
          {locError && (
            <p className="text-destructive text-xs mt-2">{locError}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-primary" />
            <p className="text-foreground font-bold text-sm">Phone Number</p>
            {phoneSaved && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-[var(--on-surface-variant)] text-xs mb-3">
            Required to create or join matches. Your number is only shared with match participants.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-background border border-[var(--surface-container-high)] rounded-xl overflow-hidden focus-within:border-primary transition-colors">
              <span className="px-3 py-3 text-sm text-[var(--on-surface-variant)] border-r border-[var(--surface-container-high)] bg-[var(--surface-container)] select-none">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  // Only allow digits, max 10
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  setPhone(digits)
                  setPhoneSaved(false)
                }}
                placeholder="99999 99999"
                maxLength={10}
                className="flex-1 px-3 py-3 text-sm bg-transparent focus:outline-none placeholder:text-[var(--on-surface-variant)]/40"
              />
            </div>
            <button
              onClick={async () => {
                if (phone.length !== 10) return
                await updateProfile({ phone: `+91${phone}` })
                setPhoneSaved(true)
                setTimeout(() => setPhoneSaved(false), 3000)
              }}
              disabled={phone.length !== 10}
              className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              Save
            </button>
          </div>
          {phone.length > 0 && phone.length !== 10 && (
            <p className="text-destructive text-xs mt-2">
              Enter a valid 10-digit number
            </p>
          )}
        </div>

        {/* Availability toggle */}
        <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-foreground font-bold text-sm">When are you free?</p>
            </div>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded",
                availability === "not_available"
                  ? "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]"
                  : "bg-primary/15 text-primary",
              )}
            >
              {availability === "not_available" ? "Hidden" : "Visible to hosts"}
            </span>
          </div>
          <p className="text-[var(--on-surface-variant)] text-xs mb-3">
            Players who set their availability appear in &quot;Available today&quot; and
            &quot;Available tomorrow&quot; lists for hosts looking to fill matches.
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setAvailability(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                  availability === opt.id
                    ? opt.id === "not_available"
                      ? "bg-destructive/20 border-destructive text-destructive"
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-[var(--surface-container-high)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Career Stats */}
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">
            Career Stats
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Stat label="Matches" value={currentUser.careerStats.matches.toString()} />
          <Stat label="Win Rate" value={`${currentUser.careerStats.winRatePct}%`} />
          <Stat
            label="Runs"
            value={currentUser.careerStats.runs.toLocaleString()}
            extra={
              currentUser.careerStats.runsTopPercentile
                ? `Top ${currentUser.careerStats.runsTopPercentile}%`
                : undefined
            }
          />
          <Stat
            label="Wickets"
            value={currentUser.careerStats.wickets.toString()}
            extra={
              currentUser.careerStats.economy ? `Econ: ${currentUser.careerStats.economy}` : undefined
            }
          />
        </div>

        {/* Recent Form */}
        {currentUser.recentForm.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">
                Recent Form
              </h3>
            </div>
            <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 mb-6">
              <div className="flex gap-2 mb-3">
                {currentUser.recentForm.map((r, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                      r.result === "W"
                        ? "bg-primary text-primary-foreground"
                        : r.result === "L"
                          ? "bg-destructive/20 text-destructive border border-destructive"
                          : "bg-secondary/15 text-secondary",
                    )}
                  >
                    {r.result}
                  </span>
                ))}
              </div>
              {currentUser.recentForm[0] && (
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Last:{" "}
                    {currentUser.recentForm[0].result === "W" ? "Won" : "Lost"}{" "}
                    {currentUser.recentForm[0].margin}
                  </p>
                  <p className="text-[var(--on-surface-variant)] text-xs">
                    vs. {currentUser.recentForm[0].vsTeam}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <>
            <h3 className="text-foreground font-bold text-sm uppercase tracking-wider mb-3">
              Recent Matches
            </h3>
            <div className="space-y-2">
              {recentMatches.map(m => (
                <button
                  key={m.id}
                  onClick={() => navigate("matchDetail", { matchId: m.id })}
                  className="w-full bg-card border border-[var(--surface-container-high)] rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                >
                  <img
                    src={m.ground.image || "/placeholder.svg"}
                    alt={m.ground.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-bold text-sm truncate">
                      {m.ground.name}
                    </p>
                    <p className="text-[var(--on-surface-variant)] text-xs">
                      {m.startsAt} · {m.date}
                    </p>
                  </div>
                  <span className="text-primary text-xs font-bold uppercase tracking-wider">
                    {m.date}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* No data state */}
        {recentMatches.length === 0 && currentUser.recentForm.length === 0 && (
          <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-6 text-center">
            <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-foreground font-bold mb-1">No matches yet</p>
            <p className="text-[var(--on-surface-variant)] text-sm">
              Join or create a match to start building your stats!
            </p>
          </div>
        )}
      </div>

      <TmBottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
      >
        <div className="space-y-1">
          <SettingsRow icon={CreditCard} label="Payment methods" />
          <PushNotificationToggle />
          <SettingsRow icon={HelpCircle} label="Help & support" />
          <SettingsRow
            icon={WifiOff}
            label="Test offline state"
            onClick={() => {
              setShowSettings(false)
              navigate("offline")
            }}
            subtle
          />
        </div>
        <div className="mt-8">
          <TmButton variant="danger" onClick={async () => { await signOut(); reset("auth") }}>
            <LogOut className="w-4 h-4" /> Log out
          </TmButton>
        </div>
      </TmBottomSheet>
    </div>
  )
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: string
}) {
  return (
    <div className="bg-card border border-[var(--surface-container-high)] p-4 rounded-2xl">
      <p className="text-[var(--on-surface-variant)] text-[10px] uppercase tracking-wider font-bold mb-1">
        {label}
      </p>
      <p className="font-display text-3xl text-foreground tracking-wide leading-none">
        {value}
      </p>
      {extra && <p className="text-primary text-[11px] font-bold mt-1.5">{extra}</p>}
    </div>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  onClick,
  subtle = false,
}: {
  icon: typeof Bell
  label: string
  onClick?: () => void
  subtle?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 text-foreground font-medium bg-[var(--surface-container)]/50 rounded-xl hover:bg-[var(--surface-container-high)] flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      <Icon className={`w-5 h-5 ${subtle ? "text-[var(--outline)]" : "text-primary"}`} />
      <span className={subtle ? "text-[var(--on-surface-variant)] text-sm" : ""}>
        {label}
      </span>
    </button>
  )
}

function PushNotificationToggle() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"enabled" | "disabled" | "unknown">("unknown")

  useEffect(() => {
    if (profile?.push_token) {
      setStatus("enabled")
    } else {
      setStatus("disabled")
    }
  }, [profile?.push_token])

  const enable = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const success = await retryPushTokenSync(user.id)
      if (success) {
        setStatus("enabled")
      } else {
        setStatus("disabled")
      }
    } catch (e) {
      console.error("Push enable failed:", e)
      setStatus("disabled")
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      await unregisterPushToken(user.id)
      setStatus("disabled")
    } catch (e) {
      console.error("Push disable failed:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full px-4 py-3 bg-[var(--surface-container)]/50 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className={`w-5 h-5 ${status === "enabled" ? "text-primary" : "text-[var(--outline)]"}`} />
        <div>
          <span className="text-foreground font-medium">Push Notifications</span>
          <p className="text-[10px] text-[var(--on-surface-variant)]">
            {status === "enabled" ? "Enabled — you'll receive match alerts" : "Disabled — enable to get match alerts"}
          </p>
        </div>
      </div>
      {status === "enabled" ? (
        <button
          onClick={disable}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-colors"
        >
          {loading ? "..." : "Disable"}
        </button>
      ) : (
        <button
          onClick={enable}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-colors"
        >
          {loading ? "..." : "Enable"}
        </button>
      )}
    </div>
  )
}
