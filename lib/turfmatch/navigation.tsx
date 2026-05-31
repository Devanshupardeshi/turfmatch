"use client"

// Lightweight in-memory nav stack — no router. Phase 1 frontend only.
// Built so we can swap for React Navigation (Expo) or Next router later
// without touching screen components.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ScreenName =
  | "splash"
  | "onboarding"
  | "auth"
  | "home"
  | "notifications"
  | "players"
  | "groundsHub"
  | "groundDetail"
  | "turfMap"
  | "matchDetail"
  | "createMatch"
  | "scoreEntry"
  | "liveScorecard"
  | "manageRequests"
  | "tournaments"
  | "tournamentDetail"
  | "tournamentBracket"
  | "teamRegistration"
  | "chatInbox"
  | "chatRoom"
  | "profile"
  | "playerProfile"
  | "offline"
  | "locationDenied"
  | "liveNavigation"
  | "yourMatches"
  | "createdMatches"
  | "joinedMatches"
  | "pendingRequests"
  | "matchInvites"
  | "matchHistory"

// Tab routes always reset the back-stack.
// Repo's bottom nav: Home / Leagues / Create / Turfs (map) / Chat
export const TAB_SCREENS: ScreenName[] = [
  "home",
  "tournaments",
  "createMatch",
  "turfMap",
  "chatInbox",
]

export interface NavParams {
  // Loosely typed bag — each screen narrows on consumption.
  [key: string]: unknown
}

export interface NavEntry {
  screen: ScreenName
  params: NavParams
}

interface NavContextValue {
  current: NavEntry
  stack: NavEntry[]
  navigate: (screen: ScreenName, params?: NavParams) => void
  goBack: () => void
  reset: (screen: ScreenName, params?: NavParams) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function NavProvider({
  children,
  initial = { screen: "splash", params: {} },
}: {
  children: ReactNode
  initial?: NavEntry
}) {
  const [stack, setStack] = useState<NavEntry[]>([initial])

  const navigate = useCallback((screen: ScreenName, params: NavParams = {}) => {
    setStack(prev => {
      // Top-level tabs reset the stack so the back button doesn't leak across tabs.
      if (TAB_SCREENS.includes(screen)) {
        return [{ screen, params }]
      }
      return [...prev, { screen, params }]
    })
  }, [])

  const goBack = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const reset = useCallback((screen: ScreenName, params: NavParams = {}) => {
    setStack([{ screen, params }])
  }, [])

  const value = useMemo<NavContextValue>(
    () => ({ current: stack[stack.length - 1], stack, navigate, goBack, reset }),
    [stack, navigate, goBack, reset],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error("useNav must be used inside <NavProvider>")
  return ctx
}
