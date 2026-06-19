import { ipcMain, app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log'
import { IPC_CHANNELS } from '../../preload/ipc-types'
import type { LluConnectRequest, LluConnectResponse, PartialAppSettings } from '../../preload/ipc-types'
import { getSettings, updateSettings } from '../../core/store/settings'
import { getHistory, getLatestReading } from '../../core/store/history'
import {
  authenticateWithCredentials,
  clearToken,
} from '../../core/data-sources/libre-link-up/auth'
import { getConnections } from '../../core/data-sources/libre-link-up/client'
import { LluError, LluErrorCode } from '../../core/data-sources/libre-link-up/types'
import { stopPolling } from '../../core/scheduler/polling'
import { createOrFocusSettingsWindow } from '../windows/settings'
import { snoozeAlarm } from '../../core/alarms/engine'
import { calibrate, resetCalibration, getCalibrationOffset } from '../../core/calibration'
import { showWidget, hideWidget } from '../windows/widget'
import { applyWidgetSettings } from '../windows/widget'
import type { GlucoseReading } from '@glucodesk/shared-core'

// ============================================================
// IPC handlers — main process side
// ============================================================

// Shared state: latest glucose reading held in memory
let latestReading: GlucoseReading | null = null

export function setLatestReading(reading: GlucoseReading): void {
  latestReading = reading
}

export function registerIpcHandlers(): void {
  // ---- Glucose ----

  ipcMain.handle(IPC_CHANNELS.GET_GLUCOSE, () => {
    return latestReading ?? getLatestReading()
  })

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, (_event, hours: number) => {
    return getHistory(hours)
  })

  // ---- LLU Connection ----

  ipcMain.handle(IPC_CHANNELS.CONNECT_LLU, async (_event, req: LluConnectRequest): Promise<LluConnectResponse> => {
    try {
      const settings = getSettings()
      const cached = await authenticateWithCredentials(
        req.email,
        req.password,
        req.clientVersion ?? settings.lluClientVersion,
        req.region,
      )

      // Count connections
      const connectionsResponse = await getConnections(
        cached.baseUrl,
        cached.token,
        settings.lluClientVersion,
      )
      const patientCount = connectionsResponse.data?.length ?? 0

      return { success: true, region: cached.region, patientCount }
    } catch (err) {
      return handleLluError(err)
    }
  })

  ipcMain.handle(IPC_CHANNELS.DISCONNECT_LLU, () => {
    clearToken()
    stopPolling()
    log.info('[IPC] Disconnected from LLU')
  })

  ipcMain.handle(IPC_CHANNELS.TEST_CONNECTION, async (_event, req: LluConnectRequest): Promise<LluConnectResponse> => {
    try {
      const settings = getSettings()
      const cached = await authenticateWithCredentials(
        req.email,
        req.password,
        req.clientVersion ?? settings.lluClientVersion,
        req.region,
      )
      const connectionsResponse = await getConnections(
        cached.baseUrl,
        cached.token,
        settings.lluClientVersion,
      )
      const patientCount = connectionsResponse.data?.length ?? 0

      return { success: true, region: cached.region, patientCount }
    } catch (err) {
      // Don't save credentials on test failure
      clearToken()
      return handleLluError(err)
    }
  })

  // ---- Settings ----

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_event, partial: PartialAppSettings) => {
    updateSettings(partial)
    // Broadcast updated settings to all renderer windows (widget, settings)
    const updated = getSettings()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, updated)
      }
    }
    // Apply widget display changes immediately
    log.info('[IPC] SET_SETTINGS partial keys: ' + Object.keys(partial).join(', '))
    applyWidgetSettings(partial)
  })

  // ---- Calibration ----

  ipcMain.handle(IPC_CHANNELS.CALIBRATE, (_event, meterMgdl: number, sensorMgdl: number) => {
    return calibrate(meterMgdl, sensorMgdl)
  })

  ipcMain.handle(IPC_CHANNELS.RESET_CALIBRATION, () => {
    resetCalibration()
  })

  ipcMain.handle(IPC_CHANNELS.GET_CALIBRATION, () => {
    return getCalibrationOffset()
  })

  // ---- Alarms ----

  ipcMain.handle(IPC_CHANNELS.SNOOZE_ALARM, (_event, minutes?: number) => {
    snoozeAlarm(minutes)
  })

  // ---- Windows ----

  ipcMain.on(IPC_CHANNELS.SHOW_SETTINGS, () => {
    createOrFocusSettingsWindow()
  })

  ipcMain.on(IPC_CHANNELS.SHOW_WIDGET, () => {
    showWidget()
  })

  ipcMain.on(IPC_CHANNELS.HIDE_WIDGET, () => {
    hideWidget()
  })

  // ---- System ----

  ipcMain.handle(IPC_CHANNELS.SET_AUTOSTART, (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      name: 'GlucoDesk',
    })
    updateSettings({ autostart: enabled })
    log.info(`[IPC] Autostart ${enabled ? 'enabled' : 'disabled'}`)
  })

  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion()
  })

  // ---- Logs ----

  ipcMain.handle(IPC_CHANNELS.EXPORT_LOGS, () => {
    const logPath = path.join(app.getPath('userData'), 'logs', 'glucodesk.log')
    const desktop = app.getPath('desktop')
    const dest = path.join(desktop, 'glucodesk-log_' + new Date().toISOString().slice(0, 10) + '.log')
    try {
      fs.copyFileSync(logPath, dest)
      log.info('[IPC] Logs exported to ' + dest)
      return { success: true, path: dest }
    } catch (e) {
      log.error('[IPC] Log export failed:', e)
      return { success: false, error: String(e) }
    }
  })

  log.info('[IPC] Handlers registered')
}

function handleLluError(err: unknown): LluConnectResponse {
  if (err instanceof LluError) {
    log.warn(`[IPC] LLU error: ${err.code} — ${err.message}`)

    const requiresActionMap: Partial<Record<LluErrorCode, LluConnectResponse['requiresAction']>> = {
      [LluErrorCode.TOU_REQUIRED]: 'tou',
      [LluErrorCode.PP_REQUIRED]: 'pp',
      [LluErrorCode.EMAIL_VERIFY_REQUIRED]: 'verifyEmail',
    }

    const requiresAction = requiresActionMap[err.code]
    return {
      success: false,
      error: err.message,
      ...(requiresAction ? { requiresAction } : {}),
    }
  }

  log.error('[IPC] Unexpected error:', err)
  return { success: false, error: String(err) }
}
