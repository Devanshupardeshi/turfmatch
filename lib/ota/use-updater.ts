"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { App } from "@capacitor/app"
import { checkForUpdate, performUpdate, getCurrentVersion } from "./update-manager"
import { verifyBootHealth } from "./rollback-manager"
import type { UpdateCheckResult } from "./types"

export interface UpdaterState {
  updateAvailable: boolean
  updateInfo: UpdateCheckResult | null
  checking: boolean
  downloading: boolean
  error: string | null
}

function getDeviceId(): string {
  try {
    return localStorage.getItem('device_id') || generateDeviceId()
  } catch {
    return generateDeviceId()
  }
}

function generateDeviceId(): string {
  const id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  try { localStorage.setItem('device_id', id) } catch {}
  return id
}

function getPlatform(): string {
  try {
    const ua = navigator.userAgent.toLowerCase()
    if (/android/.test(ua)) return 'android'
    if (/iphone|ipad|ipod/.test(ua)) return 'ios'
    return 'web'
  } catch {
    return 'web'
  }
}

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({
    updateAvailable: false,
    updateInfo: null,
    checking: false,
    downloading: false,
    error: null,
  })
  const dismissedRef = useRef(false)
  const checkedRef = useRef(false)

  const check = useCallback(async () => {
    if (checkedRef.current) return
    checkedRef.current = true
    setState((s) => ({ ...s, checking: true, error: null }))

    try {
      const deviceId = getDeviceId()
      const platform = getPlatform()

      // Verify boot health before offering new update
      const healthy = await verifyBootHealth(deviceId, platform)
      if (!healthy) {
        setState({ updateAvailable: false, updateInfo: null, checking: false, downloading: false, error: null })
        return
      }

      const result = await checkForUpdate(deviceId, platform)
      if (result && !dismissedRef.current) {
        setState({
          updateAvailable: true,
          updateInfo: result,
          checking: false,
          downloading: false,
          error: null,
        })
      } else {
        setState({ updateAvailable: false, updateInfo: null, checking: false, downloading: false, error: null })
      }
    } catch (e: any) {
      setState({ updateAvailable: false, updateInfo: null, checking: false, downloading: false, error: e.message })
    }
  }, [])

  const install = useCallback(async () => {
    if (!state.updateInfo) return false
    setState((s) => ({ ...s, downloading: true, error: null }))

    try {
      const deviceId = getDeviceId()
      const platform = getPlatform()
      const ok = await performUpdate(deviceId, platform, state.updateInfo)
      if (ok) {
        setState({ updateAvailable: false, updateInfo: null, checking: false, downloading: false, error: null })
        return true
      }
      setState((s) => ({ ...s, downloading: false, error: "Install failed" }))
      return false
    } catch (e: any) {
      setState((s) => ({ ...s, downloading: false, error: e.message }))
      return false
    }
  }, [state.updateInfo])

  const dismiss = useCallback(() => {
    dismissedRef.current = true
    setState({ updateAvailable: false, updateInfo: null, checking: false, downloading: false, error: null })
  }, [])

  useEffect(() => {
    check()

    let remove: (() => void) | undefined
    let cancelled = false
    App.addListener("resume", () => {
      if (cancelled) return
      checkedRef.current = false
      dismissedRef.current = false
      check()
    }).then((h) => {
      if (cancelled) { h.remove(); return }
      remove = () => h.remove()
    })

    return () => {
      cancelled = true
      remove?.()
    }
  }, [check])

  return { ...state, check, install, dismiss, currentVersion: getCurrentVersion() }
}
