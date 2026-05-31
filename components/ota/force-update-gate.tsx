"use client"

import { useApkUpdater } from "@/lib/ota/use-apk-updater"
import { UpdateModal } from "./update-modal"

/**
 * Hard blocker. When `manifest.mandatory` is true the modal covers the
 * entire UI tree and intercepts all clicks; the user cannot reach any
 * screen until they install the new build.
 *
 * Otherwise, this still renders the modal so optional updates surface as
 * a sheet, but children remain interactive in the background.
 */
export function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const { manifest, phase } = useApkUpdater()
  const mandatory = !!manifest?.mandatory

  // While downloading/installing a mandatory update we keep the lock on,
  // even if the modal phase changes.
  const lockEngaged =
    mandatory &&
    (phase === "available" ||
      phase === "preparing" ||
      phase === "downloading" ||
      phase === "verifying" ||
      phase === "ready_to_install" ||
      phase === "installing" ||
      phase === "blocked_permission" ||
      phase === "error")

  // The wrapper MUST preserve the parent's flex-column flow that
  // TmAppFrame established. Children like SplashScreen rely on `h-full`,
  // which only resolves when the parent has an explicit/derived height.
  // `h-full` here propagates TmAppFrame's `h-[100dvh] sm:h-[860px]`
  // through the wrapper, and `flex flex-col` establishes the column
  // context the rest of the shell expects.
  return (
    <>
      <div
        aria-hidden={lockEngaged}
        className={
          "h-full w-full flex flex-col min-h-0 " +
          (lockEngaged ? "pointer-events-none select-none blur-sm" : "")
        }
        inert={lockEngaged ? ("" as any) : undefined}
      >
        {children}
      </div>
      <UpdateModal forceFullScreen={lockEngaged} />
    </>
  )
}
