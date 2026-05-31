"use client"

import { useEffect, useState } from "react"

/**
 * Tracks browser online/offline state.
 * Returns `true` when online, `false` when the device reports offline.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator === "undefined") return
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return online
}
