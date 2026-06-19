import { describe, expect, it } from 'vitest'
import {
  GLOBAL_LLU_BASE_URL,
  REGION_BASE_URL,
  TrendDirection,
  calculateDelta,
  mapGraphData,
  mapLatestFromConnection,
  mapLibreTrendArrow,
  mapMeasurement,
  parseLluTimestamp,
  type LluConnection,
  type LluGlucoseMeasurement,
} from './index'

describe('LibreLinkUp mapping helpers', () => {
  it('maps known LibreLinkUp trend arrows to domain trend directions', () => {
    expect(mapLibreTrendArrow(1)).toBe(TrendDirection.FALLING_FAST)
    expect(mapLibreTrendArrow(2)).toBe(TrendDirection.FALLING)
    expect(mapLibreTrendArrow(3)).toBe(TrendDirection.STABLE)
    expect(mapLibreTrendArrow(4)).toBe(TrendDirection.RISING)
    expect(mapLibreTrendArrow(5)).toBe(TrendDirection.RISING_FAST)
  })

  it('maps unknown LibreLinkUp trend arrows to unknown', () => {
    expect(mapLibreTrendArrow(0)).toBe(TrendDirection.UNKNOWN)
    expect(mapLibreTrendArrow(6)).toBe(TrendDirection.UNKNOWN)
    expect(mapLibreTrendArrow(-1)).toBe(TrendDirection.UNKNOWN)
    expect(mapLibreTrendArrow(Number.NaN)).toBe(TrendDirection.UNKNOWN)
  })

  it('resolves LibreLinkUp regional base URLs', () => {
    expect(REGION_BASE_URL('ru')).toBe('https://api.libreview.ru')
    expect(REGION_BASE_URL('US')).toBe('https://api-us.libreview.io')
    expect(REGION_BASE_URL('eu2')).toBe('https://api-eu2.libreview.io')
    expect(REGION_BASE_URL('unknown')).toBe(GLOBAL_LLU_BASE_URL)
    expect(REGION_BASE_URL()).toBe(GLOBAL_LLU_BASE_URL)
  })

  it('parses ISO and LLU US timestamps', () => {
    expect(parseLluTimestamp('2025-01-15T10:30:00.000Z').toISOString()).toBe('2025-01-15T10:30:00.000Z')

    const parsed = parseLluTimestamp('1/15/2025 10:30:00 PM')
    expect(parsed.getFullYear()).toBe(2025)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(15)
    expect(parsed.getHours()).toBe(22)
    expect(parsed.getMinutes()).toBe(30)
  })

  it('maps LLU measurements and graph data into sorted readings', () => {
    const older = measurement({
      Timestamp: '1/15/2025 10:25:00 AM',
      ValueInMgPerDl: 100,
      TrendArrow: 3,
    })
    const newer = measurement({
      Timestamp: '1/15/2025 10:30:00 AM',
      ValueInMgPerDl: 112,
      TrendArrow: 4,
    })

    const mapped = mapMeasurement(newer)
    expect(mapped.value).toBe(112)
    expect(mapped.trend).toBe(TrendDirection.RISING)
    expect(mapped.source).toBe('libre-link-up')

    const graph = mapGraphData([newer, older])
    expect(graph.map((reading) => reading.value)).toEqual([100, 112])
    expect(calculateDelta(graph)).toBe(12)
  })

  it('uses glucoseMeasurement before glucoseItem when mapping latest connection reading', () => {
    const connection = {
      patientId: 'patient-1',
      firstName: 'Jane',
      lastName: 'Example',
      targetHigh: 180,
      targetLow: 70,
      glucoseMeasurement: measurement({ ValueInMgPerDl: 130, TrendArrow: 5 }),
      glucoseItem: measurement({ ValueInMgPerDl: 120, TrendArrow: 3 }),
      patientDevice: {
        deviceId: 'device-1',
        serialNumber: 'serial-1',
      },
      created: 0,
    } satisfies LluConnection

    expect(mapLatestFromConnection(connection).value).toBe(130)
    expect(mapLatestFromConnection(connection).trend).toBe(TrendDirection.RISING_FAST)
  })
})

function measurement(overrides: Partial<LluGlucoseMeasurement> = {}): LluGlucoseMeasurement {
  return {
    FactoryTimestamp: '2025-01-15T10:30:00.000Z',
    Timestamp: '2025-01-15T10:30:00.000Z',
    type: 0,
    ValueInMgPerDl: 110,
    TrendArrow: 3,
    Value: 110,
    isHigh: false,
    isLow: false,
    ...overrides,
  }
}
