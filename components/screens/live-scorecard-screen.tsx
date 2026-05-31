"use client"

import { useState } from "react"
import { Activity, Edit3, Share2 } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { TmButton } from "@/components/turfmatch/tm-button"
import { LIVE_SCORECARD, MATCHES } from "@/lib/turfmatch/data"
import { useMatch, useMe } from "@/lib/turfmatch/use-supabase"
import type { BallEvent } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const BALL_COLOR: Record<BallEvent["label"], string> = {
  "0": "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]",
  "1": "bg-[var(--surface-container-high)] text-foreground",
  "2": "bg-[var(--surface-container-high)] text-foreground",
  "3": "bg-[var(--surface-container-high)] text-foreground",
  "4": "bg-secondary text-secondary-foreground",
  "6": "bg-primary text-primary-foreground",
  W: "bg-destructive text-destructive-foreground",
  Wd: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] italic",
  Nb: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] italic",
  B: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] italic",
  Lb: "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] italic",
}

export function LiveScorecardScreen({ matchId }: { matchId?: string }) {
  const { goBack, navigate } = useNav()
  const card = LIVE_SCORECARD
  
  const { match: dbMatch } = useMatch(matchId ?? card.matchId)
  const { me } = useMe()
  
  const match = dbMatch ?? MATCHES.find(m => m.id === (matchId ?? card.matchId)) ?? MATCHES[0]
  const isHost = me ? match.organizer.id === me.id : false
  const [tab, setTab] = useState<"summary" | "batting" | "bowling">("summary")

  const overOf = (n: number, d: number) =>
    d === 0 ? "0.00" : (n / d).toFixed(2)

  return (
    <div className="h-full bg-background flex flex-col">
      <TmHeader
        title="Live Scorecard"
        subtitle={card.teamABBattingLabel}
        onBack={goBack}
        rightSlot={
          <button
            aria-label="Share"
            className="p-2 -mr-2 rounded-full hover:bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]"
          >
            <Share2 className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {/* Hero score */}
        <div className="bg-gradient-to-br from-primary/15 via-card to-card border border-primary/30 rounded-3xl p-5 mb-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-destructive text-[10px] font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
            {card.overLabel} · Innings {card.innings}
          </p>
          <p className="font-display text-5xl text-foreground tracking-tight leading-none">
            {card.totalRuns}
            <span className="text-2xl text-[var(--on-surface-variant)]">
              /{card.totalWickets}
            </span>
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <Stat label="CRR" value={card.currentRunRate.toFixed(2)} />
            <Stat label="Proj" value={card.projected.toString()} />
            {card.target && <Stat label="Target" value={card.target.toString()} />}
          </div>
        </div>

        {/* This over */}
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] font-bold mb-2">
            This over
          </p>
          <div className="flex gap-2 flex-wrap">
            {card.recentBalls.map(b => (
              <span
                key={b.id}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                  BALL_COLOR[b.label],
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-[var(--surface-container-high)] rounded-full p-1 mb-4">
          {(
            [
              ["summary", "Summary"],
              ["batting", "Batting"],
              ["bowling", "Bowling"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-colors",
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-[var(--on-surface-variant)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <div className="space-y-3 animate-fade-in">
            <Row
              title={`${card.striker.name}${card.striker.isStriker ? " *" : ""}`}
              subtitle={`${card.striker.balls} balls · 4s ${card.striker.fours} · 6s ${card.striker.sixes}`}
              value={`${card.striker.runs}`}
              hint={`SR ${overOf(card.striker.runs * 100, card.striker.balls)}`}
            />
            <Row
              title={card.nonStriker.name}
              subtitle={`${card.nonStriker.balls} balls · 4s ${card.nonStriker.fours} · 6s ${card.nonStriker.sixes}`}
              value={`${card.nonStriker.runs}`}
              hint={`SR ${overOf(card.nonStriker.runs * 100, card.nonStriker.balls)}`}
            />
            <Row
              title={card.bowler.name}
              subtitle={`${card.bowler.overs} ov · ${card.bowler.maidens}m · ${card.bowler.runs}r`}
              value={`${card.bowler.wickets}`}
              hint={`Econ ${card.bowler.economy.toFixed(2)}`}
            />
          </div>
        )}

        {tab === "batting" && (
          <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl divide-y divide-[var(--surface-container-high)] animate-fade-in">
            <BattingRow batter={card.striker} />
            <BattingRow batter={card.nonStriker} />
          </div>
        )}

        {tab === "bowling" && (
          <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 animate-fade-in">
            <p className="text-foreground font-bold mb-1">{card.bowler.name}</p>
            <div className="grid grid-cols-4 gap-2 text-center mt-3">
              <Cell label="Overs" value={card.bowler.overs} />
              <Cell label="Maidens" value={card.bowler.maidens.toString()} />
              <Cell label="Runs" value={card.bowler.runs.toString()} />
              <Cell label="Wickets" value={card.bowler.wickets.toString()} />
            </div>
            <p className="text-[var(--on-surface-variant)] text-xs mt-3">
              Economy {card.bowler.economy.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {isHost && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-md border-t border-[var(--surface-container-high)] flex gap-2">
          <TmButton
            onClick={() => navigate("scoreEntry", { matchId: match.id })}
            className="flex-1"
          >
            <Activity className="w-4 h-4" />
            Update score
          </TmButton>
          <TmButton variant="secondary" fullWidth={false} className="px-5">
            <Edit3 className="w-4 h-4" />
          </TmButton>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[var(--on-surface-variant)] font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-foreground font-bold">{value}</span>
    </span>
  )
}

function Row({
  title,
  subtitle,
  value,
  hint,
}: {
  title: string
  subtitle: string
  value: string
  hint: string
}) {
  return (
    <div className="bg-card border border-[var(--surface-container-high)] rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-foreground font-bold truncate">{title}</p>
        <p className="text-[var(--on-surface-variant)] text-xs truncate">
          {subtitle}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-2xl text-foreground tracking-wide leading-none">
          {value}
        </p>
        <p className="text-primary text-[11px] font-bold mt-0.5">{hint}</p>
      </div>
    </div>
  )
}

function BattingRow({
  batter,
}: {
  batter: { name: string; isStriker: boolean; runs: number; balls: number; fours: number; sixes: number }
}) {
  return (
    <div className="p-3 flex items-center justify-between">
      <div>
        <p className="text-foreground font-bold text-sm">
          {batter.name}
          {batter.isStriker && <span className="text-primary"> *</span>}
        </p>
        <p className="text-[var(--on-surface-variant)] text-[11px]">
          4s {batter.fours} · 6s {batter.sixes}
        </p>
      </div>
      <div className="text-right">
        <p className="text-foreground font-bold">
          {batter.runs}
          <span className="text-[var(--on-surface-variant)] text-xs">
            ({batter.balls})
          </span>
        </p>
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--on-surface-variant)] text-[10px] uppercase tracking-wider font-bold">
        {label}
      </p>
      <p className="text-foreground font-bold mt-0.5">{value}</p>
    </div>
  )
}
