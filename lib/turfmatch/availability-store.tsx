"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { AvailabilityWindow } from "@/lib/turfmatch/types"
import { useAuth } from "@/lib/auth-context"

interface AvailabilityContextValue {
  availability: AvailabilityWindow
  setAvailability: (a: AvailabilityWindow) => void
  isAvailableNow: boolean
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null)

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useAuth()

  // Default: new users are available (today) until they opt out
  const [availability, setLocalAvailability] = useState<AvailabilityWindow>(
    (profile?.availability as AvailabilityWindow) || "today",
  )

  // Sync from DB profile when it loads/changes
  useEffect(() => {
    if (profile?.availability) {
      setLocalAvailability(profile.availability as AvailabilityWindow)
    }
  }, [profile?.availability])

  const setAvailability = useCallback(
    async (a: AvailabilityWindow) => {
      setLocalAvailability(a)
      // Persist to DB so it's shared across devices / sessions
      try {
        await updateProfile({ availability: a })
      } catch (err) {
        console.error("[AvailabilityStore] failed to persist:", err)
      }
    },
    [updateProfile],
  )

  const isAvailableNow =
    availability === "today" ||
    availability === "tomorrow" ||
    availability === "this_weekend"

  return (
    <AvailabilityContext.Provider
      value={{ availability, setAvailability, isAvailableNow }}
    >
      {children}
    </AvailabilityContext.Provider>
  )
}

export function useAvailability() {
  const ctx = useContext(AvailabilityContext)
  if (!ctx) throw new Error("useAvailability must be used inside AvailabilityProvider")
  return ctx
}
