import {
  DEFAULT_ALARM_THRESHOLDS,
  DEFAULT_STALE_DATA_CONFIG,
  type AlarmThresholds,
  type GlucoseUnit,
  type StaleDataConfig,
} from '@glucodesk/shared-core'

export type MobileTab = 'current' | 'history' | 'settings' | 'connection'

export interface MobileSettings {
  glucoseUnit: GlucoseUnit
  lluRegion: string
  lluClientVersion: string
  lluPollingIntervalSec: number
  lluSelectedPatientId: string | null
  alarmThresholds: AlarmThresholds
  staleDataConfig: StaleDataConfig
  alarmNotificationsEnabled: boolean
  appleHealthSyncEnabled: boolean
  appleHealthLastSyncedAt: number | null
  liveActivityEnabled: boolean
}

export interface LluSession {
  email: string
  password: string
  token: string
  expires: number
  region: string
  baseUrl: string
  accountId: string | null
  clientVersion: string
}

export interface UiStatus {
  tone: 'idle' | 'ok' | 'warning' | 'error'
  message: string
}

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  glucoseUnit: 'mg/dL',
  lluRegion: 'ru',
  lluClientVersion: '4.17.0',
  lluPollingIntervalSec: 60,
  lluSelectedPatientId: null,
  alarmThresholds: { ...DEFAULT_ALARM_THRESHOLDS },
  staleDataConfig: { ...DEFAULT_STALE_DATA_CONFIG },
  alarmNotificationsEnabled: true,
  appleHealthSyncEnabled: false,
  appleHealthLastSyncedAt: null,
  liveActivityEnabled: false,
}
