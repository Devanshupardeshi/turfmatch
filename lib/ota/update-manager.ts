import { compareVersions, isCompatible, shouldReceiveRollout } from './version-utils'
import type { AppVersion, UpdateCheckResult, DeviceState } from './types'
import { trackEvent } from './analytics'
import { getDeviceState, saveDeviceState } from './device-state'

const UPDATE_CHECK_URL = 'https://turf-match-admin.vercel.app/api/version.json'
const APP_NATIVE_VERSION = '1.0.0' // Set from capacitor build config
const APP_CHANNEL = 'stable'

let currentBundleVersion = '1.0.0'

try {
  const stored = localStorage.getItem('ota_current_version')
  if (stored) currentBundleVersion = stored
} catch {}

export async function checkForUpdate(deviceId: string, platform: string): Promise<UpdateCheckResult | null> {
  try {
    const state = await getDeviceState(deviceId)
    if (state.updateStatus === 'failed' && state.consecutiveFailures >= 3) {
      console.warn('[OTA] Too many failures, skipping update check')
      return null
    }

    const url = new URL(UPDATE_CHECK_URL)
    url.searchParams.set('deviceId', deviceId)
    url.searchParams.set('platform', platform)
    url.searchParams.set('currentVersion', currentBundleVersion)
    url.searchParams.set('nativeVersion', APP_NATIVE_VERSION)
    url.searchParams.set('channel', APP_CHANNEL)
    url.searchParams.set('buildNumber', '1')

    console.log('[OTA] Checking for update', { url: url.toString(), currentBundleVersion })
    const res = await fetch(url.toString(), { cache: 'no-store', mode: 'cors' })
    if (!res.ok) {
      console.warn('[OTA] Check failed with status', res.status)
      return null
    }

    const data = await res.json()
    console.log('[OTA] Check response', data)

    await trackEvent({
      event_type: 'check',
      device_id: deviceId,
      platform,
      previous_version: currentBundleVersion,
      target_version: data.version,
      metadata: { updateAvailable: data.updateAvailable },
    })

    if (!data.updateAvailable) return null
    if (!data.checksum || !data.url) return null

    return {
      updateAvailable: true,
      version: data.version,
      url: data.url,
      mandatory: data.mandatory,
      notes: data.notes,
      checksum: data.checksum,
      sizeMb: data.sizeMb,
    }
  } catch (e) {
    console.error('[OTA] Check failed:', e)
    return null
  }
}

export async function performUpdate(
  deviceId: string,
  platform: string,
  update: UpdateCheckResult
): Promise<boolean> {
  try {
    await trackEvent({
      event_type: 'download_start',
      device_id: deviceId,
      platform,
      target_version: update.version,
      metadata: { sizeMb: update.sizeMb },
    })

    await saveDeviceState(deviceId, {
      pendingVersion: update.version,
      updateStatus: 'downloading',
    })

    const { CapacitorUpdater } = await import('@capgo/capacitor-updater')

    // Download the bundle
    const { id } = await CapacitorUpdater.download({
      url: update.url,
      version: update.version,
    })

    // Mark install pending for boot health check
    await saveDeviceState(deviceId, {
      pendingVersion: update.version,
      updateStatus: 'rebooting',
    })

    // Set as active — app will reload automatically
    await CapacitorUpdater.set({ id })

    await saveDeviceState(deviceId, {
      currentVersion: update.version,
      pendingVersion: undefined,
      lastSuccessfulVersion: update.version,
      updateStatus: 'idle',
      consecutiveFailures: 0,
    })

    localStorage.setItem('ota_current_version', update.version)
    currentBundleVersion = update.version

    await trackEvent({
      event_type: 'install_success',
      device_id: deviceId,
      platform,
      previous_version: update.version,
      target_version: update.version,
    })

    return true
  } catch (e: any) {
    console.error('[OTA] Update failed:', e)
    const state = await getDeviceState(deviceId)
    await saveDeviceState(deviceId, {
      pendingVersion: undefined,
      updateStatus: 'failed',
      consecutiveFailures: state.consecutiveFailures + 1,
    })

    await trackEvent({
      event_type: 'install_failed',
      device_id: deviceId,
      platform,
      target_version: update.version,
      error_message: e?.message || 'Unknown error',
    })

    return false
  }
}

export function getCurrentVersion(): string {
  return currentBundleVersion
}
