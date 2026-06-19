import { describe, expect, it } from 'vitest'
import {
  applyCalibrationOffset,
  calculateCalibrationOffset,
} from './index'

describe('calibration math', () => {
  it('calculates the stored offset from meter and sensor values', () => {
    expect(calculateCalibrationOffset(142, 130)).toBe(12)
    expect(calculateCalibrationOffset(88, 101)).toBe(-13)
    expect(calculateCalibrationOffset(110, 110)).toBe(0)
  })

  it('applies an offset to sensor values', () => {
    expect(applyCalibrationOffset(130, 12)).toBe(142)
    expect(applyCalibrationOffset(101, -13)).toBe(88)
    expect(applyCalibrationOffset(99, 0)).toBe(99)
  })

  it('does not return negative calibrated glucose values', () => {
    expect(applyCalibrationOffset(5, -20)).toBe(0)
  })
})
