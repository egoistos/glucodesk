import { useState } from 'react'
import type { AppSettings } from '../../../preload/ipc-types'
import { t } from '../../shared/i18n'

interface Props {
  settings: AppSettings
  onSave: (partial: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
}

export function GeneralTab({ settings, onSave, isSaving }: Props): JSX.Element {
  const [autostart, setAutostart] = useState(settings.autostart)
  const [language, setLanguage] = useState(settings.language)
  const [pollingInterval, setPollingInterval] = useState(settings.lluPollingIntervalSec)
  const [logMsg, setLogMsg] = useState('')

  const handleSave = async (): Promise<void> => {
    await window.glucodesk.setAutostart(autostart)
    await onSave({ autostart, language, lluPollingIntervalSec: pollingInterval })
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={autostart} onChange={(e) => setAutostart(e.target.checked)} className="w-3.5 h-3.5 rounded" />
        <div>
          <p className="text-xs text-gray-300">{t('general.autostart')}</p>
          <p className="text-xs text-gray-500">{t('general.autostartHint')}</p>
        </div>
      </label>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('general.language')}</h3>
        <div className="flex gap-2">
          {([['ru', 'Русский'], ['en', 'English']] as const).map(([l, label]) => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                language === l ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('general.polling')}</h3>
        <div className="flex gap-2 flex-wrap">
          {[60, 90, 120, 300].map((sec) => (
            <button key={sec} onClick={() => setPollingInterval(sec)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                pollingInterval === sec ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {sec}с
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{t('general.pollingHint')}</p>
      </div>

      <hr className="border-gray-700/50" />

      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            const result = await window.glucodesk.exportLogs()
            setLogMsg(result.success ? t('general.logsExported') : t('general.logsError'))
            setTimeout(() => setLogMsg(''), 3000)
          }}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs transition-colors"
        >
          {t('general.exportLogs')}
        </button>
        {logMsg && <span className="text-xs text-green-400">{logMsg}</span>}
      </div>

      <button onClick={() => { void handleSave() }} disabled={isSaving}
        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs transition-colors font-medium">
        {isSaving ? t('general.saving') : t('general.save')}
      </button>
    </div>
  )
}
