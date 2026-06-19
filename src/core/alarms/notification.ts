import { Notification } from 'electron'
import log from 'electron-log'
import type { AlarmEvent } from '../../preload/ipc-types'
import { toDisplayValue } from '@glucodesk/shared-core'
import { getSettings } from '../store/settings'

// ============================================================
// Alarm notifications — Windows toast via Electron Notification
// ============================================================

const ALARM_TITLES: Record<AlarmEvent['type'], string> = {
  urgentHigh: '🔴 URGENT HIGH',
  high: '🟡 High Glucose',
  low: '🟠 Low Glucose',
  urgentLow: '🔴 URGENT LOW',
  stale: '⚠️ Stale Data',
}

const ALARM_DESCRIPTIONS: Record<AlarmEvent['type'], string> = {
  urgentHigh: 'Blood glucose is critically high!',
  high: 'Blood glucose is above target range.',
  low: 'Blood glucose is below target range.',
  urgentLow: 'Blood glucose is critically low!',
  stale: 'No recent glucose data received.',
}

let notificationClickCallback: (() => void) | null = null

export function setNotificationClickCallback(callback: () => void): void {
  notificationClickCallback = callback
}

export function showAlarmNotification(event: AlarmEvent): void {
  if (!Notification.isSupported()) {
    log.warn('[Notification] Not supported on this system')
    return
  }

  const settings = getSettings()
  const unit = settings.glucoseUnit
  const displayValue = event.type === 'stale'
    ? '--'
    : toDisplayValue(event.value, unit)

  const title = ALARM_TITLES[event.type]
  const body = event.type === 'stale'
    ? ALARM_DESCRIPTIONS[event.type]
    : `${displayValue} ${unit} — ${ALARM_DESCRIPTIONS[event.type]}`

  const notification = new Notification({
    title,
    body,
    urgency: event.type === 'urgentLow' || event.type === 'urgentHigh' ? 'critical' : 'normal',
    silent: true, // We handle sound ourselves
    timeoutType: event.type === 'urgentLow' || event.type === 'urgentHigh' ? 'never' : 'default',
  })

  notification.on('click', () => {
    log.info('[Notification] Clicked — snoozing alarm')
    notificationClickCallback?.()
  })

  notification.show()
  log.info(`[Notification] Shown: ${title} — ${body}`)
}
