import log from 'electron-log'
import { getSettings } from '../store/settings'

// ============================================================
// Polling scheduler with exponential backoff on errors
// ============================================================

type PollCallback = () => Promise<void>

interface SchedulerState {
  timer: ReturnType<typeof setTimeout> | null
  consecutiveErrors: number
  isRunning: boolean
  isPaused: boolean
}

const state: SchedulerState = {
  timer: null,
  consecutiveErrors: 0,
  isRunning: false,
  isPaused: false,
}

const MAX_BACKOFF_MS = 5 * 60 * 1000  // 5 minutes max
const MIN_INTERVAL_MS = 60 * 1000     // 60s minimum (Cloudflare rate limit mitigation)

let pollCallback: PollCallback | null = null

export function startPolling(callback: PollCallback): void {
  if (state.isRunning) {
    log.warn('[Scheduler] Already running, ignoring start')
    return
  }

  pollCallback = callback
  state.isRunning = true
  state.consecutiveErrors = 0

  log.info('[Scheduler] Starting polling')
  scheduleNext(0) // Immediate first poll
}

export function stopPolling(): void {
  if (state.timer) {
    clearTimeout(state.timer)
    state.timer = null
  }
  state.isRunning = false
  state.isPaused = false
  log.info('[Scheduler] Stopped')
}

export function pausePolling(): void {
  state.isPaused = true
  if (state.timer) {
    clearTimeout(state.timer)
    state.timer = null
  }
  log.info('[Scheduler] Paused')
}

export function resumePolling(): void {
  if (!state.isRunning) return
  state.isPaused = false
  log.info('[Scheduler] Resumed')
  scheduleNext(0)
}

export function resetBackoff(): void {
  state.consecutiveErrors = 0
}

function getIntervalMs(): number {
  const settings = getSettings()
  const baseMs = Math.max(settings.lluPollingIntervalSec * 1000, MIN_INTERVAL_MS)

  if (state.consecutiveErrors === 0) return baseMs

  // Exponential backoff: base * 2^errors, capped at MAX_BACKOFF_MS
  const backoff = Math.min(baseMs * Math.pow(2, state.consecutiveErrors - 1), MAX_BACKOFF_MS)
  return backoff
}

function scheduleNext(delayMs?: number): void {
  if (!state.isRunning || state.isPaused) return

  const interval = delayMs ?? getIntervalMs()

  state.timer = setTimeout(() => {
    void executePoll()
  }, interval)
}

async function executePoll(): Promise<void> {
  if (!pollCallback || !state.isRunning || state.isPaused) return

  try {
    await pollCallback()
    state.consecutiveErrors = 0
  } catch (err) {
    state.consecutiveErrors++
    log.error(`[Scheduler] Poll failed (error #${state.consecutiveErrors}):`, err)
  }

  scheduleNext()
}
