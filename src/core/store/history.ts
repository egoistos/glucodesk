import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import log from 'electron-log'
import { TrendDirection, type GlucoseReading } from '@glucodesk/shared-core'

// ============================================================
// History store — SQLite via better-sqlite3
// Stores glucose readings for history/dashboard features
// ============================================================

let db: Database.Database | null = null

interface ReadingRow {
  id: number
  value: number
  trend: number
  timestamp: number // Unix ms
  source: string
}

export function initHistoryDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'glucodesk-history.db')
  log.info(`[History] Opening SQLite at ${dbPath}`)

  db = new Database(dbPath)

  // Enable WAL for better concurrent read performance
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      value     REAL    NOT NULL,
      trend     INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      source    TEXT    NOT NULL DEFAULT 'libre-link-up',
      UNIQUE(timestamp, source)
    );
    CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);
  `)

  log.info('[History] DB initialized')
}

export function saveReading(reading: GlucoseReading): void {
  if (!db) return
  try {
    db.prepare(`
      INSERT OR IGNORE INTO readings (value, trend, timestamp, source)
      VALUES (?, ?, ?, ?)
    `).run(
      reading.value,
      reading.trend,
      reading.timestamp.getTime(),
      reading.source,
    )
  } catch (err) {
    log.error('[History] Failed to save reading:', err)
  }
}

export function getHistory(hours: number): GlucoseReading[] {
  if (!db) return []
  const since = Date.now() - hours * 60 * 60 * 1000
  const rows = db.prepare(`
    SELECT * FROM readings
    WHERE timestamp > ?
    ORDER BY timestamp ASC
  `).all(since) as ReadingRow[]

  return rows.map(rowToReading)
}

export function getLatestReading(): GlucoseReading | null {
  if (!db) return null
  const row = db.prepare(`
    SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1
  `).get() as ReadingRow | undefined

  return row ? rowToReading(row) : null
}

export function cleanOldReadings(keepDays = 30): void {
  if (!db) return
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
  const result = db.prepare('DELETE FROM readings WHERE timestamp < ?').run(cutoff)
  log.info(`[History] Cleaned ${result.changes} old readings`)
}

function rowToReading(row: ReadingRow): GlucoseReading {
  return {
    value: row.value,
    trend: row.trend as TrendDirection,
    timestamp: new Date(row.timestamp),
    source: row.source as GlucoseReading['source'],
  }
}

export function closeHistoryDb(): void {
  db?.close()
  db = null
}
