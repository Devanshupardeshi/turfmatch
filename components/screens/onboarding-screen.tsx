"use client"

import { useState } from "react"
import { MapPin, Users, Trophy } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"
import { requestNotificationPermission } from "@/lib/notifications/permission"
import { cn } from "@/lib/utils"

interface Slide {
  Icon: typeof MapPin
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    Icon: MapPin,
    title: "Cricket near you, in 60 seconds",
    body: "Discover matches and players around your area — no more WhatsApp groups.",
  },
  {
    Icon: Users,
    title: "Build your squad",
    body: "Join open matches as a guest, or invite your regulars to play every weekend.",
  },
  {
    Icon: Trophy,
    title: "Run real tournaments",
    body: "Brackets, live scorecards, payments and certificates — all in one place.",
  },
]

export function OnboardingScreen() {
  const { reset } = useNav()
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const Icon = slide.Icon
  const isLast = step === SLIDES.length - 1

  return (
    <div className="h-full bg-slate-950 flex flex-col px-6 pt-16 pb-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-8 bg-emerald-500" : "w-1.5 bg-slate-700",
              )}
            />
          ))}
        </div>
        <button
          onClick={() => reset("auth")}
          className="text-slate-400 text-sm font-medium hover:text-white"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-28 h-28 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8">
          <Icon className="w-14 h-14 text-emerald-400" strokeWidth={1.8} />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight text-balance">
          {slide.title}
        </h2>
        <p className="text-slate-400 text-base max-w-xs leading-relaxed">{slide.body}</p>
      </div>

      <TmButton
        onClick={async () => {
          if (isLast) {
            // Ask for notification permission after onboarding completes
            await requestNotificationPermission("onboarding")
            reset("auth")
          } else {
            setStep(s => s + 1)
          }
        }}
      >
        {isLast ? "Get Started" : "Next"}
      </TmButton>
    </div>
  )
}
