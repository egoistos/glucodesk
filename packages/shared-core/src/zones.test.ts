import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALARM_THRESHOLDS,
  classifyZone,
  type AlarmThresholds,
} from './index'

describe('glucose zone classification', () => {
  it('classifies default threshold boundaries inclusively', () => {
    expect(classifyZone(55, DEFAULT_ALARM_THRESHOLDS)).toBe('urgentLow')
    expect(classifyZone(56, DEFAULT_ALARM_THRESHOLDS)).toBe('low')
    expect(classifyZone(70, DEFAULT_ALARM_THRESHOLDS)).toBe('low')
    expect(classifyZone(71, DEFAULT_ALARM_THRESHOLDS)).toBe('inRange')
    expect(classifyZone(179, DEFAULT_ALARM_THRESHOLDS)).toBe('inRange')
    expect(classifyZone(180, DEFAULT_ALARM_THRESHOLDS)).toBe('high')
    expect(classifyZone(249, DEFAULT_ALARM_THRESHOLDS)).toBe('high')
    expect(classifyZone(250, DEFAULT_ALARM_THRESHOLDS)).toBe('urgentHigh')
  })

  it('uses caller-provided thresholds', () => {
    const thresholds: AlarmThresholds = {
      urgentHigh: 300,
      high: 200,
      low: 80,
      urgentLow: 60,
    }

    expect(classifyZone(61, thresholds)).toBe('low')
    expect(classifyZone(199, thresholds)).toBe('inRange')
    expect(classifyZone(200, thresholds)).toBe('high')
    expect(classifyZone(300, thresholds)).toBe('urgentHigh')
  })
})
