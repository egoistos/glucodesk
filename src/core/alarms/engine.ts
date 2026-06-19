import log from 'electron-log'
import {
  evaluateGlucoseAlarm,
  type AlarmSnoozeState,
  type GlucoseReading,
  type GlucoseZone,
} from '@glucodesk/shared-core'
import { getSettings } from '../store/settings'
import { playAlarmSound, stopAlarmSound } from './sound'
import { setNotificationClickCallback, showAlarmNotification } from './notification'
import type { AlarmEvent } from '../../preload/ipc-types'

// ============================================================
// Alarm engine: desktop adapter around pure shared-core evaluation.
// ============================================================

interface AlarmState {
  activeZone: GlucoseZone | null
  snoozes: Map<string, AlarmSnoozeState>
  lastFiredZone: GlucoseZone | null
}

const state: AlarmState = {
  activeZone: null,
  snoozes: new Map(),
  lastFiredZone: null,
}

const DEFAULT_SNOOZE_MINUTES = 15

let broadcastCallback: ((event: AlarmEvent) => void) | null = null

setNotificationClickCallback(() => snoozeAlarm())

export function setAlarmBroadcastCallback(cb: (event: AlarmEvent) => void): void {
  broadcastCallback = cb
}

export function evaluateReading(reading: GlucoseReading): AlarmEvent | null {
  const settings = getSettings()
  const result = evaluateGlucoseAlarm(reading, {
    thresholds: settings.alarmThresholds,
    staleDataConfig: settings.staleDataConfig,
    lastFiredZone: state.lastFiredZone,
    snoozes: state.snoozes,
  })

  for (const zone of result.expiredSnoozeZones) {
    state.snoozes.delete(zone)
    log.info(`[Alarm] Snooze expired for ${zone}`)
  }

  if (result.shouldClearActiveAlarm && state.activeZone) {
    log.info(`[Alarm] Back in range, clearing alarm (was: ${state.activeZone})`)
    stopAlarmSound()
    state.activeZone = null
    state.lastFiredZone = null
    return null
  }

  if (result.reason === 'snoozed') {
    log.debug(`[Alarm] Zone ${result.zone} is snoozed, skipping`)
    return null
  }

  if (!result.event) return null

  return fireAlarm(result.event.type, reading, settings)
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

  if (settings.alarmSoundEnabled) {
    const isUrgent = type === 'urgentLow' || type === 'urgentHigh'
    playAlarmSound(isUrgent)
  }

  if (settings.alarmNotificationsEnabled) {
    showAlarmNotification(event)
  }

  if (broadcastCallback) {
    broadcastCallback(event)
  }

  return event
}

export function snoozeAlarm(minutes?: number): void {
  const duration = minutes ?? DEFAULT_SNOOZE_MINUTES
  const zone = state.activeZone

  if (!zone) {
    log.warn('[Alarm] Nothing to snooze; no active alarm')
    return
  }

  state.snoozes.set(zone, {
    zone,
    expiresAt: Date.now() + duration * 60_000,
  })

  stopAlarmSound()
  log.info(`[Alarm] Snoozed ${zone} for ${duration} minutes`)
}

export function clearAlarms(): void {
  state.activeZone = null
  state.lastFiredZone = null
  state.snoozes.clear()
  stopAlarmSound()
  log.info('[Alarm] All alarms cleared')
}
