import { Platform } from 'react-native'
import { toDisplayValue, type GlucoseReading, type GlucoseUnit } from '@glucodesk/shared-core'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

export interface NativeCapabilityResult {
  ok: boolean
  message: string
}

const BLOOD_GLUCOSE_TYPE = 'HKQuantityTypeIdentifierBloodGlucose'
const HEALTHKIT_NATIVE_MESSAGE = 'Apple Health requires a custom iOS build.'

let healthKitModulePromise: Promise<HealthKitModule> | null = null

export async function requestAppleHealthAccess(): Promise<NativeCapabilityResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Apple Health is only available on iPhone.' }
  }

  try {
    const healthKit = await getHealthKitModule()
    if (!healthKit) return { ok: false, message: HEALTHKIT_NATIVE_MESSAGE }

    const available = await healthKit.isHealthDataAvailableAsync().catch(() => healthKit.isHealthDataAvailable())
    if (!available) {
      return { ok: false, message: 'Apple Health is not available on this device.' }
    }

    const granted = await healthKit.requestAuthorization({
      toShare: [BLOOD_GLUCOSE_TYPE],
      toRead: [BLOOD_GLUCOSE_TYPE],
    })

    return granted
      ? { ok: true, message: 'Apple Health connected.' }
      : { ok: false, message: 'Apple Health permission was not granted.' }
  } catch (error) {
    return { ok: false, message: nativeErrorMessage(error, HEALTHKIT_NATIVE_MESSAGE) }
  }
}

export async function writeAppleHealthGlucose(
  reading: GlucoseReading,
  displayUnit: GlucoseUnit,
): Promise<NativeCapabilityResult> {
  const access = await requestAppleHealthAccess()
  if (!access.ok) return access

  try {
    const healthKit = await getHealthKitModule()
    if (!healthKit) return { ok: false, message: HEALTHKIT_NATIVE_MESSAGE }

    await healthKit.saveQuantitySample(
      BLOOD_GLUCOSE_TYPE,
      'mg/dL',
      reading.value,
      reading.timestamp,
      reading.timestamp,
    )

    return {
      ok: true,
      message: `Synced ${toDisplayValue(reading.value, displayUnit)} ${displayUnit} to Apple Health.`,
    }
  } catch (error) {
    return { ok: false, message: nativeErrorMessage(error, 'Apple Health sync failed.') }
  }
}

async function getHealthKitModule(): Promise<HealthKitModule | null> {
  if (Platform.OS !== 'ios') return null

  try {
    healthKitModulePromise ??= import('@kingstinct/react-native-healthkit')
    return await healthKitModulePromise
  } catch {
    healthKitModulePromise = null
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
    || normalized.includes('nitro')
    || normalized.includes('cannot read')
    || normalized.includes('undefined')
    || normalized.includes('null')
}
