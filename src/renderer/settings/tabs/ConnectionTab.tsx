import { useState } from 'react'
import type { AppSettings, LluConnectResponse } from '../../../preload/ipc-types'
import { t } from '../../shared/i18n'

interface Props {
  settings: AppSettings
  onSave: (partial: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
}

const REGIONS = ['ru', 'eu', 'eu2', 'us', 'de', 'fr', 'jp', 'au', 'ap', 'ae', 'ca', 'la', 'cn']

export function ConnectionTab({ settings, onSave, isSaving }: Props): JSX.Element {
  const [email, setEmail] = useState(settings.lluEmail)
  const [password, setPassword] = useState('')
  const [region, setRegion] = useState(settings.lluRegion)
  const [clientVersion, setClientVersion] = useState(settings.lluClientVersion)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<LluConnectResponse | null>(null)

  const handleTest = async (): Promise<void> => {
    if (!email || !password) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.glucodesk.testConnection({ email, password, region, clientVersion })
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (password) {
      await window.glucodesk.connectLlu({ email, password, region, clientVersion })
    }
    await onSave({ lluEmail: email, lluRegion: region, lluClientVersion: clientVersion })
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-900/20 border border-blue-800/30 rounded px-3 py-2 text-xs text-blue-300/80">
        {t('conn.notice')}
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('conn.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            placeholder="your@email.com" />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('conn.password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            placeholder={settings.lluPasswordEncrypted ? '••••••••' : t('conn.enterPassword')} />
          {settings.lluPasswordEncrypted && !password && (
            <p className="text-xs text-gray-500 mt-0.5">{t('conn.passwordSaved')}</p>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">{t('conn.region')}</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
              {REGIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">{t('conn.clientVersion')}</label>
            <input type="text" value={clientVersion} onChange={(e) => setClientVersion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      {testResult && (
        <div className={`rounded px-3 py-2 text-xs border ${
          testResult.success ? 'bg-green-900/20 border-green-700/30 text-green-300'
            : 'bg-red-900/20 border-red-700/30 text-red-300'}`}>
          {testResult.success ? (
            <>{t('conn.success')} <strong>{testResult.region?.toUpperCase()}</strong> — {testResult.patientCount} {t('conn.patients')}</>
          ) : testResult.requiresAction ? (
            <>{t('conn.actionRequired')} <strong>{testResult.requiresAction}</strong> {t('conn.actionHint')}</>
          ) : (
            <>✗ {testResult.error}</>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={() => { void handleTest() }} disabled={testing || !email || !password}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors">
          {testing ? t('conn.testing') : t('conn.test')}
        </button>
        <button onClick={() => { void handleSave() }} disabled={isSaving}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs transition-colors font-medium">
          {isSaving ? t('conn.saving') : t('conn.save')}
        </button>
      </div>
    </div>
  )
}
