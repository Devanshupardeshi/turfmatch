"use client"

import { useState, useRef } from "react"
import { ChevronLeft, User as UserIcon, Plus, Check, Mail, Lock, Eye, EyeOff, KeyRound, Phone } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"
import { cn } from "@/lib/utils"
import type { PlayerRole } from "@/lib/turfmatch/types"
import { useAuth } from "@/lib/auth-context"

// signin → email+password login
// signup → email+password entry
// otp    → verify 6-digit code (signup only)
// profile / role / availability → new user onboarding
type Step = "signin" | "signup" | "otp" | "profile" | "role" | "availability"

const ROLES: PlayerRole[] = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"]
const AVAILABILITY = [
  { id: "morning", label: "Mornings", desc: "5–9 AM" },
  { id: "evening", label: "Evenings", desc: "5–11 PM" },
  { id: "weekends", label: "Weekends only", desc: "Sat & Sun" },
]

export function AuthFlowScreen() {
  const { reset } = useNav()
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, verifyOtp, updateProfile } = useAuth()

  const [step, setStep] = useState<Step>("signin")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", "", "", ""])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<PlayerRole | null>(null)
  const [availability, setAvailability] = useState<string | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const goNext = (next: Step) => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep(next) }, 500)
  }

  const goBack = () => {
    setAuthError(null)
    if (step === "otp") setStep("signup")
    else if (step === "signup") setStep("signin")
    else if (step === "profile") setStep("signin")
    else if (step === "role") setStep("profile")
    else if (step === "availability") setStep("role")
  }

  // ── Sign In (existing users) ───────────────────────────────────────
  const handleSignIn = async () => {
    if (!email.trim() || password.length < 6) return
    setLoading(true)
    setAuthError(null)
    const { error } = await signInWithEmail(email.trim(), password)
    setLoading(false)
    if (error) { setAuthError(error); return }
    reset("home")
  }

  // ── Sign Up step 1: create account → sends OTP email ──────────────
  const handleSignUp = async () => {
    if (!email.trim() || password.length < 6) return
    setLoading(true)
    setAuthError(null)
    const { error } = await signUpWithEmail(email.trim(), password)
    setLoading(false)
    if (error) { setAuthError(error); return }
    // Supabase sends a confirmation email with {{ .Token }} OTP
    setStep("otp")
  }

  // ── Sign Up step 2: verify the 8-digit code ───────────────────────
  const handleVerifyOtp = async () => {
    const code = otpCode.join("")
    if (code.length < 8) return
    setLoading(true)
    setAuthError(null)
    const { error } = await verifyOtp(email.trim(), code)
    setLoading(false)
    if (error) { setAuthError(error); return }
    // Verified → profile setup
    setStep("profile")
  }

  // ── Google (kept, will fix later) ──────────────────────────────────
  const handleGoogleLogin = async () => {
    setAuthError("Google Sign-In is temporarily disabled. Please use Email/Password.")
  }

  // ── OTP input helpers ──────────────────────────────────────────────
  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return
    const c = [...otpCode]; c[i] = v.slice(-1); setOtpCode(c)
    if (v && i < 7) otpRefs.current[i + 1]?.focus()
  }
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  // ── Complete onboarding ────────────────────────────────────────────
  const completeAuth = async () => {
    setLoading(true)
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        role: role || "Batsman",
        availability: availability === "morning" ? "today"
          : availability === "evening" ? "today"
          : availability === "weekends" ? "this_weekend" : "today",
      })
    } catch { /* non-critical */ }
    setTimeout(() => reset("home"), 500)
  }

  const validEmail = /\S+@\S+\.\S+/.test(email)

  return (
    <div className="h-full bg-slate-950 flex flex-col px-6 pt-12 pb-8 relative">
      {/* Spinner overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/60 z-20 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Back button (not on signin) */}
      {step !== "signin" && (
        <button aria-label="Back" onClick={goBack}
          className="w-10 h-10 -ml-2 mb-4 text-slate-400 active:scale-90 transition-transform flex items-center">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div className="flex-1 flex flex-col">

        {/* ═══════════════ SIGN IN ═══════════════ */}
        {step === "signin" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-slate-400 mb-8">Sign in to continue playing.</p>

            {/* Google */}
            <button onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold rounded-2xl px-4 py-4 mb-4 hover:bg-slate-100 active:scale-[0.98] transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-500 text-xs font-medium uppercase">or</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Email */}
            <div className="relative mb-3">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500" />
            </div>

            {/* Password */}
            <div className="relative mb-4">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-emerald-500" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {authError && <p className="text-red-400 text-sm mb-4 text-center">{authError}</p>}

            <TmButton disabled={!validEmail || password.length < 6} onClick={handleSignIn}>
              Sign In
            </TmButton>

            <button onClick={() => { setAuthError(null); setStep("signup") }}
              className="text-slate-400 text-sm font-medium mx-auto block mt-6 hover:text-emerald-400 transition-colors">
              Don&apos;t have an account? <span className="text-emerald-400 font-bold">Sign Up</span>
            </button>

            <p className="text-xs text-slate-500 text-center mt-6">
              By continuing, you agree to our Terms &amp; Privacy Policy.
            </p>
          </div>
        )}

        {/* ═══════════════ SIGN UP ═══════════════ */}
        {step === "signup" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create account</h1>
            <p className="text-slate-400 mb-8">We&apos;ll send an 8-digit code to verify your email.</p>

            {/* Email */}
            <div className="relative mb-3">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" autoFocus
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500" />
            </div>

            {/* Password */}
            <div className="relative mb-4">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-emerald-500" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {authError && <p className="text-red-400 text-sm mb-4 text-center">{authError}</p>}

            <TmButton disabled={!validEmail || password.length < 6} onClick={handleSignUp}>
              <KeyRound className="w-4 h-4" /> Sign Up &amp; Send Code
            </TmButton>

            <button onClick={() => { setAuthError(null); setStep("signin") }}
              className="text-slate-400 text-sm font-medium mx-auto block mt-6 hover:text-emerald-400 transition-colors">
              Already have an account? <span className="text-emerald-400 font-bold">Sign In</span>
            </button>
          </div>
        )}

        {/* ═══════════════ OTP VERIFICATION (signup only) ═══════════════ */}
        {step === "otp" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Verify your email</h1>
            <p className="text-slate-400 mb-1">We sent an 8-digit code to</p>
            <p className="text-emerald-400 font-semibold mb-8">{email}</p>

            <div className="flex gap-1.5 sm:gap-2 justify-between mb-6">
              {otpCode.map((digit, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  className="flex-1 max-w-[3rem] h-12 sm:h-14 bg-slate-900 border border-slate-700 rounded-lg sm:rounded-xl text-center text-white text-xl sm:text-2xl font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus={i === 0} />
              ))}
            </div>

            {authError && <p className="text-red-400 text-sm mb-4 text-center">{authError}</p>}

            <TmButton disabled={otpCode.join("").length < 6} onClick={handleVerifyOtp}>
              Verify &amp; Continue
            </TmButton>

            <p className="text-slate-500 text-xs text-center mt-6">
              Check your spam folder if you don&apos;t see the email.
            </p>
          </div>
        )}

        {/* ═══════════════ PROFILE SETUP ═══════════════ */}
        {step === "profile" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Build your profile</h1>
            <p className="text-slate-400 mb-8">Let other players know who you are.</p>
            <div className="flex justify-center mb-8">
              <button className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 relative border-2 border-dashed border-slate-600">
                <UserIcon className="w-10 h-10" />
                <span className="absolute bottom-0 right-0 bg-emerald-500 p-1.5 rounded-full text-slate-950">
                  <Plus className="w-4 h-4" />
                </span>
              </button>
            </div>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-emerald-500 mb-3" />
            <div className="relative mb-8">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone number (required for matches)"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <TmButton disabled={!name.trim()} onClick={() => goNext("role")}>Continue</TmButton>
          </div>
        )}

        {/* ═══════════════ ROLE ═══════════════ */}
        {step === "role" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">What&apos;s your role?</h1>
            <p className="text-slate-400 mb-8">Pick your primary play style.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={cn("p-5 rounded-3xl border text-left transition-all",
                    role === r ? "bg-emerald-500/10 border-emerald-500 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-white hover:border-slate-700")}>
                  <p className="font-bold text-base">{r}</p>
                </button>
              ))}
            </div>
            <TmButton disabled={!role} onClick={() => goNext("availability")}>Continue</TmButton>
          </div>
        )}

        {/* ═══════════════ AVAILABILITY ═══════════════ */}
        {step === "availability" && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">When do you play?</h1>
            <p className="text-slate-400 mb-8">We&apos;ll surface matches that fit your schedule.</p>
            <div className="space-y-3 mb-8">
              {AVAILABILITY.map(a => (
                <button key={a.id} onClick={() => setAvailability(a.id)}
                  className={cn("w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                    availability === a.id ? "bg-emerald-500/10 border-emerald-500"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700")}>
                  <div className="text-left">
                    <p className="text-white font-bold">{a.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{a.desc}</p>
                  </div>
                  <span className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center",
                    availability === a.id ? "bg-emerald-500 border-emerald-500" : "border-slate-600")}>
                    {availability === a.id && <Check className="w-3.5 h-3.5 text-slate-950" strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
            <TmButton disabled={!availability} onClick={completeAuth}>Complete Setup</TmButton>
          </div>
        )}
      </div>
    </div>
  )
}
