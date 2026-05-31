/**
 * Semantic version comparison and validation utilities.
 */

export function parseVersion(v: string): [number, number, number, number] {
  const [core, pre] = v.split('-')
  const parts = core.split('.').map(Number)
  const major = parts[0] || 0
  const minor = parts[1] || 0
  const patch = parts[2] || 0
  const preRelease = pre ? -1 : 0
  return [major, minor, patch, preRelease]
}

export function compareVersions(a: string, b: string): number {
  const [ma, mia, pa, pra] = parseVersion(a)
  const [mb, mib, pb, prb] = parseVersion(b)
  if (ma !== mb) return ma - mb
  if (mia !== mib) return mia - mib
  if (pa !== pb) return pa - pb
  return pra - prb
}

export function isNewer(current: string, target: string): boolean {
  return compareVersions(target, current) > 0
}

export function isCompatible(currentNative: string, minNative: string): boolean {
  return compareVersions(currentNative, minNative) >= 0
}

export function isValidVersion(v: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(v)
}

export function getDeviceRolloutBucket(deviceId: string): number {
  let hash = 0
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 100
}

export function shouldReceiveRollout(deviceId: string, pct: number): boolean {
  return getDeviceRolloutBucket(deviceId) < pct
}
