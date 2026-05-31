/**
 * Notification Deduplication Engine
 *
 * Prevents duplicate notifications via:
 * 1. Event ID tracking in localStorage (persisted across sessions)
 * 2. In-memory bloom-filter-style Set for runtime speed
 * 3. Automatic cleanup of old entries (> 7 days)
 * 4. Debounce buffer for rapid-fire events
 */

import type { NotificationLogEntry } from "./types"

const STORAGE_KEY = "turf_notification_log"
const MAX_ENTRIES = 500
const ENTRY_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const DEBOUNCE_MS = 3_000

/** In-memory fast-check set */
const memorySet = new Set<string>()

/** Debounce buffer: eventId -> timeout handle */
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>()

function readLog(): Record<string, NotificationLogEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeLog(log: Record<string, NotificationLogEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage full — prune aggressively
    const keys = Object.keys(log)
    if (keys.length > 100) {
      const sorted = keys
        .map(k => ({ key: k, ts: log[k].receivedAt }))
        .sort((a, b) => a.ts - b.ts)
      const toDelete = sorted.slice(0, keys.length - 100)
      for (const { key } of toDelete) delete log[key]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
    }
  }
}

function cleanupOldEntries(log: Record<string, NotificationLogEntry>) {
  const now = Date.now()
  const cutoff = now - ENTRY_TTL_MS
  let changed = false
  for (const [id, entry] of Object.entries(log)) {
    if (entry.receivedAt < cutoff) {
      delete log[id]
      memorySet.delete(id)
      changed = true
    }
  }
  if (changed) writeLog(log)
}

/** Check if an event has already been seen */
export function isDuplicate(eventId: string): boolean {
  // Fast path: in-memory
  if (memorySet.has(eventId)) return true

  // Slow path: persisted log
  const log = readLog()
  if (log[eventId]) {
    memorySet.add(eventId)
    return true
  }
  return false
}

/** Mark an event as received (call BEFORE displaying) */
export function markReceived(eventId: string): void {
  memorySet.add(eventId)
  const log = readLog()
  log[eventId] = {
    eventId,
    receivedAt: Date.now(),
    displayed: false,
    tapped: false,
  }

  // Keep size bounded
  const keys = Object.keys(log)
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys
      .map(k => ({ key: k, ts: log[k].receivedAt }))
      .sort((a, b) => a.ts - b.ts)
    const toDelete = sorted.slice(0, keys.length - MAX_ENTRIES)
    for (const { key } of toDelete) delete log[key]
  }

  writeLog(log)
}

/** Mark an event as displayed on the tray */
export function markDisplayed(eventId: string): void {
  const log = readLog()
  if (log[eventId]) {
    log[eventId].displayed = true
    writeLog(log)
  }
}

/** Mark an event as tapped by user */
export function markTapped(eventId: string): void {
  const log = readLog()
  if (log[eventId]) {
    log[eventId].tapped = true
    writeLog(log)
  }
}

/**
 * Debounce rapid duplicate events.
 * Returns true if this event should be processed now,
 * false if it's being debounced (a previous identical event is still pending).
 */
export function debounceEvent(eventId: string): boolean {
  if (debounceMap.has(eventId)) {
    // Reset the debounce timer
    clearTimeout(debounceMap.get(eventId)!)
    debounceMap.set(
      eventId,
      setTimeout(() => debounceMap.delete(eventId), DEBOUNCE_MS)
    )
    return false // Don't process — still debouncing
  }

  debounceMap.set(
    eventId,
    setTimeout(() => debounceMap.delete(eventId), DEBOUNCE_MS)
  )
  return true
}

/** Run periodic cleanup (call once on app startup) */
export function runDedupCleanup(): void {
  const log = readLog()
  cleanupOldEntries(log)
}

/** Analytics: get stats for debugging */
export function getDedupStats(): {
  totalTracked: number
  displayed: number
  tapped: number
} {
  const log = readLog()
  const entries = Object.values(log)
  return {
    totalTracked: entries.length,
    displayed: entries.filter(e => e.displayed).length,
    tapped: entries.filter(e => e.tapped).length,
  }
}
