import log from 'electron-log'
import { classifyZone, type GlucoseReading, type GlucoseZone } from '@glucodesk/shared-core'
import { getSettings } from '../store/settings'
import { playAlarmSound, stopAlarmSound } from './sound'
import { setNotificationClickCallback, showAlarmNotification } from './notification'
import type { AlarmEvent } from '../../preload/ipc-types'

// ============================================================
// Alarm engine — evaluates readings against thresholds,
// fires sound + Windows notification, manages snooze state
// ============================================================

interface SnoozeState {
  /** Zone that is snoozed */
  zone: GlucoseZone
  /** Snooze expires at this timestamp */
  expiresAt: number
}

interface AlarmState {
  /** Currently active alarm zone (null = no alarm) */
  activeZone: GlucoseZone | null
  /** Snooze entries per zone */
  snoozes: Map<string, SnoozeState>
  /** Last zone to avoid re-firing same alarm */
  lastFiredZone: GlucoseZone | null
}

const state: AlarmState = {
  activeZone: null,
  snoozes: new Map(),
  lastFiredZone: null,
}

const DEFAULT_SNOOZE_MINUTES = 15

/** Zones that trigger alarms */
const ALARM_ZONES: GlucoseZone[] = ['urgentLow', 'low', 'high', 'urgentHigh']

/** Map zone to AlarmEvent type */
const ZONE_TO_EVENT_TYPE: Record<string, AlarmEvent['type']> = {
  urgentLow: 'urgentLow',
  low: 'low',
  high: 'high',
  urgentHigh: 'urgentHigh',
}

// Callback to broadcast alarm to renderer
let broadcastCallback: ((event: AlarmEvent) => void) | null = null

setNotificationClickCallback(() => snoozeAlarm())

export function setAlarmBroadcastCallback(cb: (event: AlarmEvent) => void): void {
  broadcastCallback = cb
}

/**
 * Evaluate a new reading against alarm thresholds.
 * Called from polling cycle after each new reading.
 */
export function evaluateReading(reading: GlucoseReading): AlarmEvent | null {
  const settings = getSettings()
  const thresholds = settings.alarmThresholds

  // Check stale data
  const staleMs = Date.now() - reading.timestamp.getTime()
  const staleMinutes = staleMs / 60_000
  if (staleMinutes >= settings.staleDataConfig.urgentMinutes) {
    return fireAlarm('stale', reading, settings)
  }

  const zone = classifyZone(reading.value, thresholds)

  // In range — clear active alarm
  if (!ALARM_ZONES.includes(zone)) {
    if (state.activeZone) {
      log.info(`[Alarm] Back in range, clearing alarm (was: ${state.activeZone})`)
      stopAlarmSound()
      state.activeZone = null
      state.lastFiredZone = null
    }
    return null
  }

  // Alarm zone — check snooze
  if (isSnoozed(zone)) {
    log.debug(`[Alarm] Zone ${zone} is snoozed, skipping`)
    return null
  }

  // Same zone as last fired — don't re-fire (already active)
  if (zone === state.lastFiredZone) {
    return null
  }

  // New alarm or zone changed
  return fireAlarm(ZONE_TO_EVENT_TYPE[zone] ?? 'high', reading, settings)
}

function fireAlarm(
  type: AlarmEvent['type'],
  reading: GlucoseReading,
  settings: ReturnType<typeof getSettings>,
): AlarmEvent {
  const event: AlarmEvent = {
    type,
    value: reading.value,
    timestamp: reading.timestamp,
  }

  state.activeZone = type === 'stale' ? 'stale' : (type as GlucoseZone)
  state.lastFiredZone = state.activeZone

  log.info(`[Alarm] FIRING: ${type}, value: ${reading.value} mg/dL`)

  // Play sound
  if (settings.alarmSoundEnabled) {
    const isUrgent = type === 'urgentLow' || type === 'urgentHigh'
    playAlarmSound(isUrgent)
  }

  // Windows notification
  if (settings.alarmNotificationsEnabled) {
    showAlarmNotification(event)
  }

  // Broadcast to renderer
  if (broadcastCallback) {
    broadcastCallback(event)
  }

  return event
}

/**
 * Snooze the current alarm for N minutes
 */
export function snoozeAlarm(minutes?: number): void {
  const duration = minutes ?? DEFAULT_SNOOZE_MINUTES
  const zone = state.activeZone

  if (!zone) {
    log.warn('[Alarm] Nothing to snooze — no active alarm')
    return
  }

  state.snoozes.set(zone, {
    zone,
    expiresAt: Date.now() + duration * 60_000,
  })

  stopAlarmSound()
  log.info(`[Alarm] Snoozed ${zone} for ${duration} minutes`)
}

/**
 * Check if a zone is currently snoozed
 */
function isSnoozed(zone: GlucoseZone): boolean {
  const snooze = state.snoozes.get(zone)
  if (!snooze) return false

  if (Date.now() >= snooze.expiresAt) {
    state.snoozes.delete(zone)
    log.info(`[Alarm] Snooze expired for ${zone}`)
    return false
  }

  return true
}

/**
 * Clear all alarms and snoozes (e.g. on disconnect)
 */
export function clearAlarms(): void {
  state.activeZone = null
  state.lastFiredZone = null
  state.snoozes.clear()
  stopAlarmSound()
  log.info('[Alarm] All alarms cleared')
}
