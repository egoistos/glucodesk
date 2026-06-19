import log from 'electron-log'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { AppSettings } from '../../preload/ipc-types'

// ============================================================
// Settings store — persists all app config via electron-store
// Passwords encrypted with Electron safeStorage (DPAPI on Win)
// ============================================================

const DEFAULT_SETTINGS: AppSettings = {
  lluEmail: '',
  lluPasswordEncrypted: '',
  lluRegion: 'ru',
  lluClientVersion: '4.17.0',
  lluPollingIntervalSec: 60,
  lluSelectedPatientId: null,

  alarmThresholds: {
    urgentHigh: 250,
    high: 180,
    low: 70,
    urgentLow: 55,
  },

  staleDataConfig: {
    warningMinutes: 15,
    urgentMinutes: 30,
  },

  alarmSoundEnabled: true,
  alarmNotificationsEnabled: true,

  glucoseUnit: 'mg/dL',
  widgetSize: 'normal',
  widgetClickThrough: false,
  widgetPosition: null,

  autostart: false,
  language: 'ru',
}

// Schema for electron-store validation
const schema = {
  lluEmail: { type: 'string', default: '' },
  lluPasswordEncrypted: { type: 'string', default: '' },
  lluRegion: { type: 'string', default: 'ru' },
  lluClientVersion: { type: 'string', default: '4.17.0' },
  lluPollingIntervalSec: { type: 'number', default: 60, minimum: 60 },
  lluSelectedPatientId: { type: ['string', 'null'], default: null },
  alarmThresholds: {
    type: 'object',
    properties: {
      urgentHigh: { type: 'number', default: 250 },
      high: { type: 'number', default: 180 },
      low: { type: 'number', default: 70 },
      urgentLow: { type: 'number', default: 55 },
    },
    default: DEFAULT_SETTINGS.alarmThresholds,
  },
  staleDataConfig: {
    type: 'object',
    properties: {
      warningMinutes: { type: 'number', default: 15 },
      urgentMinutes: { type: 'number', default: 30 },
    },
    default: DEFAULT_SETTINGS.staleDataConfig,
  },
  alarmSoundEnabled: { type: 'boolean', default: true },
  alarmNotificationsEnabled: { type: 'boolean', default: true },
  glucoseUnit: { type: 'string', enum: ['mg/dL', 'mmol/L'], default: 'mg/dL' },
  widgetSize: { type: 'string', enum: ['compact', 'normal', 'large'], default: 'normal' },
  widgetClickThrough: { type: 'boolean', default: false },
  widgetPosition: { type: ['object', 'null'], default: null },
  autostart: { type: 'boolean', default: false },
  language: { type: 'string', enum: ['ru', 'en'], default: 'ru' },
} as const

const store = new Store<AppSettings>({
  name: 'glucodesk-settings',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: schema as any,
  defaults: DEFAULT_SETTINGS,
})

// ---- Public API ----

export function getSettings(): AppSettings {
  return store.store
}

export function updateSettings(partial: Partial<AppSettings>): void {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key as keyof AppSettings, value)
  }
}

// ---- Password encryption helpers ----

export function encryptPassword(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: base64 (not secure, but won't crash on unsupported systems)
    return Buffer.from(plaintext).toString('base64')
  }
  return safeStorage.encryptString(plaintext).toString('base64')
}

export function decryptPassword(encrypted: string): string {
  if (!encrypted) return ''
  try {
    const encAvailable = safeStorage.isEncryptionAvailable()
    log.info(`[Settings] safeStorage available: ${encAvailable}, encrypted length: ${encrypted.length}`)

    if (!encAvailable) {
      // Fallback: base64
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    }

    // Try safeStorage first
    try {
      const result = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      if (result) return result
      log.warn('[Settings] safeStorage returned empty, trying base64 fallback')
    } catch (e) {
      log.warn(`[Settings] safeStorage decrypt failed: ${String(e)}, trying base64 fallback`)
    }

    // Fallback: maybe it was stored as base64 (from previous session without safeStorage)
    const b64 = Buffer.from(encrypted, 'base64').toString('utf-8')
    return b64
  } catch (e) {
    log.error(`[Settings] decryptPassword failed: ${String(e)}`)
    return ''
  }
}

export function savePassword(plaintext: string): void {
  store.set('lluPasswordEncrypted', encryptPassword(plaintext))
}

export function loadPassword(): string {
  const encrypted = store.get('lluPasswordEncrypted', '')
  return decryptPassword(encrypted)
}
