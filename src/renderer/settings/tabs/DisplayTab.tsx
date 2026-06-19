import { useState } from 'react'
import type { AppSettings } from '../../../preload/ipc-types'
import type { GlucoseUnit } from '../../shared/types'
import { t } from '../../shared/i18n'

interface Props {
  settings: AppSettings
  onSave: (partial: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
}

const SIZE_LABELS: Record<string, () => string> = {
  compact: () => t('display.compact'),
  normal: () => t('display.normal'),
  large: () => t('display.large'),
}

export function DisplayTab({ settings, onSave, isSaving }: Props): JSX.Element {
  const [unit, setUnit] = useState<GlucoseUnit>(settings.glucoseUnit)
  const [widgetSize, setWidgetSize] = useState(settings.widgetSize)
  const [clickThrough, setClickThrough] = useState(settings.widgetClickThrough)

  const handleSave = (): void => {
    void onSave({ glucoseUnit: unit, widgetSize, widgetClickThrough: clickThrough })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('display.units')}</h3>
        <div className="flex gap-2">
          {(['mg/dL', 'mmol/L'] as GlucoseUnit[]).map((u) => (
            <button key={u} onClick={() => setUnit(u)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                unit === u ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('display.widgetSize')}</h3>
        <div className="flex gap-2">
          {(['compact', 'normal', 'large'] as const).map((s) => (
            <button key={s} onClick={() => setWidgetSize(s)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                widgetSize === s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {SIZE_LABELS[s]()}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={clickThrough} onChange={(e) => setClickThrough(e.target.checked)} className="w-3.5 h-3.5 rounded" />
        <div>
          <p className="text-xs text-gray-300">{t('display.clickThrough')}</p>
          <p className="text-xs text-gray-500">{t('display.clickThroughHint')}</p>
        </div>
      </label>

      <button onClick={handleSave} disabled={isSaving}
        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs transition-colors font-medium">
        {isSaving ? t('display.saving') : t('display.save')}
      </button>
    </div>
  )
}
