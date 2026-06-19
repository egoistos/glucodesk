import { useState } from 'react'
import type { AppSettings } from '../../../preload/ipc-types'
import { fromDisplayValue, toDisplayValue, type AlarmThresholds, type GlucoseUnit } from '@glucodesk/shared-core'
import { t } from '../../shared/i18n'

interface Props {
  settings: AppSettings
  onSave: (partial: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
}


function ThresholdField({
  label,
  color,
  value,
  unit,
  onChange,
}: {
  label: string
  color: string
  value: number
  unit: GlucoseUnit
  onChange: (mgdl: number) => void
}): JSX.Element {
  const [displayVal, setDisplayVal] = useState(toDisplayValue(value, unit))

  const handleBlur = (): void => {
    const mgdl = fromDisplayValue(displayVal, unit)
    onChange(mgdl)
    setDisplayVal(toDisplayValue(mgdl, unit))
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <label className="text-xs text-gray-300 w-32">{label}</label>
      <input
        type="text"
        value={displayVal}
        onChange={(e) => setDisplayVal(e.target.value)}
        onBlur={handleBlur}
        className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:border-blue-500 tabular-nums"
      />
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  )
}

export function AlarmsTab({ settings, onSave, isSaving }: Props): JSX.Element {
  const unit = settings.glucoseUnit
  const [thresholds, setThresholds] = useState<AlarmThresholds>(settings.alarmThresholds)
  const [staleWarning, setStaleWarning] = useState(settings.staleDataConfig.warningMinutes)
  const [staleUrgent, setStaleUrgent] = useState(settings.staleDataConfig.urgentMinutes)
  const [soundEnabled, setSoundEnabled] = useState(settings.alarmSoundEnabled)
  const [notifEnabled, setNotifEnabled] = useState(settings.alarmNotificationsEnabled)

  const handleSave = (): void => {
    void onSave({
      alarmThresholds: thresholds,
      staleDataConfig: { warningMinutes: staleWarning, urgentMinutes: staleUrgent },
      alarmSoundEnabled: soundEnabled,
      alarmNotificationsEnabled: notifEnabled,
    })
  }

  const setThreshold = (key: keyof AlarmThresholds) => (value: number): void => {
    setThresholds((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('alarm.thresholds')}</h3>
        <ThresholdField label={t('alarm.urgentHigh')} color="#dc2626" value={thresholds.urgentHigh} unit={unit} onChange={setThreshold('urgentHigh')} />
        <ThresholdField label={t('alarm.high')} color="#eab308" value={thresholds.high} unit={unit} onChange={setThreshold('high')} />
        <ThresholdField label={t('alarm.low')} color="#f97316" value={thresholds.low} unit={unit} onChange={setThreshold('low')} />
        <ThresholdField label={t('alarm.urgentLow')} color="#dc2626" value={thresholds.urgentLow} unit={unit} onChange={setThreshold('urgentLow')} />
      </div>

      <hr className="border-gray-700/50" />

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('alarm.stale')}</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-300 w-32">{t('alarm.staleWarning')}</label>
          <input
            type="number"
            value={staleWarning}
            onChange={(e) => setStaleWarning(Number(e.target.value))}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-right"
            min={5} max={120}
          />
          <span className="text-xs text-gray-500">{t('alarm.min')}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-300 w-32">{t('alarm.staleUrgent')}</label>
          <input
            type="number"
            value={staleUrgent}
            onChange={(e) => setStaleUrgent(Number(e.target.value))}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-right"
            min={10} max={120}
          />
          <span className="text-xs text-gray-500">{t('alarm.min')}</span>
        </div>
      </div>

      <hr className="border-gray-700/50" />

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('alarm.notifications')}</h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="w-3.5 h-3.5 rounded" />
          <span className="text-xs text-gray-300">{t('alarm.sound')}</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={notifEnabled} onChange={(e) => setNotifEnabled(e.target.checked)} className="w-3.5 h-3.5 rounded" />
          <span className="text-xs text-gray-300">{t('alarm.windowsNotif')}</span>
        </label>
      </div>

      <button onClick={handleSave} disabled={isSaving}
        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs transition-colors font-medium">
        {isSaving ? t('alarm.saving') : t('alarm.save')}
      </button>
    </div>
  )
}
