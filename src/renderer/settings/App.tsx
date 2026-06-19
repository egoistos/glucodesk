import { useState, useEffect } from 'react'
import type { AppSettings } from '../../preload/ipc-types'
import { ConnectionTab } from './tabs/ConnectionTab'
import { AlarmsTab } from './tabs/AlarmsTab'
import { DisplayTab } from './tabs/DisplayTab'
import { GeneralTab } from './tabs/GeneralTab'
import { CalibrationTab } from './tabs/CalibrationTab'
import { setLang, t } from '../shared/i18n'

type Tab = 'connection' | 'alarms' | 'calibration' | 'display' | 'general'

export default function SettingsApp(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('connection')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    void window.glucodesk.getSettings().then((s) => {
      setLang(s.language)
      setSettings(s)
    })

    const unsub = window.glucodesk.onSettingsChanged((s) => {
      setLang(s.language)
      setSettings(s)
    })
    return () => unsub()
  }, [])

  const handleSave = async (partial: Partial<AppSettings>): Promise<void> => {
    setIsSaving(true)
    try {
      await window.glucodesk.setSettings(partial)
      setSettings((prev) => prev ? { ...prev, ...partial } : prev)
      if (partial.language) setLang(partial.language)
      setSaveMsg(t('saved'))
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err) {
      setSaveMsg(`Error: ${String(err)}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400 text-xs">
        Loading...
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connection', label: t('tab.connection') },
    { id: 'alarms', label: t('tab.alarms') },
    { id: 'calibration', label: t('tab.calibration') },
    { id: 'display', label: t('tab.display') },
    { id: 'general', label: t('tab.general') },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 text-sm">
      {/* Tabs — compact, no separate header */}
      <div className="flex border-b border-gray-700 px-1 pt-1 items-center">
        <span className="text-xs font-semibold text-gray-400 px-2 mr-1">GlucoDesk</span>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {saveMsg && (
          <span className={`ml-auto pr-2 text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'connection' && <ConnectionTab settings={settings} onSave={handleSave} isSaving={isSaving} />}
        {activeTab === 'alarms' && <AlarmsTab settings={settings} onSave={handleSave} isSaving={isSaving} />}
        {activeTab === 'calibration' && <CalibrationTab settings={settings} onSave={handleSave} isSaving={isSaving} />}
        {activeTab === 'display' && <DisplayTab settings={settings} onSave={handleSave} isSaving={isSaving} />}
        {activeTab === 'general' && <GeneralTab settings={settings} onSave={handleSave} isSaving={isSaving} />}
      </div>
    </div>
  )
}
