"use client"

/**
 * App Bootstrap Provider — THE CRITICAL FIX for the startup race condition.
 *
 * This component sits at the ROOT of your app (above all other providers)
 * and blocks rendering of ANY child components until:
 *
 *   1. Auth session is restored (or known null)
 *   2. Network connectivity is verified
 *   3. OTA update check completes (if applicable)
 *   4. All Capacitor plugins are loaded
 *
 * Previously, the app rendered immediately → child components mounted →
 * useEffect fired queries → session was still null → RLS returned empty.
 *
 * Now: NOTHING renders until bootstrap is complete. Then everything
 * renders with auth already in place.
 */

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { initializeAuth, waitForAuthInit, isAuthReady, getSession } from "./session-manager"
import { waitForNetwork } from "./network-monitor"
import { startupLog, PerfMarker } from "./startup-logger"

// ── Types ────────────────────────────────────────────────────────────────────

interface BootstrapState {
  /** true when all initialization is done and app can render */
  ready: boolean
  /** true if there was a fatal init error (app should show error screen) */
  error: boolean
  /** human-readable status for the loading splash */
  statusMessage: string
  /** percentage 0-100 for loading indicator */
  progress: number
}

interface AppBootstrapContextType extends BootstrapState {
  /** Re-run bootstrap (useful after auth changes or app resume) */
  reinitialize: () => Promise<void>
}

// ── Context ────────────────────────────────────────────────────────────────────

const AppBootstrapContext = createContext<AppBootstrapContextType | null>(null)

export function useAppBootstrap() {
  const ctx = useContext(AppBootstrapContext)
  if (!ctx) throw new Error("useAppBootstrap must be used within AppBootstrapProvider")
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface AppBootstrapProviderProps {
  children: ReactNode
  /** Component to show while bootstrapping (default: built-in splash) */
  loadingComponent?: ReactNode
  /** Component to show on fatal error */
  errorComponent?: ReactNode
}

export function AppBootstrapProvider({
  children,
  loadingComponent,
  errorComponent,
}: AppBootstrapProviderProps) {
  const [state, setState] = useState<BootstrapState>({
    ready: false,
    error: false,
    statusMessage: "Starting up...",
    progress: 0,
  })

  const initRef = useRef(false)

  const runBootstrap = async () => {
    if (initRef.current && state.ready) return // already done
    initRef.current = true

    const perf = new PerfMarker('app-bootstrap')
    startupLog.info('Bootstrap', 'Starting app initialization sequence...')

    try {
      // Phase 1: Capacitor plugin loading (native bridge)
      setState((s) => ({ ...s, statusMessage: "Loading native bridge...", progress: 10 }))
      if (typeof window !== "undefined") {
        try {
          const { Capacitor } = await import("@capacitor/core")
          if (Capacitor.isNativePlatform()) {
            startupLog.info('Bootstrap', 'Capacitor native platform detected')
            // Wait a tick for native bridge to fully initialize
            await new Promise((r) => setTimeout(r, 300))
          }
        } catch {
          // Not native — web browser
        }
      }

      // Phase 2: Auth session restoration
      setState((s) => ({ ...s, statusMessage: "Restoring session...", progress: 30 }))
      await initializeAuth()
      await waitForAuthInit()
      startupLog.info('Bootstrap', 'Auth init complete', { authenticated: !!getSession() })

      // Phase 3: Network connectivity
      setState((s) => ({ ...s, statusMessage: "Checking connection...", progress: 60 }))
      await waitForNetwork()
      startupLog.info('Bootstrap', 'Network ready')

      // Phase 4: OTA manifest peek (full lifecycle is owned by ApkUpdaterProvider)
      setState((s) => ({ ...s, statusMessage: "Checking for updates...", progress: 80 }))
      try {
        const { fetchApkManifest, getDeviceId } = await import("@/lib/ota/apk-manifest")
        const manifest = await fetchApkManifest(getDeviceId())
        if (manifest.updateAvailable) {
          startupLog.info('Bootstrap', 'OTA update available', { version: manifest.version, mandatory: manifest.mandatory })
        }
      } catch (e: any) {
        startupLog.warn('Bootstrap', 'OTA check failed (non-critical)', { message: e?.message })
      }

      // Phase 5: Ready
      setState((s) => ({ ...s, statusMessage: "Ready!", progress: 100 }))
      startupLog.info('Bootstrap', 'All phases complete — rendering app')
      perf.end({ success: true })

      // Small delay so progress bar reaches 100% visually
      await new Promise((r) => setTimeout(r, 150))
      setState({ ready: true, error: false, statusMessage: "Ready", progress: 100 })
    } catch (err: any) {
      startupLog.fatal('Bootstrap', 'Initialization failed', { message: err?.message, stack: err?.stack })
      perf.end({ success: false, error: err?.message })
      setState({ ready: false, error: true, statusMessage: "Failed to start. Please restart.", progress: 0 })
    }
  }

  useEffect(() => {
    runBootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle Capacitor app resume — re-verify network and session
  useEffect(() => {
    if (typeof window === "undefined") return

    let removeResume: (() => void) | undefined

    import("@capacitor/app").then(({ App }) => {
      App.addListener("appStateChange", (state) => {
        startupLog.info('Lifecycle', `App state changed: ${state.isActive ? 'active' : 'inactive'}`)
        if (state.isActive) {
          // App came to foreground — verify session is still valid
          setTimeout(() => {
            import("./session-manager").then(({ getSession, refreshSession }) => {
              const session = getSession()
              if (!session) {
                startupLog.warn('Lifecycle', 'Session missing after resume — attempting refresh')
                refreshSession().catch(() => {})
              }
            })
          }, 500)
        }
      }).then((sub) => {
        removeResume = () => sub.remove()
      })
    }).catch(() => {
      // Not native
    })

    return () => {
      removeResume?.()
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state.error) {
    return (
      <AppBootstrapContext.Provider value={{ ...state, reinitialize: runBootstrap }}>
        {errorComponent ?? (
          <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white p-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <h1 className="text-xl font-bold">Startup Failed</h1>
              <p className="text-slate-400 text-sm">{state.statusMessage}</p>
              <button
                onClick={() => {
                  setState({ ready: false, error: false, statusMessage: "Retrying...", progress: 0 })
                  runBootstrap()
                }}
                className="px-4 py-2 bg-emerald-500 rounded-lg text-sm font-medium hover:bg-emerald-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </AppBootstrapContext.Provider>
    )
  }

  if (!state.ready) {
    return (
      <AppBootstrapContext.Provider value={{ ...state, reinitialize: runBootstrap }}>
        {loadingComponent ?? (
          <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
            <div className="text-center space-y-4 w-64">
              <div className="flex justify-center">
                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-slate-300">{state.statusMessage}</p>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </AppBootstrapContext.Provider>
    )
  }

  return (
    <AppBootstrapContext.Provider value={{ ...state, reinitialize: runBootstrap }}>
      {children}
    </AppBootstrapContext.Provider>
  )
}
