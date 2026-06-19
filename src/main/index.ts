import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import path from 'path'
import { createWidgetWindow, getWidgetWindow } from './windows/widget'
import { createTray, updateTrayWithReading, destroyTray } from './tray'
import { registerIpcHandlers, setLatestReading } from './ipc/glucose'
import { initHistoryDb, saveReading, closeHistoryDb, cleanOldReadings } from '../core/store/history'
import { ensureAuthenticated, getAccountId } from '../core/data-sources/libre-link-up/auth'
import { getConnections } from '../core/data-sources/libre-link-up/client'
import { mapLatestFromConnection, mapGraphData } from '../core/data-sources/libre-link-up/mapper'
import { startPolling, stopPolling } from '../core/scheduler/polling'
import { getSettings } from '../core/store/settings'
import { evaluateReading, setAlarmBroadcastCallback, clearAlarms } from '../core/alarms/engine'
import { applyCalibration } from '../core/calibration'
import { IPC_CHANNELS } from '../preload/ipc-types'
import type { GlucoseReading } from '@glucodesk/shared-core'

// ============================================================
// Main process entry point
// ============================================================

// Setup logging
log.transports.file.resolvePathFn = (): string =>
  path.join(app.getPath('userData'), 'logs', 'glucodesk.log')
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Single instance lock — prevent multiple copies
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  log.warn('[Main] Another instance is running, quitting')
  app.quit()
}

app.on('second-instance', () => {
  // Focus widget if user tries to launch a second instance
  const widget = getWidgetWindow()
  if (widget) {
    if (widget.isMinimized()) widget.restore()
    widget.show()
    widget.focus()
  }
})

app.on('ready', () => {
  log.info(`[Main] GlucoDesk ${app.getVersion()} starting...`)

  // Init SQLite
  initHistoryDb()
  cleanOldReadings(30)

  // Register all IPC handlers
  registerIpcHandlers()

  // Setup alarm broadcast
  setAlarmBroadcastCallback((event) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.ALARM_TRIGGERED, event)
      }
    }
  })

  // Create system tray
  createTray()

  // Create floating widget
  createWidgetWindow()

  // Start polling if credentials are configured
  const settings = getSettings()
  if (settings.lluEmail) {
    log.info('[Main] Credentials found, starting auto-connect...')
    startGlucosePolling()
  } else {
    log.info('[Main] No credentials configured — open Settings to connect')
  }
})

// Prevent quit when all windows are closed — stay in tray
app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})

app.on('before-quit', () => {
  log.info('[Main] Shutting down...')
  stopPolling()
  clearAlarms()
  closeHistoryDb()
  destroyTray()
})

// ---- Glucose polling ----

function startGlucosePolling(): void {
  startPolling(async () => {
    await fetchAndBroadcastGlucose()
  })
}

async function fetchAndBroadcastGlucose(): Promise<void> {
  try {
    const auth = await ensureAuthenticated()
    const settings = getSettings()

    const accountId = getAccountId()
    const connectionsResp = await getConnections(
      auth.baseUrl,
      auth.token,
      settings.lluClientVersion,
      accountId ?? undefined,
    )

    if (!connectionsResp.data || connectionsResp.data.length === 0) {
      log.warn('[Poll] No connections/patients found')
      return
    }

    // Select patient: use saved ID or first in list
    const patients = connectionsResp.data
    const selectedId = settings.lluSelectedPatientId
    const patient = selectedId
      ? (patients.find((p) => p.patientId === selectedId) ?? patients[0])
      : patients[0]

    const rawReading = mapLatestFromConnection(patient)
    const reading = { ...rawReading, value: applyCalibration(rawReading.value) }

    // Also persist graphData (12h history) if available
    // graphData comes from the connections endpoint directly
    const rawGraphData = patient.graphData
    if (Array.isArray(rawGraphData)) {
      const history = mapGraphData(rawGraphData)
      for (const r of history) {
        saveReading(r)
      }
    }

    // Save latest reading
    saveReading(reading)
    setLatestReading(reading)

    // Broadcast to all renderer windows
    broadcastReading(reading)

    // Evaluate alarms
    evaluateReading(reading)

    // Update tray
    updateTrayWithReading(reading)

    log.info(`[Poll] Reading: ${reading.value} mg/dL, trend: ${reading.trend}, time: ${reading.timestamp.toISOString()}`)
  } catch (err) {
    log.error('[Poll] Error fetching glucose:', err)
    broadcastError(String(err))
  }
}

function broadcastReading(reading: GlucoseReading): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.GLUCOSE_UPDATE, reading)
    }
  }
}

function broadcastError(message: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.ERROR_OCCURRED, message)
    }
  }
}
