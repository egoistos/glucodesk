import { describe, expect, it } from 'vitest'
import { TrendDirection, mapLibreTrendArrow } from './index'

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
})
