"use client"

import { useMemo } from "react"
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
  Lock,
  Wifi,
} from "lucide-react"
import { useApkUpdater } from "@/lib/ota/use-apk-updater"
import { cn } from "@/lib/utils"

/**
 * Glassmorphism progress modal. Used both as a casual update sheet
 * (dismissable) and as the visual layer inside the ForceUpdateGate
 * (non-dismissable, full-screen blocker).
 */
export function UpdateModal({ forceFullScreen = false }: { forceFullScreen?: boolean }) {
  const {
    phase,
    manifest,
    current,
    progress,
    error,
    isMandatory,
    startDownload,
    cancel,
    install,
    dismiss,
    openPermissionSettings,
  } = useApkUpdater()

  const etaSec = useMemo(() => {
    if (!progress?.bytesPerSecond || !progress.total) return null
    const remaining = progress.total - progress.downloaded
    return Math.max(0, Math.round(remaining / progress.bytesPerSecond))
  }, [progress])

  // During an active download/install flow, keep the modal open even if a background
  // poll briefly clears the manifest. We show what we can from progress + current state.
  const activeOtaPhase =
    phase === "preparing" ||
    phase === "downloading" ||
    phase === "verifying" ||
    phase === "ready_to_install" ||
    phase === "installing" ||
    phase === "blocked_permission" ||
    phase === "error" ||
    phase === "installed"
  if (!manifest && !activeOtaPhase) return null

  const visible =
    forceFullScreen ||
    isMandatory ||
    phase === "available" ||
    phase === "preparing" ||
    phase === "downloading" ||
    phase === "verifying" ||
    phase === "ready_to_install" ||
    phase === "installing" ||
    phase === "installed" ||
    phase === "blocked_permission" ||
    phase === "error"

  if (!visible) return null

  const percent = progress?.percent ?? 0
  const downloadedMb = (progress?.downloaded ?? 0) / (1024 * 1024)
  const totalMb = (progress?.total ?? manifest?.apkSizeBytes ?? 0) / (1024 * 1024)
  const speedMbps = (progress?.bytesPerSecond ?? 0) / (1024 * 1024)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 isolate">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity",
          isMandatory ? "bg-slate-950/95" : "bg-slate-950/80",
          "backdrop-blur-xl",
        )}
      />
      {/* Animated glow halo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-emerald-500/20 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-blue-500/15 blur-[100px] animate-pulse" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_60%)]" />
        <div className="relative p-6 sm:p-8">
          {/* Close (only optional updates) */}
          {!isMandatory && phase !== "downloading" && phase !== "verifying" && phase !== "installing" && (
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header icon */}
          <div className="flex justify-center mb-5">
            <PhaseIcon phase={phase} percent={percent} />
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-white tracking-tight">
            {phase === "available" && (isMandatory ? "Update required" : "Update available")}
            {phase === "preparing" && "Preparing update"}
            {phase === "downloading" && "Downloading update"}
            {phase === "verifying" && "Verifying"}
            {phase === "ready_to_install" && "Ready to install"}
            {phase === "installing" && "Opening installer"}
            {phase === "installed" && "Installation triggered"}
            {phase === "blocked_permission" && "Permission needed"}
            {phase === "error" && "Something went wrong"}
          </h2>

          {/* Subtitle */}
          <p className="text-center text-sm text-slate-300 mt-2">
            {manifest && phase !== "blocked_permission" && phase !== "error" && (
              <>
                v{current?.versionName || "?"} → <span className="text-emerald-300 font-semibold">v{manifest.version}</span>
                <span className="text-slate-500"> · {(manifest.apkSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
              </>
            )}
            {phase === "blocked_permission" && "Allow TurfMatch to install app updates in Android settings."}
            {phase === "error" && (error || "Unknown error")}
          </p>

          {/* Release notes (only when idle/available) */}
          {phase === "available" && manifest?.releaseNotes && (
            <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-300 whitespace-pre-line">{manifest.releaseNotes}</p>
            </div>
          )}

          {/* Progress ring + metrics */}
          {(phase === "preparing" || phase === "downloading" || phase === "verifying") && (
            <div className="mt-6 flex flex-col items-center">
              <ProgressRing percent={phase === "verifying" ? 100 : percent} verifying={phase === "verifying"} />
              {phase === "downloading" && (
                <div className="mt-4 w-full">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-300 font-medium tabular-nums">
                      {downloadedMb.toFixed(1)} <span className="text-slate-500">/ {totalMb.toFixed(1)} MB</span>
                    </span>
                    <span className="text-emerald-300 font-bold text-lg tabular-nums">{percent.toFixed(0)}%</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-emerald-400" />
                      {speedMbps > 1
                        ? `${speedMbps.toFixed(2)} MB/s`
                        : `${(speedMbps * 1024).toFixed(0)} KB/s`}
                    </span>
                    {etaSec !== null && (
                      <span>{etaSec >= 60 ? `${Math.ceil(etaSec / 60)} min remaining` : `${etaSec}s remaining`}</span>
                    )}
                  </div>
                </div>
              )}
              {phase === "verifying" && (
                <p className="mt-3 text-xs text-slate-400">Checking integrity (SHA-256)...</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2">
            {phase === "available" && manifest && (
              <button
                onClick={startDownload}
                className="w-full rounded-2xl py-3.5 font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 transition shadow-lg shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download {(manifest.apkSizeBytes / 1024 / 1024).toFixed(1)} MB
              </button>
            )}
            {phase === "downloading" && !isMandatory && (
              <button
                onClick={cancel}
                className="w-full rounded-2xl py-3 font-medium text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            )}
            {phase === "ready_to_install" && (
              <button
                onClick={install}
                className="w-full rounded-2xl py-3.5 font-bold text-white bg-gradient-to-r from-blue-500 to-emerald-400 hover:brightness-110 transition shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Install now
              </button>
            )}
            {phase === "installed" && (
              <button
                onClick={install}
                className="w-full rounded-2xl py-3 font-medium text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition"
              >
                Re-open installer
              </button>
            )}
            {phase === "blocked_permission" && (
              <>
                <button
                  onClick={openPermissionSettings}
                  className="w-full rounded-2xl py-3.5 font-bold text-white bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Open settings
                </button>
                <button
                  onClick={install}
                  className="w-full rounded-2xl py-2.5 font-medium text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm"
                >
                  Retry install
                </button>
              </>
            )}
            {phase === "error" && (
              <button
                onClick={startDownload}
                className="w-full rounded-2xl py-3.5 font-bold text-white bg-gradient-to-r from-rose-500 to-rose-400 hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Retry
              </button>
            )}

            {!isMandatory && phase === "available" && (
              <button
                onClick={dismiss}
                className="w-full rounded-2xl py-2.5 font-medium text-slate-400 hover:text-slate-300 transition text-sm"
              >
                Maybe later
              </button>
            )}
          </div>

          {/* Mandatory footer */}
          {isMandatory && (
            <p className="mt-5 text-center text-[11px] text-slate-500 inline-flex items-center justify-center gap-1 w-full">
              <ShieldCheck className="w-3 h-3" />
              This update is required to continue using the app.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PhaseIcon({ phase, percent }: { phase: string; percent: number }) {
  if (phase === "downloading" || phase === "preparing" || phase === "verifying") {
    return (
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/10 flex items-center justify-center border border-emerald-500/30 shadow-inner shadow-emerald-500/10">
        <Loader2 className="w-7 h-7 text-emerald-300 animate-spin" />
      </div>
    )
  }
  if (phase === "ready_to_install" || phase === "installing" || phase === "installed") {
    return (
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/10 flex items-center justify-center border border-blue-500/30">
        <Sparkles className="w-7 h-7 text-blue-300" />
      </div>
    )
  }
  if (phase === "blocked_permission") {
    return (
      <div className="relative w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
        <Lock className="w-7 h-7 text-amber-300" />
      </div>
    )
  }
  if (phase === "error") {
    return (
      <div className="relative w-16 h-16 rounded-2xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
        <AlertTriangle className="w-7 h-7 text-rose-300" />
      </div>
    )
  }
  return (
    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-blue-500/15 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
      <Download className="w-7 h-7 text-emerald-300" />
    </div>
  )
}

function ProgressRing({ percent, verifying }: { percent: number; verifying: boolean }) {
  const size = 140
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
        <defs>
          <linearGradient id="otaRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#otaRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {verifying ? (
          <CheckCircle2 className="w-7 h-7 text-emerald-300 animate-pulse" />
        ) : (
          <>
            <span className="text-2xl font-bold text-white tabular-nums">{percent.toFixed(0)}<span className="text-base text-slate-400">%</span></span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">downloading</span>
          </>
        )}
      </div>
    </div>
  )
}
