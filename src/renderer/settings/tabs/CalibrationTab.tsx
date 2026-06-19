import { useState, useEffect } from 'react'
import type { AppSettings } from '../../../preload/ipc-types'
import { toDisplayValue } from '../../shared/types'
import { t } from '../../shared/i18n'

interface Props {
  settings: AppSettings
  onSave: (partial: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
}

const MGDL_TO_MMOL = 1 / 18.0182

export function CalibrationTab({ settings, onSave, isSaving }: Props): JSX.Element {
  const unit = settings.glucoseUnit
  const [meterInput, setMeterInput] = useState('')
  const [sensorValue, setSensorValue] = useState<number | null>(null)
  const [offset, setOffset] = useState(settings.calibrationOffset ?? 0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void window.glucodesk.getGlucose().then((r) => {
      if (r) setSensorValue(r.value)
    })
    void window.glucodesk.getCalibrationOffset().then(setOffset)
  }, [])

  const handleCalibrate = async (): Promise<void> => {
    if (!meterInput || sensorValue === null) return

    let meterMgdl: number
    if (unit === 'mmol/L') {
      meterMgdl = Math.round(parseFloat(meterInput) / MGDL_TO_MMOL)
    } else {
      meterMgdl = Math.round(parseFloat(meterInput))
    }

    const newOffset = await window.glucodesk.calibrate(meterMgdl, sensorValue)
    setOffset(newOffset)
    setMeterInput('')
    setMessage(t('cal.done'))
    setTimeout(() => setMessage(''), 3000)
  }

  const handleReset = async (): Promise<void> => {
    await window.glucodesk.resetCalibration()
    setOffset(0)
    setMessage(t('cal.done'))
    setTimeout(() => setMessage(''), 3000)
  }

  const displayOffset = unit === 'mmol/L'
    ? (offset * MGDL_TO_MMOL).toFixed(1)
    : String(offset)

  const displaySensor = sensorValue !== null
    ? toDisplayValue(sensorValue, unit)
    : '--'

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">{t('cal.description')}</p>

      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-300 w-40">{t('cal.currentSensor')}</label>
          <span className="text-xs text-gray-100 font-medium tabular-nums">{displaySensor} {unit}</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-300 w-40">{t('cal.currentOffset')}</label>
          <span className={`text-xs font-medium tabular-nums ${offset === 0 ? 'text-gray-500' : 'text-yellow-400'}`}>
            {offset > 0 ? '+' : ''}{displayOffset} {unit}
          </span>
        </div>

        <hr className="border-gray-700/50" />

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-300 w-40">{t('cal.meterValue')}</label>
          <input
            type="text"
            value={meterInput}
            onChange={(e) => setMeterInput(e.target.value)}
            placeholder={unit === 'mmol/L' ? '5.5' : '100'}
            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:border-blue-500 tabular-nums"
          />
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>

      {sensorValue === null && (
        <p className="text-xs text-yellow-500">{t('cal.noData')}</p>
      )}

      <div className="flex gap-2 items-center">
        <button
          onClick={() => { void handleCalibrate() }}
          disabled={!meterInput || sensorValue === null || isSaving}
          className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs transition-colors font-medium"
        >
          {t('cal.calibrate')}
        </button>
        {offset !== 0 && (
          <button
            onClick={() => { void handleReset() }}
            className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs transition-colors"
          >
            {t('cal.reset')}
          </button>
        )}
        {message && <span className="text-xs text-green-400">{message}</span>}
      </div>
    </div>
  )
}
