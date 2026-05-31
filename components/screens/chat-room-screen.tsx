"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, Plus, Send, Check } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { CHAT_MESSAGES, MATCHES, ME } from "@/lib/turfmatch/data"
import { useMatch, useMe } from "@/lib/turfmatch/use-supabase"
import type { ChatMessage } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

export function ChatRoomScreen({ matchId }: { matchId?: string }) {
  const { navigate, goBack } = useNav()
  const { match: dbMatch } = useMatch(matchId)
  const { me: dbMe } = useMe()
  const match = dbMatch || MATCHES.find(m => m.id === matchId) || MATCHES[0]
  const currentUser = dbMe || ME
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES)
  const [draft, setDraft] = useState("")
  const [poll, setPoll] = useState<{ in: number; maybe: number; out: number }>({
    in: 8,
    maybe: 3,
    out: 1,
  })
  const [myVote, setMyVote] = useState<"in" | "maybe" | "out" | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight })
  }, [messages.length])

  const send = () => {
    if (!draft.trim()) return
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        text: draft.trim(),
        time: "now",
        isMine: true,
      },
    ])
    setDraft("")
  }

  const total = poll.in + poll.maybe + poll.out
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  const vote = (k: "in" | "maybe" | "out") => {
    if (myVote === k) return
    setPoll(prev => {
      const next = { ...prev }
      if (myVote) next[myVote] = Math.max(0, next[myVote] - 1)
      next[k] += 1
      return next
    })
    setMyVote(k)
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader
        title={match.title || match.ground.name}
        subtitle={`${match.filledSlots}/${match.totalSlots} confirmed`}
        onBack={goBack}
      />

      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex justify-between items-center text-sm gap-3">
        <span className="text-emerald-300 flex items-center gap-2 truncate">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{match.ground.name}</span>
        </span>
        <button
          onClick={() => navigate("matchDetail", { matchId: match.id })}
          className="bg-emerald-500 text-slate-950 px-3 py-1 rounded-full font-bold text-xs shrink-0"
        >
          View match
        </button>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center">
          <span className="bg-slate-900 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-800">
            Today
          </span>
        </div>

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn("flex gap-3", msg.isMine && "flex-row-reverse")}
          >
            {!msg.isMine && (
              <img
                src={msg.authorAvatar || "/placeholder.svg"}
                alt={msg.authorName}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
            )}
            <div
              className={cn(
                "border p-3 rounded-2xl max-w-[80%]",
                msg.isMine
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 rounded-tr-none"
                  : "bg-slate-900 text-white border-slate-800 rounded-tl-none",
              )}
            >
              {!msg.isMine && (
                <p className="text-emerald-400 text-xs font-bold mb-1">
                  {msg.authorName}
                </p>
              )}
              <p className="text-sm leading-snug">{msg.text}</p>
              <p
                className={cn(
                  "text-[10px] mt-1",
                  msg.isMine ? "text-slate-800" : "text-slate-500",
                )}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {/* Attendance poll */}
        <div className="flex gap-3 mt-4">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex-1">
            <p className="text-white font-bold mb-3">Attendance check</p>
            <div className="space-y-2">
              {([
                ["in", "I'm in", poll.in],
                ["maybe", "Maybe", poll.maybe],
                ["out", "Can't make it", poll.out],
              ] as const).map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => vote(k)}
                  className={cn(
                    "w-full py-2 px-4 rounded-xl text-sm font-medium flex justify-between items-center transition-colors",
                    myVote === k
                      ? "bg-emerald-500/20 border border-emerald-500 text-emerald-300"
                      : "bg-slate-800 text-slate-200 border border-transparent hover:border-slate-700",
                  )}
                >
                  <span>
                    {label} ({n})
                  </span>
                  <span className="text-xs font-bold">{pct(n)}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-end">
        <button
          aria-label="Add"
          className="p-3 text-slate-400 hover:text-white bg-slate-800 rounded-full shrink-0 active:scale-90 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
        <textarea
          rows={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Message..."
          className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3 focus:outline-none resize-none max-h-32"
        />
        <button
          aria-label="Send"
          onClick={send}
          disabled={!draft.trim()}
          className="p-3 bg-emerald-500 text-slate-950 rounded-full shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
