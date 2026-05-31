"use client"

import { WifiOff } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"

export function OfflineScreen() {
  const { goBack } = useNav()
  return (
    <div className="h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mb-6 border-2 border-slate-800">
        <WifiOff className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-2">No internet connection</h2>
      <p className="text-slate-400 mb-8 max-w-[280px]">
        Please check your network settings and try again.
      </p>
      <TmButton variant="outline" fullWidth={false} className="px-8" onClick={goBack}>
        Try again
      </TmButton>
    </div>
  )
}
