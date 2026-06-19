import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
  ActivityIndicator,
  AppState,
  LogBox,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import {
  LluError,
  LluErrorCode,
  TREND_ARROWS,
  calculateDelta,
  classifyZone,
  evaluateGlucoseAlarm,
  fromDisplayValue,
  mapGraphData,
  mapLatestFromConnection,
  toDisplayValue,
  type AlarmSnoozeState,
  type GlucoseReading,
  type GlucoseZone,
  type LluConnection,
} from '@glucodesk/shared-core'
import { Sparkline } from './src/components/Sparkline'
import { getConnections, getGraphData, login } from './src/lib/lluClient'
import {
  cleanOldReadings,
  getHistory,
  getLatestReading,
  initMobileDatabase,
  loadMobileSettings,
  saveMobileSettings,
  saveReading,
  saveReadings,
} from './src/lib/mobileDatabase'
import { clearSession, loadSession, saveSession } from './src/lib/secureSession'
import { ensureNotificationPermissions, showAlarmNotification } from './src/lib/notifications'
import { DEFAULT_MOBILE_SETTINGS, type LluSession, type MobileSettings, type MobileTab, type UiStatus } from './src/types'

const TABS: Array<{ id: MobileTab; label: string }> = [
  { id: 'current', label: 'Current' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
  { id: 'connection', label: 'Connection' },
]

const ZONE_COLORS: Record<GlucoseZone | 'inRange', string> = {
  urgentLow: '#dc2626',
  low: '#f97316',
  inRange: '#0f766e',
  high: '#d97706',
  urgentHigh: '#dc2626',
  stale: '#64748b',
}

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'SafeAreaView has been deprecated',
])

export default function App(): ReactElement {
  const { width } = useWindowDimensions()
  const [activeTab, setActiveTab] = useState<MobileTab>('current')
  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_MOBILE_SETTINGS)
  const [session, setSession] = useState<LluSession | null>(null)
  const [current, setCurrent] = useState<GlucoseReading | null>(null)
  const [history, setHistory] = useState<GlucoseReading[]>([])
  const [connections, setConnections] = useState<LluConnection[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [region, setRegion] = useState(DEFAULT_MOBILE_SETTINGS.lluRegion)
  const [isBusy, setIsBusy] = useState(false)
  const [status, setStatus] = useState<UiStatus>({ tone: 'idle', message: 'Ready' })
  const alarmRef = useRef<{
    lastFiredZone: GlucoseZone | null
    snoozes: Map<string, AlarmSnoozeState>
  }>({ lastFiredZone: null, snoozes: new Map() })

  const isStale = useMemo(() => {
    if (!current) return false
    const ageMinutes = (Date.now() - current.timestamp.getTime()) / 60_000
    return ageMinutes >= settings.staleDataConfig.warningMinutes
  }, [current, settings.staleDataConfig.warningMinutes])

  const zone = current
    ? isStale
      ? 'stale'
      : classifyZone(current.value, settings.alarmThresholds)
    : 'inRange'
  const accentColor = ZONE_COLORS[zone]
  const delta = useMemo(() => calculateDelta(history), [history])
  const chartWidth = Math.max(280, Math.min(width - 40, 420))

  const persistSettings = useCallback(async (nextSettings: MobileSettings): Promise<void> => {
    setSettings(nextSettings)
    await saveMobileSettings(nextSettings)
  }, [])

  const refreshReadings = useCallback(async (
    sessionOverride?: LluSession | null,
    settingsOverride?: MobileSettings,
  ): Promise<void> => {
    const activeSession = sessionOverride ?? session
    const activeSettings = settingsOverride ?? settings
    if (!activeSession) return

    setIsBusy(true)
    try {
      const response = await getConnections(
        activeSession.baseUrl,
        activeSession.token,
        activeSession.clientVersion,
        activeSession.accountId,
      )

      const nextConnections = response.data ?? []
      if (nextConnections.length === 0) {
        throw new LluError('No LibreLinkUp patients found for this account.', LluErrorCode.NO_CONNECTIONS)
      }

      setConnections(nextConnections)
      const selected = nextConnections.find((connection) => connection.patientId === activeSettings.lluSelectedPatientId)
        ?? nextConnections[0]

      let effectiveSettings = activeSettings
      if (selected.patientId !== activeSettings.lluSelectedPatientId) {
        effectiveSettings = {
          ...activeSettings,
          lluSelectedPatientId: selected.patientId,
        }
        await persistSettings(effectiveSettings)
      }

      const latest = mapLatestFromConnection(selected)
      const graph = await loadGraphReadings(activeSession, selected)
      const merged = mergeLatest(graph, latest)

      await saveReadings(merged)
      await saveReading(latest)
      const nextHistory = await getHistory(12)
      setCurrent(latest)
      setHistory(nextHistory)
      evaluateAlarm(latest, effectiveSettings)
      setStatus({ tone: 'ok', message: `Updated ${formatTime(latest.timestamp)}` })
    } catch (error) {
      setStatus({ tone: 'error', message: formatLluError(error) })
    } finally {
      setIsBusy(false)
    }
  }, [persistSettings, session, settings])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      await initMobileDatabase()
      await cleanOldReadings()
      const [storedSettings, storedSession, latest, storedHistory] = await Promise.all([
        loadMobileSettings(),
        loadSession(),
        getLatestReading(),
        getHistory(12),
      ])

      if (cancelled) return

      setSettings(storedSettings)
      setRegion(storedSettings.lluRegion)
      setSession(storedSession)
      setEmail(storedSession?.email ?? '')
      setCurrent(latest)
      setHistory(storedHistory)
      setStatus(storedSession ? { tone: 'ok', message: 'Session restored' } : { tone: 'idle', message: 'Connect LibreLinkUp' })

      if (storedSession) {
        void refreshReadings(storedSession, storedSettings)
      }
    }

    void boot().catch((error) => {
      setStatus({ tone: 'error', message: String(error) })
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session) return undefined

    const intervalMs = Math.max(settings.lluPollingIntervalSec, 30) * 1000
    const timer = setInterval(() => {
      void refreshReadings()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [refreshReadings, session, settings.lluPollingIntervalSec])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshReadings()
      }
    })
    return () => subscription.remove()
  }, [refreshReadings])

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password) {
      setStatus({ tone: 'warning', message: 'Email and password are required.' })
      return
    }

    setIsBusy(true)
    try {
      const result = await login(
        { email: email.trim(), password },
        settings.lluClientVersion,
        region.trim() || undefined,
      )
      const nextSession: LluSession = {
        email: email.trim(),
        password,
        token: result.token,
        expires: result.expires,
        region: result.region,
        baseUrl: result.baseUrl,
        accountId: result.accountId,
        clientVersion: settings.lluClientVersion,
      }
      const nextSettings = { ...settings, lluRegion: result.region }
      await saveSession(nextSession)
      await persistSettings(nextSettings)
      setSession(nextSession)
      setRegion(result.region)
      setStatus({ tone: 'ok', message: `Connected via ${result.region}` })
      setActiveTab('current')
      await refreshReadings(nextSession, nextSettings)
    } catch (error) {
      setStatus({ tone: 'error', message: formatLluError(error) })
    } finally {
      setIsBusy(false)
    }
  }

  const handleDisconnect = async (): Promise<void> => {
    await clearSession()
    setSession(null)
    setConnections([])
    setCurrent(null)
    setStatus({ tone: 'idle', message: 'Disconnected' })
  }

  const updateSettings = async (patch: Partial<MobileSettings>): Promise<void> => {
    await persistSettings({ ...settings, ...patch })
  }

  const updateThreshold = async (key: keyof MobileSettings['alarmThresholds'], displayValue: string): Promise<void> => {
    await updateSettings({
      alarmThresholds: {
        ...settings.alarmThresholds,
        [key]: fromDisplayValue(displayValue, settings.glucoseUnit),
      },
    })
  }

  const snoozeCurrentZone = (): void => {
    if (!current || zone === 'inRange') return
    alarmRef.current.snoozes.set(zone, {
      zone,
      expiresAt: Date.now() + 15 * 60_000,
    })
    setStatus({ tone: 'ok', message: `${zone} snoozed for 15 min` })
  }

  function evaluateAlarm(reading: GlucoseReading, nextSettings: MobileSettings): void {
    const result = evaluateGlucoseAlarm(reading, {
      thresholds: nextSettings.alarmThresholds,
      staleDataConfig: nextSettings.staleDataConfig,
      lastFiredZone: alarmRef.current.lastFiredZone,
      snoozes: alarmRef.current.snoozes,
    })

    for (const expiredZone of result.expiredSnoozeZones) {
      alarmRef.current.snoozes.delete(expiredZone)
    }

    if (result.shouldClearActiveAlarm) {
      alarmRef.current.lastFiredZone = null
      return
    }

    if (!result.event) return

    alarmRef.current.lastFiredZone = result.zone as GlucoseZone
    if (nextSettings.alarmNotificationsEnabled) {
      void showAlarmNotification(result.event, nextSettings.glucoseUnit)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>GlucoDesk</Text>
            <Text style={styles.subtitle}>LibreLinkUp iPhone monitor</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void refreshReadings()} disabled={!session || isBusy}>
            {isBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.refreshText}>Refresh</Text>}
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <StatusPill status={status} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {activeTab === 'current' && (
            <CurrentView
              accentColor={accentColor}
              chartWidth={chartWidth}
              connections={connections}
              current={current}
              delta={delta}
              history={history}
              isStale={isStale}
              selectedPatientId={settings.lluSelectedPatientId}
              session={session}
              settings={settings}
              onOpenConnection={() => setActiveTab('connection')}
              updateSettings={updateSettings}
            />
          )}
          {activeTab === 'history' && (
            <HistoryView chartWidth={chartWidth} history={history} unit={settings.glucoseUnit} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onNotificationsToggle={(enabled) => {
                if (enabled) void ensureNotificationPermissions()
                void updateSettings({ alarmNotificationsEnabled: enabled })
              }}
              onSnooze={snoozeCurrentZone}
              onUpdate={updateSettings}
              onUpdateThreshold={updateThreshold}
            />
          )}
          {activeTab === 'connection' && (
            <ConnectionView
              email={email}
              isBusy={isBusy}
              password={password}
              region={region}
              session={session}
              setEmail={setEmail}
              setPassword={setPassword}
              setRegion={setRegion}
              onDisconnect={handleDisconnect}
              onLogin={handleLogin}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

interface CurrentViewProps {
  accentColor: string
  chartWidth: number
  connections: LluConnection[]
  current: GlucoseReading | null
  delta: number | null
  history: GlucoseReading[]
  isStale: boolean
  selectedPatientId: string | null
  session: LluSession | null
  settings: MobileSettings
  onOpenConnection: () => void
  updateSettings: (patch: Partial<MobileSettings>) => Promise<void>
}

function CurrentView({
  accentColor,
  chartWidth,
  connections,
  current,
  delta,
  history,
  isStale,
  selectedPatientId,
  session,
  settings,
  onOpenConnection,
  updateSettings,
}: CurrentViewProps): ReactElement {
  if (!session) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Connect LibreLinkUp</Text>
        <Text style={styles.emptyText}>Use the Connection tab to sign in and start collecting readings.</Text>
        <Pressable style={styles.primaryButton} onPress={onOpenConnection}>
          <Text style={styles.primaryButtonText}>Open Connection</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <View style={styles.readingRow}>
        <View>
          <Text style={styles.kicker}>{isStale ? 'Stale reading' : 'Current glucose'}</Text>
          <Text style={[styles.value, { color: accentColor }]}>
            {current ? toDisplayValue(current.value, settings.glucoseUnit) : '--'}
          </Text>
          <Text style={styles.unit}>{settings.glucoseUnit}</Text>
        </View>
        <View style={styles.trendBlock}>
          <Text style={[styles.trend, { color: accentColor }]}>{current ? TREND_ARROWS[current.trend] : '?'}</Text>
          <Text style={styles.delta}>
            {delta === null ? 'delta --' : `${delta > 0 ? '+' : ''}${toDisplayValue(delta, settings.glucoseUnit)}`}
          </Text>
        </View>
      </View>

      <Text style={styles.freshness}>{current ? `Last reading ${formatAgo(current.timestamp)}` : 'Waiting for data'}</Text>

      {history.length > 1 && (
        <View style={styles.chartWrap}>
          <Sparkline readings={history.slice(-48)} width={chartWidth} height={128} />
        </View>
      )}

      {connections.length > 1 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Patient</Text>
          {connections.map((connection) => (
            <Pressable
              key={connection.patientId}
              style={[styles.optionRow, selectedPatientId === connection.patientId && styles.optionRowActive]}
              onPress={() => void updateSettings({ lluSelectedPatientId: connection.patientId })}
            >
              <Text style={styles.optionTitle}>{connection.firstName} {connection.lastName}</Text>
              <Text style={styles.optionMeta}>{connection.patientId}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

function HistoryView({ chartWidth, history, unit }: { chartWidth: number; history: GlucoseReading[]; unit: MobileSettings['glucoseUnit'] }): ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.blockTitle}>12 hour history</Text>
      {history.length > 1 ? (
        <View style={styles.chartWrap}>
          <Sparkline readings={history} width={chartWidth} height={180} />
        </View>
      ) : (
        <Text style={styles.emptyText}>History will appear after the first successful refresh.</Text>
      )}

      {history.slice(-12).reverse().map((reading) => (
        <View key={`${reading.source}-${reading.timestamp.getTime()}`} style={styles.historyRow}>
          <Text style={styles.historyTime}>{formatTime(reading.timestamp)}</Text>
          <Text style={styles.historyValue}>{toDisplayValue(reading.value, unit)} {unit}</Text>
          <Text style={styles.historyTrend}>{TREND_ARROWS[reading.trend]}</Text>
        </View>
      ))}
    </View>
  )
}

interface SettingsViewProps {
  settings: MobileSettings
  onNotificationsToggle: (enabled: boolean) => void
  onSnooze: () => void
  onUpdate: (patch: Partial<MobileSettings>) => Promise<void>
  onUpdateThreshold: (key: keyof MobileSettings['alarmThresholds'], displayValue: string) => Promise<void>
}

function SettingsView({ settings, onNotificationsToggle, onSnooze, onUpdate, onUpdateThreshold }: SettingsViewProps): ReactElement {
  return (
    <View style={styles.section}>
      <Text style={styles.blockTitle}>Display</Text>
      <Segmented
        options={['mg/dL', 'mmol/L']}
        value={settings.glucoseUnit}
        onChange={(value) => void onUpdate({ glucoseUnit: value as MobileSettings['glucoseUnit'] })}
      />

      <Text style={styles.blockTitle}>Polling</Text>
      <NumberField
        label="Foreground interval"
        suffix="sec"
        value={settings.lluPollingIntervalSec}
        onCommit={(value) => void onUpdate({ lluPollingIntervalSec: Math.max(30, Math.round(value)) })}
      />

      <Text style={styles.blockTitle}>Alarms</Text>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Local notifications</Text>
        <Switch value={settings.alarmNotificationsEnabled} onValueChange={onNotificationsToggle} />
      </View>
      <ThresholdField label="Urgent low" value={settings.alarmThresholds.urgentLow} unit={settings.glucoseUnit} onCommit={(text) => onUpdateThreshold('urgentLow', text)} />
      <ThresholdField label="Low" value={settings.alarmThresholds.low} unit={settings.glucoseUnit} onCommit={(text) => onUpdateThreshold('low', text)} />
      <ThresholdField label="High" value={settings.alarmThresholds.high} unit={settings.glucoseUnit} onCommit={(text) => onUpdateThreshold('high', text)} />
      <ThresholdField label="Urgent high" value={settings.alarmThresholds.urgentHigh} unit={settings.glucoseUnit} onCommit={(text) => onUpdateThreshold('urgentHigh', text)} />
      <NumberField
        label="Stale warning"
        suffix="min"
        value={settings.staleDataConfig.warningMinutes}
        onCommit={(value) => void onUpdate({ staleDataConfig: { ...settings.staleDataConfig, warningMinutes: Math.max(5, Math.round(value)) } })}
      />
      <NumberField
        label="Stale alarm"
        suffix="min"
        value={settings.staleDataConfig.urgentMinutes}
        onCommit={(value) => void onUpdate({ staleDataConfig: { ...settings.staleDataConfig, urgentMinutes: Math.max(10, Math.round(value)) } })}
      />
      <Pressable style={styles.secondaryButton} onPress={onSnooze}>
        <Text style={styles.secondaryButtonText}>Snooze current zone 15 min</Text>
      </Pressable>
    </View>
  )
}

interface ConnectionViewProps {
  email: string
  isBusy: boolean
  password: string
  region: string
  session: LluSession | null
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  setRegion: (value: string) => void
  onDisconnect: () => Promise<void>
  onLogin: () => Promise<void>
}

function ConnectionView({
  email,
  isBusy,
  password,
  region,
  session,
  setEmail,
  setPassword,
  setRegion,
  onDisconnect,
  onLogin,
}: ConnectionViewProps): ReactElement {
  return (
    <View style={styles.section}>
      {session && (
        <View style={styles.connectedBand}>
          <Text style={styles.connectedTitle}>Connected</Text>
          <Text style={styles.connectedMeta}>{session.email} via {session.region}</Text>
        </View>
      )}
      <Text style={styles.label}>LibreLinkUp email</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" style={styles.input} value={email} onChangeText={setEmail} />
      <Text style={styles.label}>Password</Text>
      <TextInput secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
      <Text style={styles.label}>Region</Text>
      <TextInput autoCapitalize="none" style={styles.input} value={region} onChangeText={setRegion} placeholder="ru, eu, us..." />
      <Pressable style={[styles.primaryButton, isBusy && styles.disabledButton]} onPress={() => void onLogin()} disabled={isBusy}>
        <Text style={styles.primaryButtonText}>{isBusy ? 'Connecting...' : 'Connect'}</Text>
      </Pressable>
      {session && (
        <Pressable style={styles.secondaryButton} onPress={() => void onDisconnect()}>
          <Text style={styles.secondaryButtonText}>Disconnect</Text>
        </Pressable>
      )}
    </View>
  )
}

function StatusPill({ status }: { status: UiStatus }): ReactElement {
  return (
    <View style={[styles.status, styles[`status_${status.tone}`]]}>
      <Text style={styles.statusText}>{status.message}</Text>
    </View>
  )
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.segment, value === option && styles.segmentActive]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function NumberField({
  label,
  onCommit,
  suffix,
  value,
}: {
  label: string
  onCommit: (value: number) => void
  suffix: string
  value: number
}): ReactElement {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWithSuffix}>
        <TextInput
          keyboardType="numeric"
          style={styles.inlineInput}
          value={text}
          onChangeText={setText}
          onEndEditing={() => {
            const parsed = Number.parseFloat(text)
            if (Number.isFinite(parsed)) onCommit(parsed)
          }}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  )
}

function ThresholdField({
  label,
  onCommit,
  unit,
  value,
}: {
  label: string
  onCommit: (displayValue: string) => Promise<void>
  unit: MobileSettings['glucoseUnit']
  value: number
}): ReactElement {
  const [text, setText] = useState(toDisplayValue(value, unit))

  useEffect(() => {
    setText(toDisplayValue(value, unit))
  }, [unit, value])

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWithSuffix}>
        <TextInput
          keyboardType="decimal-pad"
          style={styles.inlineInput}
          value={text}
          onChangeText={setText}
          onEndEditing={() => void onCommit(text)}
        />
        <Text style={styles.suffix}>{unit}</Text>
      </View>
    </View>
  )
}

async function loadGraphReadings(session: LluSession, connection: LluConnection): Promise<GlucoseReading[]> {
  if (connection.graphData?.length) {
    return mapGraphData(connection.graphData)
  }

  try {
    const response = await getGraphData(
      session.baseUrl,
      connection.patientId,
      session.token,
      session.clientVersion,
      session.accountId,
    )
    return mapGraphData(response.data.graphData ?? [])
  } catch {
    return []
  }
}

function mergeLatest(readings: GlucoseReading[], latest: GlucoseReading): GlucoseReading[] {
  const exists = readings.some((reading) => (
    reading.source === latest.source && reading.timestamp.getTime() === latest.timestamp.getTime()
  ))
  return exists ? readings : [...readings, latest].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

function formatLluError(error: unknown): string {
  if (error instanceof LluError) {
    switch (error.code) {
      case LluErrorCode.TOU_REQUIRED:
        return 'LibreLinkUp requires Terms of Use acceptance in the official app.'
      case LluErrorCode.PP_REQUIRED:
        return 'LibreLinkUp requires Privacy Policy acceptance in the official app.'
      case LluErrorCode.EMAIL_VERIFY_REQUIRED:
        return 'LibreLinkUp requires email verification.'
      case LluErrorCode.RATE_LIMITED:
        return error.message
      case LluErrorCode.NO_CONNECTIONS:
        return 'No LibreLinkUp patients found.'
      default:
        return error.message
    }
  }
  return String(error)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatAgo(date: Date): string {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  return `${minutes} min ago`
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  brand: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 88,
    paddingHorizontal: 14,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
  },
  activeTab: {
    backgroundColor: '#e0f2f1',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#0f766e',
  },
  status: {
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  status_idle: {
    backgroundColor: '#e2e8f0',
  },
  status_ok: {
    backgroundColor: '#ccfbf1',
  },
  status_warning: {
    backgroundColor: '#fef3c7',
  },
  status_error: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 16,
  },
  readingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 76,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 84,
  },
  unit: {
    color: '#475569',
    fontSize: 17,
    fontWeight: '700',
  },
  trendBlock: {
    alignItems: 'flex-end',
    paddingTop: 12,
  },
  trend: {
    fontSize: 52,
    fontWeight: '800',
  },
  delta: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '800',
  },
  freshness: {
    color: '#64748b',
    fontSize: 14,
  },
  chartWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  block: {
    gap: 10,
  },
  blockTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  optionRow: {
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  optionRowActive: {
    backgroundColor: '#ecfeff',
    borderColor: '#0f766e',
  },
  optionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  optionMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 72,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  historyRow: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  historyTime: {
    color: '#64748b',
    flex: 1,
    fontSize: 14,
  },
  historyValue: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  historyTrend: {
    color: '#0f766e',
    fontSize: 22,
    fontWeight: '800',
    paddingLeft: 16,
    width: 48,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  label: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  inputWithSuffix: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minWidth: 132,
    paddingHorizontal: 10,
  },
  inlineInput: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    minHeight: 42,
    textAlign: 'right',
  },
  suffix: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  segmented: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#0f766e',
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 4,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0f766e',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  connectedBand: {
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    padding: 12,
  },
  connectedTitle: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '900',
  },
  connectedMeta: {
    color: '#115e59',
    fontSize: 13,
    marginTop: 2,
  },
})
