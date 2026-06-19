import type { GlucoseReading } from '../../renderer/shared/types'

// ============================================================
// Abstract DataSource interface — allows adding Nightscout (Phase 2)
// without changing the rest of the app
// ============================================================

export interface DataSourceConfig {
  [key: string]: unknown
}

export interface DataSourceError {
  code: string
  message: string
  retryable: boolean
}

export interface DataSource {
  readonly name: string
  readonly isConnected: boolean

  connect(config: DataSourceConfig): Promise<void>
  disconnect(): Promise<void>
  fetchLatest(): Promise<GlucoseReading | null>
  fetchHistory(hours: number): Promise<GlucoseReading[]>

  on(event: 'reading', handler: (reading: GlucoseReading) => void): void
  on(event: 'error', handler: (error: DataSourceError) => void): void
  on(event: 'stale', handler: () => void): void
  off(event: 'reading' | 'error' | 'stale', handler: (...args: unknown[]) => void): void
}
