import { toDisplayValue, type GlucoseAlarmEvent, type GlucoseUnit } from '@glucodesk/shared-core'

type ExpoNotifications = typeof import('expo-notifications')

let notificationsModulePromise: Promise<ExpoNotifications> | null = null

async function getNotifications(): Promise<ExpoNotifications> {
  notificationsModulePromise ??= import('expo-notifications').then((notifications) => {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    return notifications
  })

  return notificationsModulePromise
}

const TITLES: Record<GlucoseAlarmEvent['type'], string> = {
  urgentHigh: 'Urgent high glucose',
  high: 'High glucose',
  low: 'Low glucose',
  urgentLow: 'Urgent low glucose',
  stale: 'Glucose data is stale',
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications()
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function showAlarmNotification(event: GlucoseAlarmEvent, unit: GlucoseUnit): Promise<void> {
  const granted = await ensureNotificationPermissions()
  if (!granted) return

  const Notifications = await getNotifications()
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
