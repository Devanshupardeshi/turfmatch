"use client"

import { Trophy } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TOURNAMENTS } from "@/lib/turfmatch/data"
import { useTournaments } from "@/lib/turfmatch/use-supabase"
import type { BracketMatch, BracketTeam, TournamentFixture } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

export function TournamentBracketScreen({
  tournamentId,
}: {
  tournamentId?: string
}) {
  const { goBack } = useNav()
  const { tournaments: dbTournaments } = useTournaments()
  const tournaments = dbTournaments.length > 0 ? dbTournaments : TOURNAMENTS
  const t = tournaments.find(x => x.id === tournamentId) ?? tournaments[0]

  const qf = t.bracket.filter(b => b.round === "QF")
  const sf = t.bracket.filter(b => b.round === "SF")
  const f = t.bracket.filter(b => b.round === "F")

  const liveFixture = t.fixtures.find(fx => fx.isLive)
  const upcomingFixtures = t.fixtures.filter(fx => !fx.isLive)

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="Bracket"
        subtitle={t.name}
        onBack={goBack}
        rightSlot={
          <span className="bg-secondary/15 text-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            {t.prize}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-12">
        {/* Live fixture banner */}
        {liveFixture && (
          <div className="bg-gradient-to-r from-destructive/20 via-card to-card border border-destructive/40 rounded-3xl p-4 mb-5 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-destructive text-[10px] font-bold uppercase tracking-wider">
                {liveFixture.label} · LIVE NOW
              </span>
            </div>
            <FixtureRow fixture={liveFixture} />
          </div>
        )}

        {/* Upcoming fixtures */}
        {upcomingFixtures.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] font-bold mb-3">
              Upcoming
            </p>
            <div className="space-y-3">
              {upcomingFixtures.map(fx => (
                <div
                  key={fx.id}
                  className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-4"
                >
                  <p className="text-[var(--on-surface-variant)] text-[10px] uppercase tracking-wider font-bold mb-2">
                    {fx.label} · {fx.time}
                  </p>
                  <FixtureRow fixture={fx} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bracket — horizontal scroll, three rounds */}
        <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] font-bold mb-3">
          Knockout
        </p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4">
          <Round title="Quarters" matches={qf.length ? qf : QF_PLACEHOLDERS} />
          <Connector />
          <Round
            title="Semis"
            matches={sf.length ? sf : SF_PLACEHOLDERS}
            muted
          />
          <Connector />
          <Round title="Final" matches={f.length ? f : F_PLACEHOLDER} accent />
        </div>

        {!t.bracket.length && (
          <div className="mt-6 bg-card border border-dashed border-[var(--surface-container-high)] rounded-2xl p-5 text-center">
            <Trophy className="w-8 h-8 text-[var(--outline)] mx-auto mb-2" />
            <p className="text-foreground font-bold mb-1">
              Bracket locks at registration close
            </p>
            <p className="text-[var(--on-surface-variant)] text-sm">
              {t.teamsRegistered}/{t.teamsTotal} teams registered ·{" "}
              {t.registrationClosesIn ?? "TBD"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Round({
  title,
  matches,
  muted,
  accent,
}: {
  title: string
  matches: BracketMatch[]
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="shrink-0 w-44">
      <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] font-bold mb-2 text-center">
        {title}
      </p>
      <div className="flex flex-col gap-3">
        {matches.map(m => (
          <BracketCard key={m.id} match={m} muted={muted} accent={accent} />
        ))}
      </div>
    </div>
  )
}

function BracketCard({
  match,
  muted,
  accent,
}: {
  match: BracketMatch
  muted?: boolean
  accent?: boolean
}) {
  const winnerA = match.winnerId === match.teamA.id
  const winnerB = match.winnerId === match.teamB.id
  return (
    <div
      className={cn(
        "rounded-xl border p-2 text-xs space-y-1",
        match.isLive
          ? "bg-destructive/10 border-destructive/40"
          : match.isPending
            ? "bg-[var(--surface-low)] border-dashed border-[var(--surface-container-high)]"
            : accent
              ? "bg-secondary/10 border-secondary/30"
              : muted
                ? "bg-[var(--surface-low)] border-[var(--surface-container-high)]"
                : "bg-card border-[var(--surface-container-high)]",
      )}
    >
      <TeamRow team={match.teamA} isWinner={winnerA} pending={match.isPending} />
      <TeamRow team={match.teamB} isWinner={winnerB} pending={match.isPending} />
      {match.isLive && (
        <p className="text-destructive text-[9px] font-bold uppercase tracking-wider text-center pt-0.5">
          ● Live
        </p>
      )}
    </div>
  )
}

function TeamRow({
  team,
  isWinner,
  pending,
}: {
  team: BracketTeam
  isWinner: boolean
  pending?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center text-[var(--background)] shrink-0"
          style={{ background: team.logoColor }}
        >
          {team.shortCode}
        </span>
        <span
          className={cn(
            "text-[11px] truncate",
            isWinner ? "text-foreground font-bold" : "text-[var(--on-surface-variant)]",
          )}
        >
          {team.name}
        </span>
      </div>
      <span
        className={cn(
          "text-[11px] font-bold tabular-nums shrink-0",
          isWinner ? "text-primary" : "text-[var(--on-surface-variant)]",
        )}
      >
        {team.score ?? "-"}
      </span>
    </div>
  )
}

function Connector() {
  return (
    <div className="shrink-0 w-3 my-12 border-r border-y border-[var(--surface-container-high)] rounded-r-md" />
  )
}

function FixtureRow({ fixture }: { fixture: TournamentFixture }) {
  return (
    <div className="space-y-1.5">
      <FixtureTeam
        team={fixture.teamA}
        state={fixture.teamA.state}
        score={fixture.teamA.score}
      />
      <FixtureTeam
        team={fixture.teamB}
        state={fixture.teamB.state}
        score={fixture.teamB.score}
      />
      {fixture.oversInfo && (
        <p className="text-[var(--on-surface-variant)] text-[10px] uppercase tracking-wider font-bold pt-1">
          {fixture.oversInfo}
        </p>
      )}
    </div>
  )
}

function FixtureTeam({
  team,
  state,
  score,
}: {
  team: BracketTeam
  state?: string
  score?: number | "-"
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center text-[var(--background)] shrink-0"
          style={{ background: team.logoColor }}
        >
          {team.shortCode}
        </span>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-bold truncate">
            {team.name}
          </p>
          {state && (
            <p className="text-[var(--on-surface-variant)] text-[11px]">
              {state}
            </p>
          )}
        </div>
      </div>
      {score !== undefined && score !== "-" && (
        <p className="font-display text-xl text-foreground tracking-wide leading-none shrink-0">
          {score}
        </p>
      )}
    </div>
  )
}

// Placeholders if a tournament hasn't drawn yet — keeps shape consistent.
const PH_TEAM = (id: string): BracketTeam => ({
  id,
  name: "TBD",
  shortCode: "?",
  logoColor: "#3c4a42",
})
const QF_PLACEHOLDERS: BracketMatch[] = Array.from({ length: 4 }).map((_, i) => ({
  id: `ph-qf-${i}`,
  round: "QF",
  teamA: PH_TEAM(`a${i}`),
  teamB: PH_TEAM(`b${i}`),
  isPending: true,
}))
const SF_PLACEHOLDERS: BracketMatch[] = Array.from({ length: 2 }).map((_, i) => ({
  id: `ph-sf-${i}`,
  round: "SF",
  teamA: PH_TEAM(`sa${i}`),
  teamB: PH_TEAM(`sb${i}`),
  isPending: true,
}))
const F_PLACEHOLDER: BracketMatch[] = [
  {
    id: "ph-f",
    round: "F",
    teamA: PH_TEAM("fa"),
    teamB: PH_TEAM("fb"),
    isPending: true,
  },
]
