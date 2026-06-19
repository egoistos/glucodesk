import { mapLibreTrendArrow, type GlucoseReading } from '@glucodesk/shared-core'
import type { LluGlucoseMeasurement, LluConnection } from './types'

// ============================================================
// Mapper: LLU API responses â†’ GlucoseReading domain objects
// ============================================================

/**
 * Maps a single LLU measurement to GlucoseReading
 */
export function mapMeasurement(m: LluGlucoseMeasurement): GlucoseReading {

  // Timestamp = patient local time, FactoryTimestamp = UTC. Use local for correct TimeAgo.
  const rawTime = m.Timestamp ?? m.FactoryTimestamp
  const timestamp = parseTimestamp(rawTime)

  return {
    value: m.ValueInMgPerDl ?? m.Value,
    trend: mapLibreTrendArrow(m.TrendArrow),
    timestamp,
    source: 'libre-link-up',
  }
}

/**
 * Maps graphData array from LLU connections response
 */
export function mapGraphData(measurements: LluGlucoseMeasurement[]): GlucoseReading[] {
  return measurements
    .map(mapMeasurement)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Gets the latest reading from a connection
 */
export function mapLatestFromConnection(connection: LluConnection): GlucoseReading {
  const m = connection.glucoseMeasurement ?? connection.glucoseItem
  return mapMeasurement(m)
}

/**
 * Calculates delta between last two readings in mg/dL
 * Returns null if history is too short
 */
export function calculateDelta(readings: GlucoseReading[]): number | null {
  if (readings.length < 2) return null
  const last = readings[readings.length - 1]
  const prev = readings[readings.length - 2]
  return last.value - prev.value
}

// ---- Internal helpers ----

/**
 * Parse LLU timestamp string.
 * LLU sends: "1/15/2025 10:30:00 AM" (US format) or ISO
 */
function parseTimestamp(raw: string): Date {
  if (!raw) return new Date()

  // Try ISO first
  const iso = new Date(raw)
  if (!isNaN(iso.getTime())) return iso

  // LLU US format: M/D/YYYY H:MM:SS AM/PM
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i)
  if (match) {
    const [, month, day, year, hourRaw, min, sec, ampm] = match
    let hour = parseInt(hourRaw, 10)
    if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0
    // LLU FactoryTimestamp is in patient's local time — parse as local
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hour,
      parseInt(min, 10),
      parseInt(sec, 10),
    )
  }

  // Fallback: try direct parse
  return new Date(raw)
}
