/**
 * Resolves the latest APK manifest from the admin API.
 * The response shape mirrors `/api/version.json` on the admin app.
 */

import { ApkUpdater } from "./apk-updater"

const VERSION_API = "https://turf-match-admin.vercel.app/api/version.json"
const APP_CHANNEL = "stable"

export interface ApkManifest {
  updateAvailable: true
  mandatory: boolean
  version: string
  buildNumber: number
  versionCode: number
  apkUrl: string
  apkSha256: string
  apkSizeBytes: number
  signingSha256: string | null
  minSdk: number | null
  releaseNotes: string | null
  rolloutPct: number
  versionId: string
}

export interface NoUpdate {
  updateAvailable: false
  reason?: string
  rolloutPct?: number
  minSdk?: number
  currentSdk?: number
}

export type ManifestResponse = ApkManifest | NoUpdate

export async function fetchApkManifest(deviceId: string): Promise<ManifestResponse> {
  const current = await ApkUpdater.getCurrentVersion().catch(() => null)
  const url = new URL(VERSION_API)
  url.searchParams.set("deviceId", deviceId)
  url.searchParams.set("platform", "android")
  url.searchParams.set("channel", APP_CHANNEL)
  if (current) {
    url.searchParams.set("versionCode", String(current.versionCode))
    url.searchParams.set("currentVersion", current.versionName)
    url.searchParams.set("sdk", String(current.sdk))
  }

  const res = await fetch(url.toString(), { cache: "no-store", mode: "cors" })
  if (!res.ok) throw new Error(`Version check failed: HTTP ${res.status}`)
  const data = (await res.json()) as ManifestResponse

  if (data.updateAvailable) {
    // Schema sanity
    if (!data.apkUrl || !data.apkSha256 || !data.apkSizeBytes) {
      throw new Error("Server returned updateAvailable but missing apk fields")
    }
    if (!/^[a-f0-9]{64}$/i.test(data.apkSha256)) {
      throw new Error("apkSha256 is not 64-char hex")
    }
  }

  return data
}

export function getDeviceId(): string {
  if (typeof localStorage === "undefined") return "server"
  let id = localStorage.getItem("ota_device_id")
  if (!id) {
    id =
      "dev-" +
      Math.random().toString(36).slice(2, 10) +
      "-" +
      Date.now().toString(36)
    localStorage.setItem("ota_device_id", id)
  }
  return id
}
