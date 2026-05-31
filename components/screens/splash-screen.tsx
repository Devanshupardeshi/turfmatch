"use client"

import { useEffect } from "react"
import { Trophy } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { useAuth } from "@/lib/auth-context"

export function SplashScreen() {
  const { reset } = useNav()
  const { user, loading, isReady } = useAuth()

  useEffect(() => {
    console.log("[SplashScreen] isReady:", isReady, "loading:", loading, "user:", !!user)
    if (!isReady) return // Wait for auth to fully resolve

    const t = setTimeout(() => {
      console.log("[SplashScreen] navigating to", user ? "home" : "onboarding")
      if (user) {
        // User is already logged in → skip to home
        reset("home")
      } else {
        // No session → show onboarding
        reset("onboarding")
      }
    }, 300)
    return () => clearTimeout(t)
  }, [reset, user, loading, isReady])

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 px-6">
      <div className="w-24 h-24 bg-emerald-500 rounded-3xl rotate-12 flex items-center justify-center animate-pulse-glow">
        <Trophy className="w-12 h-12 text-slate-950 -rotate-12" strokeWidth={2.5} />
      </div>
      <h1 className="text-4xl font-extrabold text-white mt-8 tracking-tighter">
        Turf<span className="text-emerald-400">Match</span>
      </h1>
      <p className="text-slate-500 mt-3 text-sm font-mono tracking-wider uppercase">
        Find · Build · Play
      </p>
    </div>
  )
}
