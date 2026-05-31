import { createClient } from '@supabase/supabase-js'
import type { UpdateEvent } from './types'

const supabaseUrl = 'https://ziwzynzwrjcwrllmlwsy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppd3p5bnp3cmpjd3JsbG1sd3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTMxNjQsImV4cCI6MjA5Mzk4OTE2NH0.oI-eaTYp8a6tT1hIyw9uXkGQtR4Kw93e5zhP2WWuOno'

const client = createClient(supabaseUrl, supabaseAnonKey)
const eventQueue: UpdateEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

export async function trackEvent(event: UpdateEvent) {
  eventQueue.push(event)
  scheduleFlush()
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushEvents()
  }, 3000)
}

async function flushEvents() {
  if (eventQueue.length === 0) return
  flushTimer = null

  const batch = eventQueue.splice(0, eventQueue.length)
  try {
    await client.from('update_events').insert(batch)
  } catch (e) {
    console.warn('[OTA Analytics] Failed to send events:', e)
    // Re-queue for retry
    eventQueue.unshift(...batch)
    setTimeout(flushEvents, 10000)
  }
}
