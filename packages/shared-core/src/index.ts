export enum TrendDirection {
  UNKNOWN = 0,
  FALLING_FAST = 1,
  FALLING = 2,
  STABLE = 3,
  RISING = 4,
  RISING_FAST = 5,
}

export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export type DataSourceType = 'libre-link-up' | 'nightscout'

export interface GlucoseReading {
  value: number
  trend: TrendDirection
  timestamp: Date
  source: DataSourceType
}

export interface AlarmThresholds {
  urgentHigh: number
  high: number
  low: number
  urgentLow: number
}

export interface StaleDataConfig {
  warningMinutes: number
  urgentMinutes: number
}

export type GlucoseZone = 'urgentLow' | 'low' | 'inRange' | 'high' | 'urgentHigh' | 'stale'

export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  urgentHigh: 250,
  high: 180,
  low: 70,
  urgentLow: 55,
}

export const DEFAULT_STALE_DATA_CONFIG: StaleDataConfig = {
  warningMinutes: 15,
  urgentMinutes: 30,
}

export const MGDL_PER_MMOL = 18.0182
export const MGDL_TO_MMOL = 1 / MGDL_PER_MMOL

export const TREND_ARROWS: Record<TrendDirection, string> = {
  [TrendDirection.UNKNOWN]: '?',
  [TrendDirection.FALLING_FAST]: '\u2193',
  [TrendDirection.FALLING]: '\u2198',
  [TrendDirection.STABLE]: '\u2192',
  [TrendDirection.RISING]: '\u2197',
  [TrendDirection.RISING_FAST]: '\u2191',
}

export function mapLibreTrendArrow(trendArrow: number): TrendDirection {
  if (trendArrow >= TrendDirection.FALLING_FAST && trendArrow <= TrendDirection.RISING_FAST) {
    return trendArrow as TrendDirection
  }
  return TrendDirection.UNKNOWN
}

export const ZONE_COLORS: Record<GlucoseZone, string> = {
  urgentLow: '#dc2626',
  low: '#f97316',
  inRange: '#16a34a',
  high: '#eab308',
  urgentHigh: '#dc2626',
  stale: '#6b7280',
}

export type AlarmEventType = Exclude<GlucoseZone, 'inRange'>

export interface GlucoseAlarmEvent {
  type: AlarmEventType
  value: number
  timestamp: Date
}

export interface AlarmSnoozeState {
  zone: GlucoseZone
  expiresAt: number
}

export interface AlarmEvaluationContext {
  thresholds: AlarmThresholds
  staleDataConfig: StaleDataConfig
  nowMs?: number
  lastFiredZone?: GlucoseZone | null
  snoozes?: ReadonlyMap<string, AlarmSnoozeState>
}

export interface AlarmEvaluationResult {
  event: GlucoseAlarmEvent | null
  zone: GlucoseZone | 'inRange'
  shouldClearActiveAlarm: boolean
  reason: 'alarm' | 'inRange' | 'sameZone' | 'snoozed'
  expiredSnoozeZones: GlucoseZone[]
}

export const ALARM_ZONES: GlucoseZone[] = ['urgentLow', 'low', 'high', 'urgentHigh']

export const ZONE_TO_ALARM_EVENT: Record<GlucoseZone, AlarmEventType | null> = {
  urgentLow: 'urgentLow',
  low: 'low',
  inRange: null,
  high: 'high',
  urgentHigh: 'urgentHigh',
  stale: 'stale',
}

export const GLOBAL_LLU_BASE_URL = 'https://api.libreview.io'
export const RU_LLU_BASE_URL = 'https://api.libreview.ru'

export const LLU_REGIONS_WITH_SUBDOMAIN = [
  'ae',
  'ap',
  'au',
  'ca',
  'de',
  'eu',
  'eu2',
  'fr',
  'jp',
  'la',
  'us',
] as const

export type LluKnownSubdomainRegion = (typeof LLU_REGIONS_WITH_SUBDOMAIN)[number]

const LLU_SUBDOMAIN_REGION_SET = new Set<string>(LLU_REGIONS_WITH_SUBDOMAIN)

export interface LluLoginRequest {
  email: string
  password: string
}

export interface LluAuthTicket {
  token: string
  expires: number
  duration: number
}

export interface LluRedirectResponse {
  status: number
  data: {
    redirect: true
    region: string
  }
}

export interface LluStepResponse {
  status: number
  data: {
    step: {
      type: 'tou' | 'pp' | 'verifyEmail'
      componentName?: string
      props?: Record<string, unknown>
    }
    user?: LluUser
  }
}

export interface LluLoginSuccess {
  status: number
  data: {
    redirect?: false
    authTicket: LluAuthTicket
    user: LluUser
  }
}

export type LluLoginResponse = LluRedirectResponse | LluStepResponse | LluLoginSuccess

export interface LluUser {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
}

export interface LluGlucoseMeasurement {
  FactoryTimestamp: string
  Timestamp: string
  type: number
  ValueInMgPerDl: number
  TrendArrow: number
  Value: number
  isHigh: boolean
  isLow: boolean
}

export interface LluPatientDevice {
  deviceId: string
  serialNumber: string
  sensorInfo?: {
    activationTime?: { systemUtc?: number }
    wearDuration?: number
  }
}

export interface LluConnection {
  patientId: string
  firstName: string
  lastName: string
  targetHigh: number
  targetLow: number
  glucoseMeasurement: LluGlucoseMeasurement
  glucoseItem: LluGlucoseMeasurement
  graphData?: LluGlucoseMeasurement[]
  glucoseAlarm?: unknown
  patientDevice: LluPatientDevice
  created: number
}

export interface LluGraphData {
  connection: LluConnection
  activeSensors: LluPatientDevice[]
  graphData: LluGlucoseMeasurement[]
}

export interface LluConnectionsResponse {
  status: number
  data: LluConnection[]
  ticket: LluAuthTicket
}

export interface LluGraphResponse {
  status: number
  data: LluGraphData
  ticket: LluAuthTicket
}

export enum LluErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  REDIRECT_REQUIRED = 'REDIRECT_REQUIRED',
  TOU_REQUIRED = 'TOU_REQUIRED',
  PP_REQUIRED = 'PP_REQUIRED',
  EMAIL_VERIFY_REQUIRED = 'EMAIL_VERIFY_REQUIRED',
  NO_CONNECTIONS = 'NO_CONNECTIONS',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class LluError extends Error {
  constructor(
    message: string,
    public readonly code: LluErrorCode,
    public readonly httpStatus?: number,
  ) {
    super(message)
    this.name = 'LluError'
  }
}

export type AccountIdHasher = (accountId: string) => string | Promise<string>

export interface LluHeaderOptions {
  clientVersion: string
  token?: string
  accountIdHash?: string
}

export function toMmolL(mgdl: number): number {
  return mgdl * MGDL_TO_MMOL
}

export function toMgDl(mmolL: number): number {
  return mmolL * MGDL_PER_MMOL
}

export function toDisplayValue(mgdl: number, unit: GlucoseUnit): string {
  if (unit === 'mmol/L') {
    return toMmolL(mgdl).toFixed(1)
  }
  return Math.round(mgdl).toString()
}

export function fromDisplayValue(display: string, unit: GlucoseUnit): number {
  const parsed = Number.parseFloat(display)
  if (Number.isNaN(parsed)) return 0
  return unit === 'mmol/L' ? Math.round(toMgDl(parsed)) : Math.round(parsed)
}

export function calculateCalibrationOffset(meterValueMgdl: number, sensorValueMgdl: number): number {
  return meterValueMgdl - sensorValueMgdl
}

export function applyCalibrationOffset(sensorValueMgdl: number, offsetMgdl: number): number {
  if (offsetMgdl === 0) return sensorValueMgdl
  return Math.max(0, sensorValueMgdl + offsetMgdl)
}

export function classifyZone(value: number, thresholds: AlarmThresholds): GlucoseZone {
  if (value <= thresholds.urgentLow) return 'urgentLow'
  if (value <= thresholds.low) return 'low'
  if (value >= thresholds.urgentHigh) return 'urgentHigh'
  if (value >= thresholds.high) return 'high'
  return 'inRange'
}

export function evaluateGlucoseAlarm(
  reading: GlucoseReading,
  context: AlarmEvaluationContext,
): AlarmEvaluationResult {
  const nowMs = context.nowMs ?? Date.now()
  const expiredSnoozeZones = getExpiredSnoozeZones(context.snoozes, nowMs)
  const staleMinutes = (nowMs - reading.timestamp.getTime()) / 60_000
  const zone: GlucoseZone = staleMinutes >= context.staleDataConfig.urgentMinutes
    ? 'stale'
    : classifyZone(reading.value, context.thresholds)

  if (!ALARM_ZONES.includes(zone) && zone !== 'stale') {
    return {
      event: null,
      zone,
      shouldClearActiveAlarm: true,
      reason: 'inRange',
      expiredSnoozeZones,
    }
  }

  if (isZoneSnoozed(zone, context.snoozes, nowMs)) {
    return {
      event: null,
      zone,
      shouldClearActiveAlarm: false,
      reason: 'snoozed',
      expiredSnoozeZones,
    }
  }

  if (zone === context.lastFiredZone) {
    return {
      event: null,
      zone,
      shouldClearActiveAlarm: false,
      reason: 'sameZone',
      expiredSnoozeZones,
    }
  }

  const type = ZONE_TO_ALARM_EVENT[zone]
  return {
    event: type
      ? {
          type,
          value: reading.value,
          timestamp: reading.timestamp,
        }
      : null,
    zone,
    shouldClearActiveAlarm: false,
    reason: 'alarm',
    expiredSnoozeZones,
  }
}

export function isZoneSnoozed(
  zone: GlucoseZone,
  snoozes: ReadonlyMap<string, AlarmSnoozeState> | undefined,
  nowMs = Date.now(),
): boolean {
  const snooze = snoozes?.get(zone)
  return Boolean(snooze && nowMs < snooze.expiresAt)
}

export function getExpiredSnoozeZones(
  snoozes: ReadonlyMap<string, AlarmSnoozeState> | undefined,
  nowMs = Date.now(),
): GlucoseZone[] {
  if (!snoozes) return []
  const expired: GlucoseZone[] = []
  for (const snooze of snoozes.values()) {
    if (nowMs >= snooze.expiresAt) {
      expired.push(snooze.zone)
    }
  }
  return expired
}

export function normalizeLluRegion(region?: string | null): string | null {
  const normalized = region?.trim().toLowerCase()
  return normalized ? normalized : null
}

export function resolveLluBaseUrl(region?: string | null): string {
  const normalized = normalizeLluRegion(region)
  if (!normalized) return GLOBAL_LLU_BASE_URL
  if (normalized === 'ru') return RU_LLU_BASE_URL
  return LLU_SUBDOMAIN_REGION_SET.has(normalized)
    ? `https://api-${normalized}.libreview.io`
    : GLOBAL_LLU_BASE_URL
}

export const REGION_BASE_URL = resolveLluBaseUrl

export function buildLluHeaders(options: LluHeaderOptions): Record<string, string> {
  return {
    'accept-encoding': 'gzip',
    'cache-control': 'no-cache',
    'connection': 'Keep-Alive',
    'content-type': 'application/json',
    'product': 'llu.android',
    'version': options.clientVersion,
    ...(options.token ? { 'authorization': `Bearer ${options.token}` } : {}),
    ...(options.accountIdHash ? { 'account-id': options.accountIdHash } : {}),
  }
}

export function parseLluTimestamp(raw: string): Date {
  if (!raw) return new Date()

  const iso = new Date(raw)
  if (!Number.isNaN(iso.getTime())) return iso

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i)
  if (match) {
    const [, month, day, year, hourRaw, min, sec, ampm] = match
    let hour = Number.parseInt(hourRaw, 10)
    if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      hour,
      Number.parseInt(min, 10),
      Number.parseInt(sec, 10),
    )
  }

  return new Date(raw)
}

export function mapMeasurement(measurement: LluGlucoseMeasurement): GlucoseReading {
  return {
    value: measurement.ValueInMgPerDl ?? measurement.Value,
    trend: mapLibreTrendArrow(measurement.TrendArrow),
    timestamp: parseLluTimestamp(measurement.Timestamp ?? measurement.FactoryTimestamp),
    source: 'libre-link-up',
  }
}

export function mapGraphData(measurements: LluGlucoseMeasurement[]): GlucoseReading[] {
  return measurements
    .map(mapMeasurement)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export function mapLatestFromConnection(connection: LluConnection): GlucoseReading {
  return mapMeasurement(connection.glucoseMeasurement ?? connection.glucoseItem)
}

export function calculateDelta(readings: GlucoseReading[]): number | null {
  if (readings.length < 2) return null
  const last = readings[readings.length - 1]
  const previous = readings[readings.length - 2]
  return last.value - previous.value
}
