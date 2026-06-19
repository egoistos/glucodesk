import { Platform } from 'react-native'
import {
  TREND_ARROWS,
  toDisplayValue,
  type GlucoseReading,
  type GlucoseUnit,
} from '@glucodesk/shared-core'

type LiveActivityModule = typeof import('expo-live-activity')
type LiveActivityState = import('expo-live-activity').LiveActivityState
type LiveActivityConfig = import('expo-live-activity').LiveActivityConfig

export interface NativeCapabilityResult {
  ok: boolean
  message: string
}

const LIVE_ACTIVITY_NATIVE_MESSAGE = 'Dynamic Island and Lock Screen require a custom iOS build.'

let liveActivityModulePromise: Promise<LiveActivityModule> | null = null
let activeActivityId: string | null = null

export async function updateGlucoseLiveActivity(
  reading: GlucoseReading,
  unit: GlucoseUnit,
  delta: number | null,
  isStale: boolean,
): Promise<NativeCapabilityResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Live Activities are only available on iPhone.' }
  }

  try {
    const liveActivity = await getLiveActivityModule()
    if (!liveActivity) return { ok: false, message: LIVE_ACTIVITY_NATIVE_MESSAGE }

    const state = buildGlucoseActivityState(reading, unit, delta, isStale)
    if (activeActivityId) {
      await liveActivity.updateActivity(activeActivityId, state)
      return { ok: true, message: 'Lock Screen glucose updated.' }
    }

    const activityId = liveActivity.startActivity(state, LIVE_ACTIVITY_CONFIG)
    if (!activityId) {
      return { ok: false, message: LIVE_ACTIVITY_NATIVE_MESSAGE }
    }

    activeActivityId = activityId
    return { ok: true, message: 'Lock Screen glucose started.' }
  } catch (error) {
    activeActivityId = null
    return { ok: false, message: nativeErrorMessage(error, LIVE_ACTIVITY_NATIVE_MESSAGE) }
  }
}

export async function stopGlucoseLiveActivity(
  reading: GlucoseReading | null,
  unit: GlucoseUnit,
  delta: number | null,
  isStale: boolean,
): Promise<NativeCapabilityResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Live Activities are only available on iPhone.' }
  }

  if (!activeActivityId) {
    return { ok: true, message: 'No active Live Activity.' }
  }

  try {
    const liveActivity = await getLiveActivityModule()
    if (!liveActivity) return { ok: false, message: LIVE_ACTIVITY_NATIVE_MESSAGE }

    const state = reading
      ? buildGlucoseActivityState(reading, unit, delta, isStale)
      : { title: 'GlucoDesk', subtitle: 'Glucose monitoring stopped.' }

    await liveActivity.stopActivity(activeActivityId, state)
    activeActivityId = null
    return { ok: true, message: 'Live Activity stopped.' }
  } catch (error) {
    activeActivityId = null
    return { ok: false, message: nativeErrorMessage(error, 'Live Activity stop failed.') }
  }
}

function buildGlucoseActivityState(
  reading: GlucoseReading,
  unit: GlucoseUnit,
  delta: number | null,
  isStale: boolean,
): LiveActivityState {
  const displayValue = toDisplayValue(reading.value, unit)
  const deltaText = delta === null ? 'delta --' : `${delta > 0 ? '+' : ''}${toDisplayValue(delta, unit)} ${unit}`
  const freshness = isStale ? 'stale' : 'updated now'

  return {
    title: `${displayValue} ${unit}`,
    subtitle: `${TREND_ARROWS[reading.trend]} ${deltaText} | ${freshness}`,
  }
}

const LIVE_ACTIVITY_CONFIG: LiveActivityConfig = {
  backgroundColor: '#f8fafc',
  titleColor: '#0f766e',
  subtitleColor: '#334155',
  deepLinkUrl: 'glucodesk://current',
  padding: 12,
}

async function getLiveActivityModule(): Promise<LiveActivityModule | null> {
  if (Platform.OS !== 'ios') return null

  try {
    liveActivityModulePromise ??= import('expo-live-activity')
    return await liveActivityModulePromise
  } catch {
    liveActivityModulePromise = null
    return null
  }
}

function nativeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    if (isNativeModuleMissingMessage(error.message)) return fallback
    return error.message
  }
  return fallback
}

function isNativeModuleMissingMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('native module')
    || normalized.includes('expoliveactivity')
    || normalized.includes('cannot read')
    || normalized.includes('undefined')
    || normalized.includes('null')
}
