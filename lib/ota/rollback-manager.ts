import { trackEvent } from './analytics'
import { getDeviceState, saveDeviceState } from './device-state'

const BOOT_THRESHOLD = 3
const ROLLBACK_TIMEOUT_MS = 30000

export async function verifyBootHealth(deviceId: string, platform: string): Promise<boolean> {
  try {
    const state = await getDeviceState(deviceId)

    // Increment boot counter
    const newBootCount = state.bootCount + 1
    await saveDeviceState(deviceId, { bootCount: newBootCount })

    // First boot after install: verify within timeout window
    if (state.updateStatus === 'rebooting') {
      const lastInstall = state.last_install_at ? new Date(state.last_install_at).getTime() : 0
      const now = Date.now()

      if (now - lastInstall > ROLLBACK_TIMEOUT_MS) {
        // Boot took too long — possible crash/brick
        console.warn('[OTA] Rollback triggered: boot timeout after update')
        await rollbackToPrevious(deviceId, platform)
        return false
      }

      // Healthy boot after update
      await saveDeviceState(deviceId, {
        updateStatus: 'idle',
        bootCount: 0,
        consecutiveFailures: 0,
      })

      await trackEvent({
        event_type: 'install_success',
        device_id: deviceId,
        platform,
        previous_version: state.lastSuccessfulVersion,
        target_version: state.currentVersion,
        metadata: { bootVerified: true },
      })

      return true
    }

    // Multiple boots without clearing while a pending update is staged
    // indicates a crash loop. Without a pending update, repeated launches
    // are normal and must NOT trigger a rollback.
    if (state.pendingVersion && newBootCount >= BOOT_THRESHOLD) {
      console.warn('[OTA] Rollback triggered: consecutive boot threshold exceeded with pending update')
      await rollbackToPrevious(deviceId, platform)
      return false
    }

    // No pending update — safe boot, reset counter.
    if (!state.pendingVersion && newBootCount > 1) {
      await saveDeviceState(deviceId, { bootCount: 0 })
    }

    return true
  } catch (e) {
    console.error('[OTA] Boot health check failed:', e)
    return true // Don't block startup on check failure
  }
}

export async function markInstallPending(deviceId: string, version: string) {
  await saveDeviceState(deviceId, {
    pendingVersion: version,
    updateStatus: 'rebooting',
    last_install_at: new Date().toISOString(),
  })
}

export async function rollbackToPrevious(deviceId: string, platform: string) {
  const state = await getDeviceState(deviceId)
  const safeVersion = state.lastSuccessfulVersion || '1.0.0'

  // Store the failed version to prevent re-offer
  const failedVersions = JSON.parse(localStorage.getItem('ota_failed_versions') || '[]')
  if (state.pendingVersion && !failedVersions.includes(state.pendingVersion)) {
    failedVersions.push(state.pendingVersion)
    localStorage.setItem('ota_failed_versions', JSON.stringify(failedVersions))
  }

  await saveDeviceState(deviceId, {
    currentVersion: safeVersion,
    pendingVersion: undefined,
    updateStatus: 'idle',
    bootCount: 0,
    consecutiveFailures: 0,
  })

  await trackEvent({
    event_type: 'rollback_triggered',
    device_id: deviceId,
    platform,
    previous_version: state.pendingVersion,
    target_version: safeVersion,
    metadata: { reason: 'boot_failure' },
  })

  // Force reload with safe version
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
    await CapacitorUpdater.reset() // Resets to bundled version
  } catch {
    // Fallback: just reload
    window.location.reload()
  }
}

export function isVersionBlocked(version: string): boolean {
  try {
    const blocked = JSON.parse(localStorage.getItem('ota_failed_versions') || '[]')
    return blocked.includes(version)
  } catch {
    return false
  }
}
