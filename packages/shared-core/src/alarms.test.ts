import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALARM_THRESHOLDS,
  DEFAULT_STALE_DATA_CONFIG,
  TrendDirection,
  evaluateGlucoseAlarm,
  type AlarmSnoozeState,
  type GlucoseReading,
} from './index'

describe('pure glucose alarm evaluation', () => {
  const nowMs = new Date('2025-01-15T10:30:00.000Z').getTime()

  it('returns no event for in-range readings and asks adapters to clear active alarms', () => {
    const result = evaluateGlucoseAlarm(reading(110, nowMs), {
      thresholds: DEFAULT_ALARM_THRESHOLDS,
      staleDataConfig: DEFAULT_STALE_DATA_CONFIG,
      nowMs,
      lastFiredZone: 'high',
    })

    expect(result.event).toBeNull()
    expect(result.zone).toBe('inRange')
    expect(result.shouldClearActiveAlarm).toBe(true)
  })

  it('fires urgent, low, high, and stale alarms', () => {
    expect(evaluateGlucoseAlarm(reading(54, nowMs), context(nowMs)).event?.type).toBe('urgentLow')
    expect(evaluateGlucoseAlarm(reading(70, nowMs), context(nowMs)).event?.type).toBe('low')
    expect(evaluateGlucoseAlarm(reading(180, nowMs), context(nowMs)).event?.type).toBe('high')
    expect(evaluateGlucoseAlarm(reading(260, nowMs), context(nowMs)).event?.type).toBe('urgentHigh')

    const staleReading = reading(110, nowMs - 31 * 60_000)
    expect(evaluateGlucoseAlarm(staleReading, context(nowMs)).event?.type).toBe('stale')
  })

  it('suppresses already-fired and snoozed zones', () => {
    const highReading = reading(190, nowMs)
    expect(evaluateGlucoseAlarm(highReading, { ...context(nowMs), lastFiredZone: 'high' }).reason).toBe('sameZone')

    const snoozes = new Map<string, AlarmSnoozeState>([
      ['high', { zone: 'high', expiresAt: nowMs + 60_000 }],
    ])
    const snoozed = evaluateGlucoseAlarm(highReading, { ...context(nowMs), snoozes })
    expect(snoozed.event).toBeNull()
    expect(snoozed.reason).toBe('snoozed')
  })

  it('reports expired snooze zones for adapters to clean up', () => {
    const snoozes = new Map<string, AlarmSnoozeState>([
      ['high', { zone: 'high', expiresAt: nowMs - 1 }],
    ])

    const result = evaluateGlucoseAlarm(reading(190, nowMs), { ...context(nowMs), snoozes })
    expect(result.expiredSnoozeZones).toEqual(['high'])
    expect(result.event?.type).toBe('high')
  })
})

function context(nowMs: number) {
  return {
    thresholds: DEFAULT_ALARM_THRESHOLDS,
    staleDataConfig: DEFAULT_STALE_DATA_CONFIG,
    nowMs,
  }
}

function reading(value: number, timestampMs: number): GlucoseReading {
  return {
    value,
    trend: TrendDirection.STABLE,
    timestamp: new Date(timestampMs),
    source: 'libre-link-up',
  }
}
