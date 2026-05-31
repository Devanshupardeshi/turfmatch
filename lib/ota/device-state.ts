import { createClient } from '@supabase/supabase-js'
import type { DeviceState } from './types'

const supabaseUrl = 'https://ziwzynzwrjcwrllmlwsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppd3p5bnp3cmpjd3JsbG1sd3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTMxNjQsImV4cCI6MjA5Mzk4OTE2NH0.oI-eaTYp8a6tT1hIyw9uXkGQtR4Kw93e5zhP2WWuOno'

const client = createClient(supabaseUrl, supabaseAnonKey)

const localCache = new Map<string, DeviceState>()

export async function getDeviceState(deviceId: string): Promise<DeviceState> {
  if (localCache.has(deviceId)) return localCache.get(deviceId)!

  const { data } = await client
    .from('device_update_state')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  if (data) {
    const state: DeviceState = {
      deviceId: data.device_id,
      currentVersion: data.current_version,
      pendingVersion: data.pending_version || undefined,
      lastSuccessfulVersion: data.last_successful_version,
      updateStatus: data.update_status,
      bootCount: data.boot_count,
      consecutiveFailures: data.consecutive_failures,
    }
    localCache.set(deviceId, state)
    return state
  }

  const defaultState: DeviceState = {
    deviceId,
    currentVersion: '1.0.0',
    lastSuccessfulVersion: '1.0.0',
    updateStatus: 'idle',
    bootCount: 0,
    consecutiveFailures: 0,
  }

  await client.from('device_update_state').insert({
    device_id: deviceId,
    current_version: defaultState.currentVersion,
    last_successful_version: defaultState.lastSuccessfulVersion,
    update_status: defaultState.updateStatus,
    boot_count: defaultState.bootCount,
    consecutive_failures: defaultState.consecutiveFailures,
  })

  localCache.set(deviceId, defaultState)
  return defaultState
}

export async function saveDeviceState(
  deviceId: string,
  partial: Partial<DeviceState>
) {
  const current = await getDeviceState(deviceId)
  const updated = { ...current, ...partial }
  localCache.set(deviceId, updated)

  await client
    .from('device_update_state')
    .update({
      current_version: updated.currentVersion,
      pending_version: updated.pendingVersion || null,
      last_successful_version: updated.lastSuccessfulVersion,
      update_status: updated.updateStatus,
      boot_count: updated.bootCount,
      consecutive_failures: updated.consecutiveFailures,
      last_check_at: new Date().toISOString(),
    })
    .eq('device_id', deviceId)
}
