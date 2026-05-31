"use client"

import { Bell, Trophy, UserPlus, Calendar, Info, Mail } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmHeader } from "@/components/turfmatch/tm-header"
import { NOTIFICATIONS } from "@/lib/turfmatch/data"
import { useNotifications } from "@/lib/turfmatch/use-supabase"
import type { AppNotification, NotificationKind } from "@/lib/turfmatch/types"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  match_join: UserPlus,
  match_reminder: Calendar,
  match_cancelled: Info,
  friend_request: UserPlus,
  tournament: Trophy,
  system: Bell,
  invite: Mail,
}

const KIND_COLOR: Record<NotificationKind, string> = {
  match_join: "text-emerald-400 bg-emerald-500/10",
  match_reminder: "text-orange-400 bg-orange-500/10",
  match_cancelled: "text-red-400 bg-red-500/10",
  friend_request: "text-sky-400 bg-sky-500/10",
  tournament: "text-yellow-400 bg-yellow-500/10",
  system: "text-slate-400 bg-slate-700/30",
  invite: "text-purple-400 bg-purple-500/10",
}

export function NotificationsScreen() {
  const { goBack, navigate } = useNav()
  const { notifications: dbNotifications, markRead } = useNotifications()
  const notifications = dbNotifications.length > 0 ? dbNotifications : NOTIFICATIONS

  const handleTap = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id)
    if (n.entityId && (n.kind === "invite" || n.kind === "match_join" || n.kind === "match_cancelled" || n.kind === "match_reminder")) {
      navigate("matchDetail", { matchId: n.entityId })
    }
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <TmHeader title="Notifications" onBack={goBack} />
      <div className="flex-1 overflow-y-auto pb-8">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <Bell className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-white font-bold">You&apos;re all caught up</p>
            <p className="text-slate-400 text-sm mt-1">
              Match invites and updates will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {notifications.map(n => (
              <li key={n.id}>
                <NotificationRow n={n} onTap={() => handleTap(n)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NotificationRow({ n, onTap }: { n: AppNotification; onTap: () => void }) {
  const Icon = KIND_ICON[n.kind]
  return (
    <button
      onClick={onTap}
      className={cn(
        "w-full flex items-start gap-4 px-5 py-4 text-left",
        "active:bg-slate-900 transition-colors",
        !n.read && "bg-slate-900/40",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
          KIND_COLOR[n.kind],
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-white font-semibold text-sm leading-snug">{n.title}</p>
          <span className="text-[11px] text-slate-500 shrink-0">{n.time}</span>
        </div>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">{n.body}</p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
      )}
    </button>
  )
}
