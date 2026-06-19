import log from 'electron-log'
import { applyCalibrationOffset, calculateCalibrationOffset } from '@glucodesk/shared-core'
import { getSettings, updateSettings } from '../store/settings'

// ============================================================
// Single-point calibration — simple offset correction
//
// calibrated_value = sensor_value + offset
// offset = meter_reading - sensor_reading_at_calibration_time
//
// Stored in settings as calibrationOffset (mg/dL).
// Reset when sensor changes or manually by user.
// ============================================================

/**
 * Apply calibration to a sensor reading (mg/dL).
 * Returns adjusted value in mg/dL.
 */
export function applyCalibration(sensorValueMgdl: number): number {
  const settings = getSettings()
  const offset = settings.calibrationOffset ?? 0
  return applyCalibrationOffset(sensorValueMgdl, offset)
}

/**
 * Set calibration based on a finger-prick meter reading.
 * @param meterValueMgdl — blood glucose from meter, in mg/dL
 * @param sensorValueMgdl — current sensor reading, in mg/dL
 */
export function calibrate(meterValueMgdl: number, sensorValueMgdl: number): number {
  const offset = calculateCalibrationOffset(meterValueMgdl, sensorValueMgdl)
  updateSettings({ calibrationOffset: offset })
  log.info(`[Calibration] Set offset: ${offset} mg/dL (meter: ${meterValueMgdl}, sensor: ${sensorValueMgdl})`)
  return offset
}

/**
 * Reset calibration offset to 0
 */
export function resetCalibration(): void {
  updateSettings({ calibrationOffset: 0 })
  log.info('[Calibration] Reset to 0')
}

/**
 * Get current offset
 */
export function getCalibrationOffset(): number {
  return getSettings().calibrationOffset ?? 0
}
