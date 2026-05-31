/**
 * Network Monitor — detects internet readiness for Capacitor cold-starts.
 *
 * Problem: On Android cold-start, the WebView may render before the OS
 * has established full network connectivity. DNS may not resolve yet.
 * This causes fetch() to silently fail or hang.
 *
 * Solution: A probing system that checks real connectivity before
 * allowing data fetching to proceed.
 */

import { startupLog, PerfMarker } from './startup-logger'

let _networkReady = false
let _networkPromise: Promise<boolean> | null = null

const PROBE_URLS = [
  'https://www.google.com/generate_204',
  'https://httpbin.org/get',
]

async function probeConnectivity(timeoutMs = 5000): Promise<boolean> {
  const perf = new PerfMarker('network-probe')
  for (const url of PROBE_URLS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      startupLog.info('Network', `Probe success: ${url}`, { status: res.status })
      perf.end({ success: true, url })
      return true
    } catch (err: any) {
      startupLog.warn('Network', `Probe failed: ${url}`, { message: err?.message })
    }
  }
  perf.end({ success: false })
  return false
}

/**
 * Waits for the device to have real internet connectivity.
 * On web this resolves immediately. On Capacitor it probes.
 */
export async function waitForNetwork(): Promise<boolean> {
  if (_networkReady) return true
  if (_networkPromise) return _networkPromise

  _networkPromise = (async () => {
    startupLog.info('Network', 'Checking connectivity...')

    // First: check navigator.onLine (quick, but not always accurate in WebView)
    const online = typeof navigator !== 'undefined' && navigator.onLine
    startupLog.info('Network', `navigator.onLine = ${online}`)

    if (!online) {
      // Wait for online event (up to 10s)
      const becameOnline = await new Promise<boolean>((resolve) => {
        const cleanup = () => {
          window.removeEventListener('online', onOnline)
          window.removeEventListener('offline', onOffline)
          clearTimeout(timeout)
        }
        const onOnline = () => {
          cleanup()
          resolve(true)
        }
        const onOffline = () => {
          // stay waiting
        }
        const timeout = setTimeout(() => {
          cleanup()
          resolve(false)
        }, 10_000)

        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
      })

      if (!becameOnline) {
        startupLog.warn('Network', 'Device appears offline. Allowing fetch anyway (will fail gracefully).')
        _networkReady = true
        return true // allow fetch attempts; they'll fail with retry
      }
    }

    // Second: actual probe to verify DNS + HTTP stack is ready
    const connected = await probeConnectivity(5000)
    _networkReady = true
    return connected
  })()

  return _networkPromise
}

export function isNetworkReady(): boolean {
  return _networkReady
}

/**
 * Capacitor-safe network retry wrapper.
 * Retries with exponential backoff on network errors.
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    maxRetries?: number
    baseDelayMs?: number
    label?: string
  }
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, label = 'fetch' } = opts ?? {}

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes('fetch') ||
        err?.message?.includes('network') ||
        err?.message?.includes('offline') ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ETIMEDOUT' ||
        err instanceof TypeError // fetch TypeError = network failure

      if (!isNetworkError || attempt === maxRetries) throw err

      const delay = baseDelayMs * Math.pow(2, attempt)
      startupLog.warn('Network', `[${label}] Network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`, {
        error: err?.message,
      })
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error(`[${label}] exhausted all retries`)
}

// Listen for app resume to re-check network
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    startupLog.info('Network', 'Browser online event fired')
    _networkReady = true
  })
  window.addEventListener('offline', () => {
    startupLog.warn('Network', 'Browser offline event fired')
    _networkReady = false
    _networkPromise = null
  })
}
