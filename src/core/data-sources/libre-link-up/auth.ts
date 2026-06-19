import log from 'electron-log'
import { login, REGION_BASE_URL, extractUserIdFromToken, type LoginResult } from './client'
import { getSettings, savePassword, loadPassword, updateSettings } from '../../store/settings'
import { LluError, LluErrorCode } from './types'

// ============================================================
// Auth manager — handles token lifecycle
// Always starts login from global api.libreview.io,
// handles redirect to regional endpoint if needed.
// api-ru.libreview.io does NOT exist — RU users go via global.
// ============================================================

interface CachedToken {
  token: string
  expiresAt: number
  region: string
  baseUrl: string
  accountId: string | null  // SHA256 hashed in requests, raw here
}

let cachedToken: CachedToken | null = null

const EXPIRY_BUFFER_MS = 5 * 60 * 1000

export function isTokenValid(): boolean {
  if (!cachedToken) return false
  return Date.now() < cachedToken.expiresAt - EXPIRY_BUFFER_MS
}

export function getToken(): string | null {
  return isTokenValid() ? cachedToken!.token : null
}

export function getBaseUrl(): string | null {
  return isTokenValid() ? cachedToken!.baseUrl : null
}

export function getRegion(): string | null {
  return cachedToken?.region ?? null
}

export function getAccountId(): string | null {
  return cachedToken?.accountId ?? null
}

export function clearToken(): void {
  cachedToken = null
  log.info('[Auth] Token cleared')
}

export async function ensureAuthenticated(): Promise<CachedToken> {
  if (isTokenValid()) return cachedToken!
  log.info('[Auth] Token expired or missing, re-authenticating...')
  return authenticate()
}

export async function authenticate(): Promise<CachedToken> {
  const settings = getSettings()
  const password = loadPassword()

  log.info(`[Auth] authenticate() — email: "${settings.lluEmail ? settings.lluEmail.slice(0,3)+'***' : 'EMPTY'}", password: ${password ? 'present('+password.length+'chars)' : 'EMPTY'}, encrypted: ${settings.lluPasswordEncrypted ? 'present' : 'EMPTY'}`)

  if (!settings.lluEmail || !password) {
    throw new LluError(
      'LibreLinkUp credentials not configured',
      LluErrorCode.AUTH_FAILED,
    )
  }

  // Always start from global — never go directly to api-ru (doesn't exist)
  // Pass preferredRegion only if we already discovered it previously
  // and it's not 'ru' (since api-ru doesn't resolve)
  // RU region now correctly maps to api.libreview.ru via REGION_BASE_URL
  const preferredRegion = settings.lluRegion || undefined

  const result = await login(
    { email: settings.lluEmail, password },
    settings.lluClientVersion,
    preferredRegion,
  )

  return cacheLoginResult(result)
}

export async function authenticateWithCredentials(
  email: string,
  password: string,
  clientVersion: string,
  regionHint?: string,
): Promise<CachedToken> {
  // RU region correctly maps to api.libreview.ru via REGION_BASE_URL
  const safeRegion = regionHint || undefined

  const result = await login({ email, password }, clientVersion, safeRegion)

  updateSettings({
    lluEmail: email,
    lluRegion: result.region,
    lluClientVersion: clientVersion,
  })
  savePassword(password)

  return cacheLoginResult(result)
}

function cacheLoginResult(result: LoginResult): CachedToken {
  const accountId = extractUserIdFromToken(result.token)
  log.info(`[Auth] Extracted accountId from token: ${accountId ? accountId.slice(0, 8) + '...' : 'null'}`)

  const cached: CachedToken = {
    token: result.token,
    expiresAt: result.expires * 1000,
    region: result.region,
    baseUrl: result.baseUrl,
    accountId,
  }

  cachedToken = cached
  updateSettings({ lluRegion: result.region })

  log.info(`[Auth] Token cached, expires ${new Date(cached.expiresAt).toISOString()}, region: ${result.region}, baseUrl: ${cached.baseUrl}`)
  return cached
}

export { CachedToken }
