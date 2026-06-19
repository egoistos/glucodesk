// ============================================================
// IPC channel definitions — typed contracts between main/renderer
// ============================================================

import type { GlucoseReading, AlarmThresholds, StaleDataConfig, GlucoseUnit } from '../renderer/shared/types'

// ---- Channel names ----

export const IPC_CHANNELS = {
  // Renderer → Main (invoke)
  GET_GLUCOSE: 'glucose:get',
  GET_HISTORY: 'glucose:history',
  CONNECT_LLU: 'llu:connect',
  DISCONNECT_LLU: 'llu:disconnect',
  TEST_CONNECTION: 'llu:test',
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',
  SHOW_SETTINGS: 'window:show-settings',
  SHOW_WIDGET: 'window:show-widget',
  HIDE_WIDGET: 'window:hide-widget',
  SET_AUTOSTART: 'system:autostart',
  GET_APP_VERSION: 'app:version',
  EXPORT_LOGS: 'system:export-logs',
  SNOOZE_ALARM: 'alarm:snooze',
  CALIBRATE: 'calibration:set',
  RESET_CALIBRATION: 'calibration:reset',
  GET_CALIBRATION: 'calibration:get',

  // Main → Renderer (on)
  GLUCOSE_UPDATE: 'glucose:update',
  CONNECTION_STATUS: 'connection:status',
  ALARM_TRIGGERED: 'alarm:triggered',
  SETTINGS_CHANGED: 'settings:changed',
  ERROR_OCCURRED: 'error:occurred',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// ---- Request / Response types ----

export interface LluConnectRequest {
  email: string
  password: string
  region?: string
  clientVersion?: string
}

export interface LluConnectResponse {
  success: boolean
  region?: string
  patientCount?: number
  error?: string
  requiresAction?: 'tou' | 'pp' | 'verifyEmail'
}

export interface AppSettings {
  // Connection
  lluEmail: string
  lluPasswordEncrypted: string
  lluRegion: string
  lluClientVersion: string
  lluPollingIntervalSec: number
  lluSelectedPatientId: string | null

  // Alarms
  alarmThresholds: AlarmThresholds
  staleDataConfig: StaleDataConfig
  alarmSoundEnabled: boolean
  alarmNotificationsEnabled: boolean

  // Display
  glucoseUnit: GlucoseUnit
  widgetSize: 'compact' | 'normal' | 'large'
  widgetClickThrough: boolean
  widgetPosition: { x: number; y: number } | null

  // General
  autostart: boolean
  language: 'ru' | 'en'
}

export type PartialAppSettings = Partial<AppSettings>

export interface ConnectionStatus {
  connected: boolean
  lastReadingTime: Date | null
  isStale: boolean
  error: string | null
  region: string | null
}

export interface AlarmEvent {
  type: 'urgentHigh' | 'high' | 'low' | 'urgentLow' | 'stale'
  value: number
  timestamp: Date
}
