export enum TrendDirection {
  UNKNOWN = 0,
  FALLING_FAST = 1,
  FALLING = 2,
  STABLE = 3,
  RISING = 4,
  RISING_FAST = 5,
}

export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export type DataSourceType = 'libre-link-up' | 'nightscout'

export interface GlucoseReading {
  value: number
  trend: TrendDirection
  timestamp: Date
  source: DataSourceType
}

export interface AlarmThresholds {
  urgentHigh: number
  high: number
  low: number
  urgentLow: number
}

export interface StaleDataConfig {
  warningMinutes: number
  urgentMinutes: number
}

export type GlucoseZone = 'urgentLow' | 'low' | 'inRange' | 'high' | 'urgentHigh' | 'stale'

export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  urgentHigh: 250,
  high: 180,
  low: 70,
  urgentLow: 55,
}

export const DEFAULT_STALE_DATA_CONFIG: StaleDataConfig = {
  warningMinutes: 15,
  urgentMinutes: 30,
}

export const MGDL_PER_MMOL = 18.0182
export const MGDL_TO_MMOL = 1 / MGDL_PER_MMOL

export const TREND_ARROWS: Record<TrendDirection, string> = {
  [TrendDirection.UNKNOWN]: '?',
  [TrendDirection.FALLING_FAST]: '\u2193',
  [TrendDirection.FALLING]: '\u2198',
  [TrendDirection.STABLE]: '\u2192',
  [TrendDirection.RISING]: '\u2197',
  [TrendDirection.RISING_FAST]: '\u2191',
}

export function mapLibreTrendArrow(trendArrow: number): TrendDirection {
  if (trendArrow >= TrendDirection.FALLING_FAST && trendArrow <= TrendDirection.RISING_FAST) {
    return trendArrow as TrendDirection
  }
  return TrendDirection.UNKNOWN
}

export const ZONE_COLORS: Record<GlucoseZone, string> = {
  urgentLow: '#dc2626',
  low: '#f97316',
  inRange: '#16a34a',
  high: '#eab308',
  urgentHigh: '#dc2626',
  stale: '#6b7280',
}

export function toMmolL(mgdl: number): number {
  return mgdl * MGDL_TO_MMOL
}

export function toMgDl(mmolL: number): number {
  return mmolL * MGDL_PER_MMOL
}

export function toDisplayValue(mgdl: number, unit: GlucoseUnit): string {
  if (unit === 'mmol/L') {
    return toMmolL(mgdl).toFixed(1)
  }
  return Math.round(mgdl).toString()
}

export function fromDisplayValue(display: string, unit: GlucoseUnit): number {
  const parsed = Number.parseFloat(display)
  if (Number.isNaN(parsed)) return 0
  return unit === 'mmol/L' ? Math.round(toMgDl(parsed)) : Math.round(parsed)
}

export function calculateCalibrationOffset(meterValueMgdl: number, sensorValueMgdl: number): number {
  return meterValueMgdl - sensorValueMgdl
}

export function applyCalibrationOffset(sensorValueMgdl: number, offsetMgdl: number): number {
  if (offsetMgdl === 0) return sensorValueMgdl
  return Math.max(0, sensorValueMgdl + offsetMgdl)
}

export function classifyZone(value: number, thresholds: AlarmThresholds): GlucoseZone {
  if (value <= thresholds.urgentLow) return 'urgentLow'
  if (value <= thresholds.low) return 'low'
  if (value >= thresholds.urgentHigh) return 'urgentHigh'
  if (value >= thresholds.high) return 'high'
  return 'inRange'
}
