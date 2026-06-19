import { useState, useEffect, useCallback } from 'react'
import type { GlucoseReading } from '@glucodesk/shared-core'
import type { ConnectionStatus } from '../../../preload/ipc-types'

// ============================================================
// useGlucoseData — subscribes to glucose updates via IPC
// ============================================================

interface GlucoseDataState {
  current: GlucoseReading | null
  history: GlucoseReading[]
  connectionStatus: ConnectionStatus | null
  isStale: boolean
  delta: number | null
  error: string | null
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

export function useGlucoseData(): GlucoseDataState {
  const [current, setCurrent] = useState<GlucoseReading | null>(null)
  const [history, setHistory] = useState<GlucoseReading[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate delta from last two history entries
  const delta = history.length >= 2
    ? history[history.length - 1].value - history[history.length - 2].value
    : null

  const isStale = current
    ? Date.now() - current.timestamp.getTime() > STALE_THRESHOLD_MS
    : false

  const fetchInitialData = useCallback(async () => {
    try {
      const [latest, hist] = await Promise.all([
        window.glucodesk.getGlucose(),
        window.glucodesk.getHistory(3),
      ])
      if (latest) {
        // Deserialize timestamps (IPC strips Date objects to strings)
        setCurrent({
          ...latest,
          timestamp: new Date(latest.timestamp),
        })
      }
      setHistory(
        hist.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
      )
    } catch (err) {
      setError(String(err))
    }
  }, [])

  useEffect(() => {
    void fetchInitialData()

    // Subscribe to live updates
    const unsubGlucose = window.glucodesk.onGlucoseUpdate((reading) => {
      const normalized = { ...reading, timestamp: new Date(reading.timestamp) }
      setCurrent(normalized)
      setHistory((prev) => {
        // Keep last 3h of history (36 readings at 5-min intervals)
        const updated = [...prev, normalized].slice(-36)
        return updated
      })
      setError(null)
    })

    const unsubStatus = window.glucodesk.onConnectionStatus((status) => {
      setConnectionStatus({
        ...status,
        lastReadingTime: status.lastReadingTime ? new Date(status.lastReadingTime) : null,
      })
    })

    const unsubError = window.glucodesk.onError((msg) => {
      setError(msg)
    })

    return (): void => {
      unsubGlucose()
      unsubStatus()
      unsubError()
    }
  }, [fetchInitialData])

  return { current, history, connectionStatus, isStale, delta, error }
}
