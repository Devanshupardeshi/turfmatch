"use client"

import { MapPin } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"

export function LocationDeniedScreen() {
  const { goBack } = useNav()
  return (
    <div className="h-full bg-slate-950 px-6 py-8 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-5">
        <MapPin className="w-10 h-10 text-slate-500" />
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-2">Location required</h2>
      <p className="text-slate-400 mb-8 max-w-[280px] leading-relaxed">
        We need your location to show turfs and matches near you. You can also enter your
        city manually.
      </p>
      <TmButton onClick={goBack} fullWidth={false} className="px-8">
        Enable location
      </TmButton>
      <button
        onClick={goBack}
        className="mt-4 text-emerald-400 font-medium text-sm hover:text-emerald-300"
      >
        Enter city manually
      </button>
    </div>
  )
}
