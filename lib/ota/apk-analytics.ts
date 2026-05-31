/**
 * Records OTA install attempts to Supabase so the admin dashboard can
 * report per-version success / failure rates. Failures here are non-fatal
 * — analytics must NEVER block the user from getting an update.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ziwzynzwrjcwrllmlwsy.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppd3p5bnp3cmpjd3JsbG1sd3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTMxNjQsImV4cCI6MjA5Mzk4OTE2NH0.oI-eaTYp8a6tT1hIyw9uXkGQtR4Kw93e5zhP2WWuOno"

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type ApkOutcome =
  | "started"
  | "downloading"
  | "downloaded"
  | "installing"
  | "installed"
  | "failed"
  | "cancelled"

export interface AttemptInput {
  deviceId: string
  versionId: string | null
  targetVersion: string
  targetVersionCode: number | null
  outcome: ApkOutcome
  bytesDownloaded?: number
  bytesTotal?: number
  errorMessage?: string
  networkType?: string
  androidSdk?: number | null
  appVersionBefore?: string
}

const ATTEMPT_KEY = "ota_attempt_id"

export async function startAttempt(input: Omit<AttemptInput, "outcome">) {
  try {
    const { data, error } = await client
      .from("apk_install_attempts")
      .insert({
        device_id: input.deviceId,
        version_id: input.versionId,
        target_version: input.targetVersion,
        target_version_code: input.targetVersionCode,
        outcome: "started",
        bytes_total: input.bytesTotal,
        network_type: input.networkType,
        android_sdk: input.androidSdk,
        app_version_before: input.appVersionBefore,
      })
      .select("id")
      .single()
    if (error || !data) {
      console.warn("[OTA] startAttempt failed", error)
      return null
    }
    localStorage.setItem(ATTEMPT_KEY, (data as any).id)
    return (data as any).id as string
  } catch (e) {
    console.warn("[OTA] startAttempt error", e)
    return null
  }
}

export async function updateAttempt(
  outcome: ApkOutcome,
  extra: Partial<{
    bytesDownloaded: number
    bytesTotal: number
    errorMessage: string
  }> = {},
) {
  try {
    const id = localStorage.getItem(ATTEMPT_KEY)
    if (!id) return
    await client
      .from("apk_install_attempts")
      .update({
        outcome,
        bytes_downloaded: extra.bytesDownloaded,
        bytes_total: extra.bytesTotal,
        error_message: extra.errorMessage,
      })
      .eq("id", id)
    if (
      outcome === "installed" ||
      outcome === "failed" ||
      outcome === "cancelled"
    ) {
      localStorage.removeItem(ATTEMPT_KEY)
    }
  } catch (e) {
    console.warn("[OTA] updateAttempt error", e)
  }
}

export function getOpenAttemptId(): string | null {
  try { return localStorage.getItem(ATTEMPT_KEY) } catch { return null }
}
