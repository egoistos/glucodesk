// ============================================================
// LibreLinkUp API types — raw responses from Abbott API
// ============================================================

export interface LluLoginRequest {
  email: string
  password: string
}

export interface LluAuthTicket {
  token: string
  expires: number
  duration: number
}

// Redirect response: needs to retry on another region
export interface LluRedirectResponse {
  status: number
  data: {
    redirect: true
    region: string
  }
}

// ToU/PP/email step required
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
  FactoryTimestamp: string   // ISO string, factory-calibrated time
  Timestamp: string          // ISO string, local display time
  type: number
  ValueInMgPerDl: number
  TrendArrow: number         // 1–5, maps to TrendDirection
  Value: number              // mg/dL
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

// ---- Error types ----

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
