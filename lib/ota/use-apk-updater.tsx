"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { App } from "@capacitor/app"
import type { PluginListenerHandle } from "@capacitor/core"
import {
  ApkUpdater,
  isApkUpdaterAvailable,
  type ApkProgressEvent,
  type ApkCurrentVersion,
} from "./apk-updater"
import {
  fetchApkManifest,
  getDeviceId,
  type ApkManifest,
  type ManifestResponse,
} from "./apk-manifest"
import { startAttempt, updateAttempt } from "./apk-analytics"

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "preparing"
  | "downloading"
  | "verifying"
  | "ready_to_install"
  | "installing"
  | "installed"
  | "error"
  | "blocked_permission"

export interface UpdaterContextValue {
  phase: UpdaterPhase
  manifest: ApkManifest | null
  current: ApkCurrentVersion | null
  progress: ApkProgressEvent | null
  error: string | null
  isMandatory: boolean
  hasNativeBridge: boolean
  startDownload: () => Promise<void>
  cancel: () => Promise<void>
  install: () => Promise<void>
  dismiss: () => void
  forceCheck: () => Promise<void>
  openPermissionSettings: () => Promise<void>
}

const Ctx = createContext<UpdaterContextValue | null>(null)

const POLL_INTERVAL_MS = 30 * 60 * 1000 // 30 min while foreground
const DISMISS_KEY = "ota_dismissed_versionId"

export function ApkUpdaterProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<UpdaterPhase>("idle")
  const [manifest, setManifest] = useState<ApkManifest | null>(null)
  const [current, setCurrent] = useState<ApkCurrentVersion | null>(null)
  const [progress, setProgress] = useState<ApkProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const progressListener = useRef<PluginListenerHandle | null>(null)
  const resumeListener = useRef<PluginListenerHandle | null>(null)
  const pollTimer = useRef<number | null>(null)
  const checkingRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // Load current version once
  useEffect(() => {
    ApkUpdater.getCurrentVersion().then(setCurrent).catch((e) => {
      console.warn("[OTA] getCurrentVersion failed", e)
    })
  }, [])

  // Subscribe to native progress events
  useEffect(() => {
    let cancelled = false
    ApkUpdater.addListener("progress", (e) => {
      setProgress(e)
      if (e.percent >= 99.9) {
        // The native plugin emits a final 100% just before SHA verification.
        setPhase((p) => (p === "downloading" ? "verifying" : p))
      }
    })
      .then((h) => {
        if (cancelled) { h.remove(); return }
        progressListener.current = h
      })
      .catch((err) => console.warn("[OTA] addListener failed", err))

    return () => {
      cancelled = true
      progressListener.current?.remove()
    }
  }, [])

  const runCheck = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    try {
      setPhase((p) => (p === "idle" ? "checking" : p))
      const deviceId = getDeviceId()
      const result: ManifestResponse = await fetchApkManifest(deviceId)
      
      // Force a probe of the native bridge to resolve its actual availability
      await ApkUpdater.getCurrentVersion()
      
      if (!isApkUpdaterAvailable()) {
        console.log("[OTA] Native bridge unavailable, skipping update prompt.")
        setManifest(null)
        setPhase("idle")
        return
      }

      if (!result.updateAvailable) {
        console.log("[OTA] No update available. Reason:", (result as any).reason || "up_to_date_or_no_active_version")
        // NEVER interrupt an active download/install flow with a background poll result.
        const busy = ["preparing","downloading","verifying","ready_to_install","installing","blocked_permission"].includes(phaseRef.current)
        if (busy) {
          console.log("[OTA] Background poll returned no-update, but active flow in progress. Ignoring.")
          return
        }
        setManifest(null)
        setError(null)
        setPhase("idle")
        // Cached APK is stale once the server stops offering an update.
        ApkUpdater.deleteCachedApk().catch(() => {})
        try { localStorage.removeItem(DISMISS_KEY) } catch {}
        return
      }
      // Respect dismissal for non-mandatory updates only.
      const dismissed = (() => {
        try { return localStorage.getItem(DISMISS_KEY) } catch { return null }
      })()
      if (!result.mandatory && dismissed === result.versionId) {
        setManifest(result)
        setPhase("idle")
        return
      }
      setManifest(result)
      setError(null)
      setPhase("available")
      // Restart any partially-downloaded file automatically if the user already
      // okayed the download once (e.g. app was killed mid-download).
      const cached = await ApkUpdater.getCachedApkInfo().catch(() => null)
      if (cached?.exists && cached.size > 0 && cached.size < result.apkSizeBytes) {
        // Re-enter download phase to keep progressing.
        await startDownloadInternal(result)
      }
    } catch (e: any) {
      console.warn("[OTA] check error", e)
      setError(e?.message || "Update check failed")
      setPhase("error")
    } finally {
      checkingRef.current = false
    }
  }, [])

  // Initial check + foreground resume + polling
  useEffect(() => {
    if (!isApkUpdaterAvailable()) {
      // Still run the manifest check for diagnostics on web
      runCheck()
      return
    }

    runCheck()

    let cancelled = false
    App.addListener("appStateChange", (s: any) => {
      if (s.isActive && !cancelled) runCheck()
    })
      .then((h) => {
        if (cancelled) { h.remove(); return }
        resumeListener.current = h
      })
      .catch(() => {})

    pollTimer.current = window.setInterval(() => {
      if (!checkingRef.current) runCheck()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      resumeListener.current?.remove()
      if (pollTimer.current) window.clearInterval(pollTimer.current)
    }
  }, [runCheck])

  async function startDownloadInternal(m: ApkManifest) {
    console.log("[OTA] startDownloadInternal called", { version: m.version, versionCode: m.versionCode, url: m.apkUrl?.slice(0, 60) })
    try {
      if (!isApkUpdaterAvailable()) {
        console.warn("[OTA] startDownloadInternal aborted: native bridge missing.")
        setPhase("idle")
        return
      }
      setError(null)
      setPhase("preparing")
      console.log("[OTA] Phase: preparing")

      // Sanity: free space check
      console.log("[OTA] Checking free space...")
      const free = await ApkUpdater.getFreeSpace().catch((e) => { console.warn("[OTA] getFreeSpace failed", e); return null })
      console.log("[OTA] Free space result:", free)
      if (free && free.bytesAvailable < m.apkSizeBytes * 1.5) {
        setError(
          `Not enough free space. Need ~${(m.apkSizeBytes / 1024 / 1024).toFixed(1)} MB; have ${(free.bytesAvailable / 1024 / 1024).toFixed(1)} MB. Free up storage and try again.`,
        )
        setPhase("error")
        return
      }

      // Network check
      console.log("[OTA] Checking network state...")
      const net = await ApkUpdater.getNetworkState().catch((e) => { console.warn("[OTA] getNetworkState failed", e); return null })
      console.log("[OTA] Network state result:", net)
      if (net && !net.connected) {
        setError("You're offline. Connect to Wi-Fi or mobile data and retry.")
        setPhase("error")
        return
      }

      const deviceId = getDeviceId()
      console.log("[OTA] Recording startAttempt...")
      await startAttempt({
        deviceId,
        versionId: m.versionId,
        targetVersion: m.version,
        targetVersionCode: m.versionCode,
        bytesTotal: m.apkSizeBytes,
        networkType: net?.type,
        androidSdk: current?.sdk ?? null,
        appVersionBefore: current?.versionName,
      })
      console.log("[OTA] Recording updateAttempt downloading...")
      await updateAttempt("downloading", { bytesTotal: m.apkSizeBytes })

      console.log("[OTA] Phase: downloading")
      setPhase("downloading")
      console.log("[OTA] Calling ApkUpdater.download...")
      const result = await ApkUpdater.download({
        url: m.apkUrl,
        sha256: m.apkSha256,
        sizeBytes: m.apkSizeBytes,
        version: m.version,
      })
      console.log("[OTA] Download succeeded:", result)
      await updateAttempt("downloaded", {
        bytesDownloaded: result.sizeBytes,
        bytesTotal: result.sizeBytes,
      })
      setPhase("ready_to_install")
      console.log("[OTA] Phase: ready_to_install")
    } catch (e: any) {
      console.error("[OTA] startDownloadInternal uncaught error:", e)
      const msg = e?.message || "Download failed"
      if (msg.toLowerCase().includes("cancel")) {
        await updateAttempt("cancelled", { errorMessage: msg })
        setPhase("available")
        return
      }
      await updateAttempt("failed", { errorMessage: msg })
      setError(msg)
      setPhase("error")
    }
  }

  const startDownload = useCallback(async () => {
    if (!manifest) return
    await startDownloadInternal(manifest)
  }, [manifest])

  const cancel = useCallback(async () => {
    await ApkUpdater.cancel().catch(() => {})
    await updateAttempt("cancelled")
    setPhase("available")
  }, [])

  const install = useCallback(async () => {
    if (!manifest) return
    if (!isApkUpdaterAvailable()) {
      console.warn("[OTA] install aborted: native bridge missing.")
      setPhase("idle")
      return
    }
    setPhase("installing")
    setError(null)
    await updateAttempt("installing")
    try {
      // Pre-check permission so we show a clear message instead of a crash.
      const perm = await ApkUpdater.canRequestInstallPackages().catch(() => ({ allowed: true }))
      if (!perm.allowed) {
        setPhase("blocked_permission")
        return
      }
      await ApkUpdater.install({})
      // We can't reliably know when the user finishes the system installer.
      // Mark as installed optimistically. The next launch's getCurrentVersion()
      // will confirm.
      setPhase("installed")
      await updateAttempt("installed")
    } catch (e: any) {
      console.error("[OTA] install error", e)
      const msg = e?.message || "Install failed"
      if (msg.includes("INSTALL_PACKAGES_NOT_ALLOWED")) {
        setPhase("blocked_permission")
        return
      }
      setError(msg)
      setPhase("error")
      await updateAttempt("failed", { errorMessage: msg })
    }
  }, [manifest])

  const dismiss = useCallback(() => {
    if (!manifest || manifest.mandatory) return
    try { localStorage.setItem(DISMISS_KEY, manifest.versionId) } catch {}
    setPhase("idle")
  }, [manifest])

  const forceCheck = useCallback(async () => {
    setManifest(null)
    setPhase("checking")
    await runCheck()
  }, [runCheck])

  const openPermissionSettings = useCallback(async () => {
    await ApkUpdater.openInstallPermissionSettings().catch(() => {})
  }, [])

  const value = useMemo<UpdaterContextValue>(
    () => ({
      phase,
      manifest,
      current,
      progress,
      error,
      isMandatory: !!manifest?.mandatory,
      hasNativeBridge: isApkUpdaterAvailable(),
      startDownload,
      cancel,
      install,
      dismiss,
      forceCheck,
      openPermissionSettings,
    }),
    [phase, manifest, current, progress, error, startDownload, cancel, install, dismiss, forceCheck, openPermissionSettings],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApkUpdater() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useApkUpdater must be used inside <ApkUpdaterProvider>")
  return ctx
}
