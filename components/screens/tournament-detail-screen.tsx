"use client"

import { useState } from "react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmButton } from "@/components/turfmatch/tm-button"
import { TOURNAMENTS } from "@/lib/turfmatch/data"
import { useTournaments } from "@/lib/turfmatch/use-supabase"
import { cn } from "@/lib/utils"

type Tab = "overview" | "bracket"

export function TournamentDetailScreen({ tournamentId }: { tournamentId?: string }) {
  const { navigate, goBack } = useNav()
  const { tournaments: dbTournaments } = useTournaments()
  const tournaments = dbTournaments.length > 0 ? dbTournaments : TOURNAMENTS
  const t = tournaments.find(x => x.id === tournamentId) ?? tournaments[0]
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <div className="h-full bg-slate-950 flex flex-col relative">
      <TmHeader title={t.name} onBack={goBack} />

      <div className="flex gap-6 px-5 border-b border-slate-800">
        {(["overview", "bracket"] as Tab[]).map(id => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "py-3 text-sm font-bold border-b-2 transition-colors capitalize",
              tab === id
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300",
            )}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32">
        {tab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                Prize pool
              </p>
              <p className="text-3xl font-extrabold text-emerald-400">{t.prize}</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Field label="Dates" value={t.dates} />
                <Field
                  label="Teams"
                  value={`${t.teamsRegistered}/${t.teamsTotal}`}
                />
                <Field label="Entry fee" value={`₹${t.entryFee}`} />
                <Field label="Status" value={t.status} />
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">Rules</h3>
              <ul className="space-y-2">
                {t.rules.map(r => (
                  <li
                    key={r}
                    className="text-slate-400 text-sm pl-4 relative leading-relaxed"
                  >
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "bracket" && (
          <div className="py-2 animate-fade-in">
            <p className="text-xs text-slate-500 mb-4">
              Knockout bracket — auto-generated from registered teams.
            </p>
            <div className="flex justify-between items-stretch gap-3 h-72 overflow-x-auto hide-scrollbar">
              <BracketColumn
                title="Quarters"
                teams={["Titans", "Strikers", "Your Team", "Spartans"]}
                highlight="Your Team"
              />
              <Connector />
              <BracketColumn title="Semis" teams={["Semi 1", "Semi 2"]} muted />
              <Connector />
              <BracketColumn title="Finals" teams={["Finals"]} accent />
            </div>
            <button
              onClick={() =>
                navigate("tournamentBracket", { tournamentId: t.id })
              }
              className="mt-6 w-full py-3 rounded-2xl border border-emerald-500/40 text-emerald-400 text-sm font-bold hover:bg-emerald-500/10 active:scale-[0.98] transition-transform"
            >
              Open full bracket view →
            </button>
          </div>
        )}
      </div>

      {t.status === "Registering" && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
          <TmButton
            onClick={() => navigate("teamRegistration", { tournamentId: t.id })}
          >
            Register team (₹{t.entryFee})
          </TmButton>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">
        {label}
      </p>
      <p className="text-white font-medium">{value}</p>
    </div>
  )
}

function BracketColumn({
  title,
  teams,
  highlight,
  muted,
  accent,
}: {
  title: string
  teams: string[]
  highlight?: string
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex flex-col justify-around w-32 shrink-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 text-center">
        {title}
      </p>
      {teams.map(team => (
        <div
          key={team}
          className={cn(
            "p-2 rounded text-xs text-center font-bold border my-1",
            highlight === team
              ? "bg-slate-800 border-emerald-500 text-emerald-400"
              : muted
                ? "bg-slate-900 border-slate-800 border-dashed text-slate-500"
                : accent
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-white",
          )}
        >
          {team}
        </div>
      ))}
    </div>
  )
}

function Connector() {
  return (
    <div className="w-6 shrink-0 border-r-2 border-y-2 border-slate-800 my-12 rounded-r" />
  )
}
