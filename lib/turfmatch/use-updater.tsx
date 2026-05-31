"use client"

import { useAppUpdater } from "@/lib/ota/use-updater"

export { useAppUpdater }

/**
 * Enterprise-grade update banner with progress, retry, and forced update support.
 */
export function UpdateBanner() {
  const { updateAvailable, updateInfo, checking, downloading, error, install, dismiss } = useAppUpdater()

  if (!updateAvailable && !error && !downloading && !checking) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 border-b border-slate-700 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        {downloading && (
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        <div className="min-w-0">
          {downloading && (
            <span className="text-sm font-bold shrink-0">Downloading update...</span>
          )}
          {updateAvailable && !downloading && (
            <>
              <span className="text-sm font-bold shrink-0">Update available</span>
              <span className="text-xs text-slate-400 truncate ml-2">
                v{updateInfo?.version} {updateInfo?.mandatory && "(required)"}
              </span>
            </>
          )}
          {error && (
            <span className="text-sm font-bold text-rose-400 shrink-0">Update failed</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {error && (
          <button
            onClick={install}
            className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold active:scale-95 transition-transform"
          >
            Retry
          </button>
        )}
        {updateAvailable && !downloading && (
          <button
            onClick={install}
            disabled={downloading}
            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            Update
          </button>
        )}
        {updateInfo?.mandatory ? null : (
          <button
            onClick={dismiss}
            disabled={downloading}
            className="text-xs text-slate-400 hover:text-white disabled:opacity-50"
          >
            Later
          </button>
        )}
      </div>
    </div>
  )
}
