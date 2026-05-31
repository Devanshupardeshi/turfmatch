"use client"

import { useState, useMemo } from "react"
import { Check } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmButton } from "@/components/turfmatch/tm-button"
import { PLAYERS, TOURNAMENTS } from "@/lib/turfmatch/data"
import { usePlayers, useTournaments } from "@/lib/turfmatch/use-supabase"
import { cn } from "@/lib/utils"

const MIN_SQUAD = 11

export function TeamRegistrationScreen({ tournamentId }: { tournamentId?: string }) {
  const { navigate, goBack } = useNav()
  
  const { players: dbPlayers } = usePlayers()
  const displayPlayers = dbPlayers && dbPlayers.length > 0 ? dbPlayers : PLAYERS

  const { tournaments: dbTournaments } = useTournaments()
  const displayTournaments = dbTournaments && dbTournaments.length > 0 ? dbTournaments : TOURNAMENTS

  const tournament = displayTournaments.find(t => t.id === tournamentId) ?? displayTournaments[0]
  const [name, setName] = useState("")
  const [squad, setSquad] = useState<Set<string>>(
    () => new Set(displayPlayers.slice(0, 5).map(p => p.id)), // Start with a few players if not enough "friends"
  )

  const toggle = (id: string) => {
    setSquad(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col relative">
      <TmHeader title="Register team" onBack={goBack} />
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 space-y-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 block">
            Team name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Pune Spartans"
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Add squad (min {MIN_SQUAD})
            </label>
            <span
              className={cn(
                "text-xs font-bold",
                squad.size >= MIN_SQUAD ? "text-emerald-400" : "text-slate-500",
              )}
            >
              {squad.size} selected
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 max-h-72 overflow-y-auto">
            {displayPlayers.map(p => {
              const selected = squad.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar || "/placeholder.svg"}
                      alt={p.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="text-white text-sm font-medium">{p.name}</span>
                  </div>
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selected
                        ? "bg-emerald-500 border-emerald-500 text-slate-950"
                        : "border-slate-600",
                    )}
                  >
                    {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
        <TmButton
          onClick={() => navigate("tournaments")}
          disabled={!name.trim() || squad.size < MIN_SQUAD}
        >
          Pay ₹{tournament.entryFee} & enter
        </TmButton>
      </div>
    </div>
  )
}
