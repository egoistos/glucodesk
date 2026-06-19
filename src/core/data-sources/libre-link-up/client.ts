import { createHash } from 'crypto'
import log from 'electron-log'
import {
  buildLluHeaders,
  GLOBAL_LLU_BASE_URL,
  LluError,
  LluErrorCode,
  REGION_BASE_URL,
  type LluConnectionsResponse,
  type LluGraphResponse,
  type LluLoginRequest,
  type LluLoginResponse,
} from '@glucodesk/shared-core'

// ============================================================
// LibreLinkUp HTTP client
// Key insight: api-ru.libreview.io does not exist.
// RU users authenticate via api.libreview.ru.
// ============================================================

const buildHeaders = (clientVersion: string, token?: string, accountId?: string): Record<string, string> =>
  buildLluHeaders({
    clientVersion,
    token,
    accountIdHash: accountId ? createHash('sha256').update(accountId).digest('hex') : undefined,
  })

// Extract user ID from JWT token payload (base64 decoded)
export function extractUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
}

const BACKOFF_SEQUENCE = [60_000, 120_000, 240_000, 300_000]

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function lluFetch<T>(
  url: string,
  options: RequestInit,
  attempt = 0,
): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (response.status === 429) {
      const waitMs = BACKOFF_SEQUENCE[Math.min(attempt, BACKOFF_SEQUENCE.length - 1)]
      log.warn(`[LLU] HTTP 429. Waiting ${waitMs / 1000}s before retry...`)
      await sleep(waitMs)
      return lluFetch<T>(url, options, attempt + 1)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      log.error(`[LLU] Non-JSON response (${response.status}): ${text.slice(0, 200)}`)
      throw new LluError('Unexpected non-JSON response', LluErrorCode.RATE_LIMITED, response.status)
    }

    const json = await response.json() as Record<string, unknown>
    log.info(`[LLU] Response status field: ${json['status'] as number}`)

    const bodyStatus = json['status'] as number | undefined

    if (bodyStatus === 429) {
      const lockoutData = json['data'] as Record<string, unknown> | undefined
      const lockoutSec = (lockoutData?.['lockout'] as number | undefined) ?? 300
      const failures = (lockoutData?.['failures'] as number | undefined) ?? 0
      log.warn(`[LLU] Account locked: ${failures} failures, lockout ${lockoutSec}s. Not retrying.`)
      throw new LluError(
        `Too many login attempts. Wait ${Math.ceil(lockoutSec / 60)} min before trying again.`,
        LluErrorCode.RATE_LIMITED,
        429,
      )
    }

    return json as T
  } catch (err) {
    if (err instanceof LluError) throw err

    if (attempt < BACKOFF_SEQUENCE.length) {
      const waitMs = BACKOFF_SEQUENCE[attempt]
      log.warn(`[LLU] Network error, retry in ${waitMs / 1000}s: ${String(err)}`)
      await sleep(waitMs)
      return lluFetch<T>(url, options, attempt + 1)
    }

    throw new LluError(
      `Network error after retries: ${String(err)}`,
      LluErrorCode.NETWORK_ERROR,
    )
  }
}

export interface LoginResult {
  token: string
  expires: number
  region: string
  baseUrl: string
}

export async function login(
  credentials: LluLoginRequest,
  clientVersion: string,
  preferredRegion?: string,
): Promise<LoginResult> {
  const startUrl = preferredRegion
    ? `${REGION_BASE_URL(preferredRegion)}/llu/auth/login`
    : `${GLOBAL_LLU_BASE_URL}/llu/auth/login`

  log.info(`[LLU] Login attempt on ${startUrl}`)

  const response = await lluFetch<LluLoginResponse>(startUrl, {
    method: 'POST',
    headers: buildHeaders(clientVersion),
    body: JSON.stringify(credentials),
  })

  if ('data' in response && response.data && 'redirect' in response.data && response.data.redirect) {
    const region = response.data.region
    log.info(`[LLU] Redirected to region: ${region}`)
    const regionBaseUrl = REGION_BASE_URL(region)
    const regionResponse = await lluFetch<LluLoginResponse>(
      `${regionBaseUrl}/llu/auth/login`,
      { method: 'POST', headers: buildHeaders(clientVersion), body: JSON.stringify(credentials) },
    )
    return extractLoginResult(regionResponse, region, regionBaseUrl)
  }

  const region = preferredRegion ?? 'eu'
  const usedBaseUrl = preferredRegion ? REGION_BASE_URL(preferredRegion) : GLOBAL_LLU_BASE_URL
  return extractLoginResult(response, region, usedBaseUrl)
}

function extractLoginResult(response: LluLoginResponse, region: string, baseUrl: string): LoginResult {
  log.info(`[LLU] Extracting login result, region: ${region}, baseUrl: ${baseUrl}`)

  if ('data' in response && response.data && 'step' in response.data) {
    const stepType = response.data.step.type
    log.warn(`[LLU] Step required: ${stepType}`)
    const codeMap: Record<string, LluErrorCode> = {
      tou: LluErrorCode.TOU_REQUIRED,
      pp: LluErrorCode.PP_REQUIRED,
      verifyEmail: LluErrorCode.EMAIL_VERIFY_REQUIRED,
    }
    throw new LluError(`Action required: ${stepType}`, codeMap[stepType] ?? LluErrorCode.UNKNOWN)
  }

  if ('data' in response && response.data && 'authTicket' in response.data) {
    const { token, expires } = response.data.authTicket
    log.info(`[LLU] Login successful, region: ${region}, baseUrl: ${baseUrl}`)
    return { token, expires, region, baseUrl }
  }

  log.error(`[LLU] Unknown response format: ${JSON.stringify(response).slice(0, 300)}`)
  throw new LluError('Unexpected login response format', LluErrorCode.PARSE_ERROR)
}

export async function getConnections(
  baseUrl: string,
  token: string,
  clientVersion: string,
  accountId?: string,
): Promise<LluConnectionsResponse> {
  const result = await lluFetch<LluConnectionsResponse>(
    `${baseUrl}/llu/connections`,
    { method: 'GET', headers: buildHeaders(clientVersion, token, accountId) },
  )
  log.info(`[LLU] Connections raw: ${JSON.stringify(result).slice(0, 500)}`)
  return result
}

export async function getGraphData(
  baseUrl: string,
  patientId: string,
  token: string,
  clientVersion: string,
  accountId?: string,
): Promise<LluGraphResponse> {
  return lluFetch<LluGraphResponse>(
    `${baseUrl}/llu/connections/${patientId}/graph`,
    { method: 'GET', headers: buildHeaders(clientVersion, token, accountId) },
  )
}
