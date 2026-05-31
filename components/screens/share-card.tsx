"use client"

import { Trophy, X, QrCode } from "lucide-react"
import { TmButton } from "@/components/turfmatch/tm-button"
import type { Match } from "@/lib/turfmatch/types"

interface ShareCardProps {
  match: Match
  onClose: () => void
}

export function ShareCard({ match, onClose }: ShareCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2rem] border border-slate-800 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 p-2 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-6 mt-2">
          <Trophy className="w-6 h-6 text-emerald-500" />
          <span className="text-white font-bold tracking-widest uppercase text-sm">
            TurfMatch
          </span>
        </div>

        <h2 className="text-3xl font-extrabold text-white leading-tight mb-2">
          You&apos;re invited!
        </h2>
        <p className="text-emerald-400 font-bold mb-6">
          Match at {match.ground.name}
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{match.startsAt}</p>
            <p className="text-slate-400 text-sm">
              {match.totalSlots - match.filledSlots} slots left · ₹{match.pricePerPlayer}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <TmButton variant="primary">Share to WhatsApp</TmButton>
          <TmButton variant="secondary">Copy invite link</TmButton>
        </div>
      </div>
    </div>
  )
}
