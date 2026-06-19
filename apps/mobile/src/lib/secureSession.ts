import * as SecureStore from 'expo-secure-store'
import type { LluSession } from '../types'

const SESSION_KEY = 'glucodesk.llu.session.v1'

export async function loadSession(): Promise<LluSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as LluSession
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY)
    return null
  }
}

export async function saveSession(session: LluSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
