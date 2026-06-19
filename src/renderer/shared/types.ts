// ============================================================
// Core glucose domain types — shared between main and renderer
// ============================================================

export enum TrendDirection {
  UNKNOWN = 0,
  FALLING_FAST = 1, // ↓
  FALLING = 2,      // ↘
  STABLE = 3,       // →
  RISING = 4,       // ↗
  RISING_FAST = 5,  // ↑
}

export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export type DataSourceType = 'libre-link-up' | 'nightscout'

export interface GlucoseReading {
  value: number           // Always in mg/dL internally
  trend: TrendDirection
  timestamp: Date
  source: DataSourceType
}

export interface AlarmThresholds {
  urgentHigh: number // default: 250 mg/dL
  high: number       // default: 180 mg/dL
  low: number        // default: 70  mg/dL
  urgentLow: number  // default: 55  mg/dL
}

export interface StaleDataConfig {
  warningMinutes: number  // default: 15
  urgentMinutes: number   // default: 30
}

// ---- Trend arrow helpers ----

export const TREND_ARROWS: Record<TrendDirection, string> = {
  [TrendDirection.UNKNOWN]: '?',
  [TrendDirection.FALLING_FAST]: '↓',
  [TrendDirection.FALLING]: '↘',
  [TrendDirection.STABLE]: '→',
  [TrendDirection.RISING]: '↗',
  [TrendDirection.RISING_FAST]: '↑',
}

// ---- Unit conversion ----

const MGDL_TO_MMOL = 1 / 18.0182

export function toDisplayValue(mgdl: number, unit: GlucoseUnit): string {
  if (unit === 'mmol/L') {
    return (mgdl * MGDL_TO_MMOL).toFixed(1)
  }
  return Math.round(mgdl).toString()
}

// ---- Zone classification ----

export type GlucoseZone = 'urgentLow' | 'low' | 'inRange' | 'high' | 'urgentHigh' | 'stale'

export function classifyZone(value: number, thresholds: AlarmThresholds): GlucoseZone {
  if (value <= thresholds.urgentLow) return 'urgentLow'
  if (value <= thresholds.low) return 'low'
  if (value >= thresholds.urgentHigh) return 'urgentHigh'
  if (value >= thresholds.high) return 'high'
  return 'inRange'
}

export const ZONE_COLORS: Record<GlucoseZone, string> = {
  urgentLow: '#dc2626',
  low: '#f97316',
  inRange: '#16a34a',
  high: '#eab308',
  urgentHigh: '#dc2626',
  stale: '#6b7280',
}
