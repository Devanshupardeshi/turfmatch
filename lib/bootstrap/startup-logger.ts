/**
 * Production-safe startup logger for TurfMatch.
 * Logs initialization timeline, session state, fetch diagnostics,
 * and network conditions. Safe to leave in production builds.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: number
  level: LogLevel
  tag: string
  message: string
  data?: Record<string, unknown>
  elapsedMs?: number
}

const MAX_BUFFER = 200
const logs: LogEntry[] = []

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function push(level: LogLevel, tag: string, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    tag,
    message,
    data,
  }
  logs.push(entry)
  if (logs.length > MAX_BUFFER) logs.shift()

  // Console output (safe for Capacitor / Chrome DevTools)
  const prefix = `[BOOT] [${tag}] ${message}`
  if (level === 'error' || level === 'fatal') {
    // eslint-disable-next-line no-console
    console.error(prefix, data ?? '')
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(prefix, data ?? '')
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, data ?? '')
  }
}

export const startupLog = {
  debug: (tag: string, message: string, data?: Record<string, unknown>) => push('debug', tag, message, data),
  info: (tag: string, message: string, data?: Record<string, unknown>) => push('info', tag, message, data),
  warn: (tag: string, message: string, data?: Record<string, unknown>) => push('warn', tag, message, data),
  error: (tag: string, message: string, data?: Record<string, unknown>) => push('error', tag, message, data),
  fatal: (tag: string, message: string, data?: Record<string, unknown>) => push('fatal', tag, message, data),

  /** Returns the full buffered log history (for telemetry / bug reports) */
  getHistory(): LogEntry[] {
    return [...logs]
  },

  /** Returns logs as a JSON string suitable for sending to telemetry endpoint */
  exportJson(): string {
    return JSON.stringify({
      app: 'turf-match',
      exportedAt: new Date().toISOString(),
      logs: logs,
    })
  },
}

/** Simple performance marker for measuring init phases */
export class PerfMarker {
  private startTime: number
  private label: string

  constructor(label: string) {
    this.label = label
    this.startTime = now()
    startupLog.info('Perf', `Start: ${label}`)
  }

  end(extraData?: Record<string, unknown>) {
    const elapsed = Math.round(now() - this.startTime)
    startupLog.info('Perf', `End: ${this.label} (${elapsed}ms)`, { elapsedMs: elapsed, ...extraData })
    return elapsed
  }
}
