"use client"

import { Trophy, Users } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TOURNAMENTS } from "@/lib/turfmatch/data"
import { useTournaments } from "@/lib/turfmatch/use-supabase"
import { cn } from "@/lib/utils"

export function TournamentsScreen() {
  const { navigate } = useNav()
  const { tournaments: dbTournaments } = useTournaments()
  const tournaments = dbTournaments.length > 0 ? dbTournaments : TOURNAMENTS
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader title="City Leagues" subtitle="Pune · Open tournaments" />
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
        {tournaments.map(t => (
          <button
            key={t.id}
            onClick={() => navigate("tournamentDetail", { tournamentId: t.id })}
            className="w-full mb-6 relative rounded-3xl overflow-hidden border border-slate-800 active:scale-[0.98] transition-transform text-left"
          >
            <img
              src={t.image || "/placeholder.svg"}
              alt={t.name}
              className="w-full h-48 object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider",
                  t.status === "Registering" && "bg-red-500 text-white animate-pulse",
                  t.status === "Live" && "bg-emerald-500 text-slate-950",
                  t.status === "Completed" && "bg-slate-700 text-slate-300",
                )}
              >
                {t.status}
              </span>
              <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
                {t.name}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-slate-300 text-sm font-medium flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  {t.prize}
                </p>
                <p className="text-slate-300 text-sm font-medium flex items-center gap-1">
                  <Users className="w-4 h-4 text-emerald-500" />
                  {t.teamsRegistered}/{t.teamsTotal} teams
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
