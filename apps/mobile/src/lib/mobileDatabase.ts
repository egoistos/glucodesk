import * as SQLite from 'expo-sqlite'
import { TrendDirection, type GlucoseReading } from '@glucodesk/shared-core'
import { DEFAULT_MOBILE_SETTINGS, type MobileSettings } from '../types'

const DATABASE_NAME = 'glucodesk.db'
const SETTINGS_KEY = 'mobile-settings'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

interface ReadingRow {
  value: number
  trend: number
  timestamp: number
  source: GlucoseReading['source']
}

interface SettingsRow {
  value: string
}

export async function initMobileDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value REAL NOT NULL,
          trend INTEGER NOT NULL DEFAULT 0,
          timestamp INTEGER NOT NULL,
          source TEXT NOT NULL DEFAULT 'libre-link-up',
          UNIQUE(timestamp, source)
        );
        CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `)
      return db
    })
  }

  return dbPromise
}

export async function loadMobileSettings(): Promise<MobileSettings> {
  const db = await initMobileDatabase()
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT value FROM app_settings WHERE key = ?',
    SETTINGS_KEY,
  )
  if (!row) return DEFAULT_MOBILE_SETTINGS

  try {
    return {
      ...DEFAULT_MOBILE_SETTINGS,
      ...(JSON.parse(row.value) as Partial<MobileSettings>),
    }
  } catch {
    return DEFAULT_MOBILE_SETTINGS
  }
}

export async function saveMobileSettings(settings: MobileSettings): Promise<void> {
  const db = await initMobileDatabase()
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    SETTINGS_KEY,
    JSON.stringify(settings),
  )
}

export async function saveReading(reading: GlucoseReading): Promise<void> {
  const db = await initMobileDatabase()
  await db.runAsync(
    `INSERT OR IGNORE INTO readings (value, trend, timestamp, source)
     VALUES (?, ?, ?, ?)`,
    reading.value,
    reading.trend,
    reading.timestamp.getTime(),
    reading.source,
  )
}

export async function saveReadings(readings: GlucoseReading[]): Promise<void> {
  for (const reading of readings) {
    await saveReading(reading)
  }
}

export async function getHistory(hours: number): Promise<GlucoseReading[]> {
  const db = await initMobileDatabase()
  const since = Date.now() - hours * 60 * 60 * 1000
  const rows = await db.getAllAsync<ReadingRow>(
    `SELECT value, trend, timestamp, source
     FROM readings
     WHERE timestamp > ?
     ORDER BY timestamp ASC`,
    since,
  )
  return rows.map(rowToReading)
}

export async function getLatestReading(): Promise<GlucoseReading | null> {
  const db = await initMobileDatabase()
  const row = await db.getFirstAsync<ReadingRow>(
    `SELECT value, trend, timestamp, source
     FROM readings
     ORDER BY timestamp DESC
     LIMIT 1`,
  )
  return row ? rowToReading(row) : null
}

export async function cleanOldReadings(keepDays = 30): Promise<void> {
  const db = await initMobileDatabase()
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
  await db.runAsync('DELETE FROM readings WHERE timestamp < ?', cutoff)
}

function rowToReading(row: ReadingRow): GlucoseReading {
  return {
    value: row.value,
    trend: row.trend as TrendDirection,
    timestamp: new Date(row.timestamp),
    source: row.source,
  }
}
