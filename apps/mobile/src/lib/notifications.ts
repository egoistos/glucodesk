import * as Notifications from 'expo-notifications'
import { toDisplayValue, type GlucoseAlarmEvent, type GlucoseUnit } from '@glucodesk/shared-core'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const TITLES: Record<GlucoseAlarmEvent['type'], string> = {
  urgentHigh: 'Urgent high glucose',
  high: 'High glucose',
  low: 'Low glucose',
  urgentLow: 'Urgent low glucose',
  stale: 'Glucose data is stale',
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function showAlarmNotification(event: GlucoseAlarmEvent, unit: GlucoseUnit): Promise<void> {
  const granted = await ensureNotificationPermissions()
  if (!granted) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: TITLES[event.type],
      body: event.type === 'stale'
        ? 'No recent LibreLinkUp reading has been received.'
        : `Current value: ${toDisplayValue(event.value, unit)} ${unit}`,
      sound: true,
    },
    trigger: null,
  })
}
