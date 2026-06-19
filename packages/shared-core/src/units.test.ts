import { describe, expect, it } from 'vitest'
import {
  fromDisplayValue,
  toDisplayValue,
  toMgDl,
  toMmolL,
} from './index'

describe('glucose unit conversion', () => {
  it('converts mg/dL to mmol/L using the Libre glucose factor', () => {
    expect(toMmolL(180)).toBeCloseTo(9.9899, 4)
  })

  it('converts mmol/L to mg/dL using the Libre glucose factor', () => {
    expect(toMgDl(10)).toBeCloseTo(180.182, 3)
  })

  it('formats display values for the selected unit', () => {
    expect(toDisplayValue(180, 'mg/dL')).toBe('180')
    expect(toDisplayValue(180, 'mmol/L')).toBe('10.0')
  })

  it('parses display values back to rounded internal mg/dL', () => {
    expect(fromDisplayValue('180.4', 'mg/dL')).toBe(180)
    expect(fromDisplayValue('5.5', 'mmol/L')).toBe(99)
    expect(fromDisplayValue('not-a-number', 'mg/dL')).toBe(0)
  })
})
