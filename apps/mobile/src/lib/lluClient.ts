import * as Crypto from 'expo-crypto'
import {
  GLOBAL_LLU_BASE_URL,
  LluError,
  LluErrorCode,
  REGION_BASE_URL,
  buildLluHeaders,
  type LluConnectionsResponse,
  type LluGraphResponse,
  type LluLoginRequest,
  type LluLoginResponse,
} from '@glucodesk/shared-core'

const BACKOFF_SEQUENCE = [2_000, 5_000, 10_000]

export interface MobileLoginResult {
  token: string
  expires: number
  region: string
  baseUrl: string
  accountId: string | null
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function hashAccountId(accountId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, accountId)
}

async function buildHeaders(
  clientVersion: string,
  token?: string,
  accountId?: string | null,
): Promise<Record<string, string>> {
  return buildLluHeaders({
    clientVersion,
    token,
    accountIdHash: accountId ? await hashAccountId(accountId) : undefined,
  })
}

async function lluFetch<T>(url: string, options: RequestInit, attempt = 0): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (response.status === 429) {
      const waitMs = BACKOFF_SEQUENCE[Math.min(attempt, BACKOFF_SEQUENCE.length - 1)]
      await sleep(waitMs)
      return lluFetch<T>(url, options, attempt + 1)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new LluError('Unexpected non-JSON LibreLinkUp response', LluErrorCode.NETWORK_ERROR, response.status)
    }

    const json = await response.json() as Record<string, unknown>
    const bodyStatus = json['status'] as number | undefined

    if (bodyStatus === 429) {
      const lockoutData = json['data'] as Record<string, unknown> | undefined
      const lockoutSec = (lockoutData?.['lockout'] as number | undefined) ?? 300
      throw new LluError(
        `Too many login attempts. Wait ${Math.ceil(lockoutSec / 60)} min before trying again.`,
        LluErrorCode.RATE_LIMITED,
        429,
      )
    }

    if (!response.ok && bodyStatus !== 0) {
      throw new LluError(`LibreLinkUp request failed (${response.status})`, LluErrorCode.AUTH_FAILED, response.status)
    }

    return json as T
  } catch (error) {
    if (error instanceof LluError) throw error

    if (attempt < BACKOFF_SEQUENCE.length) {
      await sleep(BACKOFF_SEQUENCE[attempt])
      return lluFetch<T>(url, options, attempt + 1)
    }

    throw new LluError(`Network error after retries: ${String(error)}`, LluErrorCode.NETWORK_ERROR)
  }
}

export async function login(
  credentials: LluLoginRequest,
  clientVersion: string,
  preferredRegion?: string,
): Promise<MobileLoginResult> {
  const startUrl = preferredRegion
    ? `${REGION_BASE_URL(preferredRegion)}/llu/auth/login`
    : `${GLOBAL_LLU_BASE_URL}/llu/auth/login`

  const response = await lluFetch<LluLoginResponse>(startUrl, {
    method: 'POST',
    headers: await buildHeaders(clientVersion),
    body: JSON.stringify(credentials),
  })

  if ('data' in response && response.data && 'redirect' in response.data && response.data.redirect) {
    const region = response.data.region
    const regionBaseUrl = REGION_BASE_URL(region)
    const regionResponse = await lluFetch<LluLoginResponse>(
      `${regionBaseUrl}/llu/auth/login`,
      {
        method: 'POST',
        headers: await buildHeaders(clientVersion),
        body: JSON.stringify(credentials),
      },
    )
    return extractLoginResult(regionResponse, region, regionBaseUrl)
  }

  const region = preferredRegion ?? 'eu'
  const baseUrl = preferredRegion ? REGION_BASE_URL(preferredRegion) : GLOBAL_LLU_BASE_URL
  return extractLoginResult(response, region, baseUrl)
}

export async function getConnections(
  baseUrl: string,
  token: string,
  clientVersion: string,
  accountId?: string | null,
): Promise<LluConnectionsResponse> {
  return lluFetch<LluConnectionsResponse>(`${baseUrl}/llu/connections`, {
    method: 'GET',
    headers: await buildHeaders(clientVersion, token, accountId),
  })
}

export async function getGraphData(
  baseUrl: string,
  patientId: string,
  token: string,
  clientVersion: string,
  accountId?: string | null,
): Promise<LluGraphResponse> {
  return lluFetch<LluGraphResponse>(`${baseUrl}/llu/connections/${patientId}/graph`, {
    method: 'GET',
    headers: await buildHeaders(clientVersion, token, accountId),
  })
}

function extractLoginResult(response: LluLoginResponse, region: string, baseUrl: string): MobileLoginResult {
  if ('data' in response && response.data && 'step' in response.data) {
    const stepType = response.data.step.type
    const codeMap: Record<string, LluErrorCode> = {
      tou: LluErrorCode.TOU_REQUIRED,
      pp: LluErrorCode.PP_REQUIRED,
      verifyEmail: LluErrorCode.EMAIL_VERIFY_REQUIRED,
    }
    throw new LluError(`Action required: ${stepType}`, codeMap[stepType] ?? LluErrorCode.UNKNOWN)
  }

  if ('data' in response && response.data && 'authTicket' in response.data) {
    return {
      token: response.data.authTicket.token,
      expires: response.data.authTicket.expires,
      region,
      baseUrl,
      accountId: response.data.user?.id ?? null,
    }
  }

  throw new LluError('Unexpected login response format', LluErrorCode.PARSE_ERROR)
}
