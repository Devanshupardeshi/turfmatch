"use client"

import { Plus, Users } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { CHAT_THREADS } from "@/lib/turfmatch/data"
import { useChatThreads } from "@/lib/turfmatch/use-supabase"

export function ChatInboxScreen() {
  const { navigate } = useNav()
  const { threads: dbThreads } = useChatThreads()
  const threads = dbThreads.length > 0 ? dbThreads : CHAT_THREADS
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader
        title="Messages"
        rightSlot={
          <button
            aria-label="New chat"
            className="p-2 -mr-2 rounded-full hover:bg-slate-800 text-slate-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto pb-28">
        {threads.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-white font-bold">No conversations yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Join or host a match to start chatting.
            </p>
          </div>
        ) : (
          threads.map(t => (
            <button
              key={t.id}
              onClick={() => navigate("chatRoom", { matchId: t.matchId })}
              className="w-full flex items-center gap-4 p-4 border-b border-slate-800/50 hover:bg-slate-900/40 active:bg-slate-900 transition-colors text-left"
            >
              <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 relative shrink-0">
                <Users className="w-6 h-6" />
                {t.isLive && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1 gap-3">
                  <h4 className="text-white font-bold truncate">{t.title}</h4>
                  <span className="text-xs text-emerald-400 font-bold shrink-0">
                    {t.lastMessageTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm truncate text-slate-300 font-medium flex-1">
                    {t.lastMessage}
                  </p>
                  {t.unread > 0 && (
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {t.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
