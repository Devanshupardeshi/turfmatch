"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { MATCHES } from "@/lib/turfmatch/data"
import { useMatch } from "@/lib/turfmatch/use-supabase"
import { cn } from "@/lib/utils"

const RUN_OPTIONS = [0, 1, 2, 3, 4, 6]

export function ScoreEntryScreen({ matchId }: { matchId?: string }) {
  const { goBack } = useNav()
  
  const { match: dbMatch } = useMatch(matchId ?? "")
  const match = dbMatch ?? MATCHES.find(m => m.id === matchId) ?? MATCHES[0]
  const score = match.score ?? { teamA: 0, wicketsA: 0, oversA: 0, teamB: 0 }

  const [striker, setStriker] = useState({ name: "Rahul S.", runs: 42, balls: 28 })
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  const addRun = (r: number) => {
    setStriker(s => ({ ...s, runs: s.runs + r, balls: s.balls + 1 }))
    setLastEvent(`+${r} run${r === 1 ? "" : "s"}`)
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader
        title="Update Score"
        subtitle={`${score.teamA}/${score.wicketsA} (${score.oversA} Ov)`}
        onBack={goBack}
        rightSlot={
          <button
            aria-label="Save score"
            onClick={goBack}
            className="p-2 -mr-2 rounded-full hover:bg-slate-800 text-emerald-400"
          >
            <Check className="w-6 h-6" />
          </button>
        }
      />

      <div className="flex-1 px-5 py-6 flex flex-col">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
            Current striker
          </p>
          <h2 className="text-3xl font-extrabold text-white">
            {striker.name}{" "}
            <span className="text-emerald-400 text-xl">
              {striker.runs}*
            </span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {striker.balls} balls · SR{" "}
            {striker.balls === 0
              ? "-"
              : ((striker.runs / striker.balls) * 100).toFixed(0)}
          </p>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <span className="text-slate-400">Non-striker: Aman (12)</span>
            <span className="text-slate-400">Bowler: Vikram</span>
          </div>
          {lastEvent && (
            <p className="mt-3 text-xs text-emerald-400 font-bold">
              Last ball: {lastEvent}
            </p>
          )}
        </div>

        <h3 className="text-white font-bold mb-3">Add runs (this ball)</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {RUN_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => addRun(r)}
              className={cn(
                "h-16 rounded-2xl text-2xl font-bold transition-colors active:scale-95",
                "bg-slate-800 border border-slate-700 text-white",
                "hover:bg-emerald-500 hover:text-slate-950",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setLastEvent("OUT")}
            className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl py-4 font-bold active:bg-red-500 active:text-white transition-colors"
          >
            OUT
          </button>
          <button
            onClick={() => setLastEvent("WIDE")}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl py-4 font-bold"
          >
            WIDE
          </button>
          <button
            onClick={() => setLastEvent("NO BALL")}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl py-4 font-bold"
          >
            NO BALL
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Ball-by-ball updates auto-sync to all players in the match chat.
        </p>
      </div>
    </div>
  )
}
