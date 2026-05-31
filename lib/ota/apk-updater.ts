/**
 * TS bridge to the native `ApkUpdater` Capacitor plugin.
 *
 * Exposes a small, typed surface that wraps the unsafe `registerPlugin` call
 * and adds web fallbacks (so the dev server doesn't crash when running in a
 * regular browser tab).
 */

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"

export interface ApkProgressEvent {
  downloaded: number
  total: number
  percent: number
  bytesPerSecond: number
}

export interface ApkCurrentVersion {
  versionName: string
  versionCode: number
  packageName: string
  sdk: number
  signingSha256: string
}

export interface ApkUpdaterPlugin {
  getCurrentVersion(): Promise<ApkCurrentVersion>
  canRequestInstallPackages(): Promise<{ allowed: boolean }>
  openInstallPermissionSettings(): Promise<void>
  getFreeSpace(): Promise<{ bytesAvailable: number; cachePath: string }>
  getCachedApkInfo(): Promise<{ exists: boolean; path: string; size: number }>
  deleteCachedApk(): Promise<{ deleted: boolean }>
  download(input: {
    url: string
    sha256: string
    sizeBytes: number
    version?: string
  }): Promise<{ path: string; sizeBytes: number }>
  cancel(): Promise<void>
  install(input: { path?: string }): Promise<void>
  getNetworkState(): Promise<{ connected: boolean; type: string }>
  addListener(event: "progress", cb: (e: ApkProgressEvent) => void): Promise<PluginListenerHandle>
}

const isNative = typeof window !== "undefined" && Capacitor?.isNativePlatform?.()

let nativeBridge: ApkUpdaterPlugin | null = null
let nativePluginReady = false

if (isNative) {
  try {
    nativeBridge = registerPlugin<ApkUpdaterPlugin>("ApkUpdater")
  } catch (e) {
    console.warn("[ApkUpdater] registerPlugin failed, falling back to web stubs:", e)
    nativeBridge = null
  }
}

/**
 * Probe the native bridge once. If the first method call throws
 * "not implemented", disable the bridge so the rest of the app
 * doesn't show an error modal.
 */
async function ensureBridge(): Promise<boolean> {
  if (!nativeBridge) return false
  if (nativePluginReady) return true
  try {
    await nativeBridge.getCurrentVersion()
    nativePluginReady = true
    return true
  } catch (e: any) {
    const msg = String(e?.message || e || "")
    if (msg.includes("not implemented") || msg.includes("not available")) {
      console.warn("[ApkUpdater] Native plugin not available on this build, disabling:", msg)
      nativeBridge = null
      return false
    }
    // Some other error (e.g. PackageManager); plugin exists but something else went wrong.
    nativePluginReady = true
    throw e
  }
}

export const ApkUpdater: ApkUpdaterPlugin = {
  async getCurrentVersion() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.getCurrentVersion()
    return { versionName: "1.0.0", versionCode: 1, packageName: "web.dev", sdk: 0, signingSha256: "" }
  },
  async canRequestInstallPackages() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.canRequestInstallPackages()
    return { allowed: false }
  },
  async openInstallPermissionSettings() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.openInstallPermissionSettings()
  },
  async getFreeSpace() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.getFreeSpace()
    return { bytesAvailable: Number.MAX_SAFE_INTEGER, cachePath: "/web" }
  },
  async getCachedApkInfo() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.getCachedApkInfo()
    return { exists: false, path: "", size: 0 }
  },
  async deleteCachedApk() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.deleteCachedApk()
    return { deleted: true }
  },
  async download(input) {
    const ok = await ensureBridge()
    if (!ok || !nativeBridge) {
      throw new Error(
        "ApkUpdater native plugin is missing. " +
          "Run 'npx cap sync android', ensure ApkUpdaterPlugin.java compiles, then rebuild the APK."
      )
    }
    return nativeBridge.download(input)
  },
  async cancel() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.cancel()
  },
  async install(input) {
    const ok = await ensureBridge()
    if (!ok || !nativeBridge) {
      throw new Error(
        "ApkUpdater native plugin is missing. " +
          "Run 'npx cap sync android', ensure ApkUpdaterPlugin.java compiles, then rebuild the APK."
      )
    }
    return nativeBridge.install(input)
  },
  async getNetworkState() {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.getNetworkState()
    const online = typeof navigator !== "undefined" ? navigator.onLine : true
    return { connected: online, type: online ? "wifi" : "offline" }
  },
  async addListener(event, cb) {
    const ok = await ensureBridge()
    if (ok && nativeBridge) return nativeBridge.addListener(event, cb)
    return { remove: async () => {} } as PluginListenerHandle
  },
}

/** Returns true only when the native plugin is actually usable on this build. */
export function isApkUpdaterAvailable(): boolean {
  // Before the first probe, assume native is available if on a native platform.
  // After ensureBridge() runs, nativeBridge will be null if the probe failed.
  if (!isNative) return false
  // Once probed and failed, nativeBridge is set to null permanently.
  if (nativePluginReady) return nativeBridge !== null
  // Not yet probed — optimistically assume available.
  return true
}
