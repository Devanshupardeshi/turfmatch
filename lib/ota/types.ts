export interface AppVersion {
  id: string
  version: string
  build_number: number
  min_native_version: string
  platform: 'android' | 'ios' | 'all'
  channel: 'dev' | 'beta' | 'stable'
  status: 'draft' | 'staging' | 'active' | 'archived' | 'rollback'
  bundle_url: string
  bundle_checksum: string
  bundle_size_mb?: number
  manifest?: Record<string, any>
  release_notes?: string
  is_mandatory: boolean
  rollout_pct: number
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  version: string
  url: string
  mandatory: boolean
  notes?: string
  checksum: string
  sizeMb?: number
}

export interface DeviceState {
  deviceId: string
  currentVersion: string
  pendingVersion?: string
  lastSuccessfulVersion: string
  updateStatus: 'idle' | 'downloading' | 'installing' | 'rebooting' | 'failed'
  bootCount: number
  consecutiveFailures: number
  last_install_at?: string
}

export interface UpdateEvent {
  event_type: string
  device_id: string
  platform: string
  previous_version?: string
  target_version?: string
  error_message?: string
  metadata?: Record<string, any>
}
