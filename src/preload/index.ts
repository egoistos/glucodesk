import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc-types'
import type {
  LluConnectRequest,
  LluConnectResponse,
  AppSettings,
  PartialAppSettings,
  ConnectionStatus,
  AlarmEvent,
} from './ipc-types'
import type { GlucoseReading } from '../renderer/shared/types'

// ============================================================
// Preload: exposes typed API to renderer via contextBridge
// All IPC goes through this — no direct ipcRenderer in renderer
// ============================================================

const glucodeskAPI = {
  // ---- Glucose data ----
  getGlucose: (): Promise<GlucoseReading | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GLUCOSE),

  getHistory: (hours: number): Promise<GlucoseReading[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY, hours),

  onGlucoseUpdate: (callback: (reading: GlucoseReading) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, reading: GlucoseReading): void =>
      callback(reading)
    ipcRenderer.on(IPC_CHANNELS.GLUCOSE_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.GLUCOSE_UPDATE, handler)
  },

  // ---- Connection ----
  connectLlu: (request: LluConnectRequest): Promise<LluConnectResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECT_LLU, request),

  disconnectLlu: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_LLU),

  testConnection: (request: LluConnectRequest): Promise<LluConnectResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEST_CONNECTION, request),

  onConnectionStatus: (callback: (status: ConnectionStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: ConnectionStatus): void =>
      callback(status)
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONNECTION_STATUS, handler)
  },

  // ---- Settings ----
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),

  setSettings: (settings: PartialAppSettings): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings),

  // ---- Windows ----
  showSettings: (): void => ipcRenderer.send(IPC_CHANNELS.SHOW_SETTINGS),
  showWidget: (): void => ipcRenderer.send(IPC_CHANNELS.SHOW_WIDGET),
  hideWidget: (): void => ipcRenderer.send(IPC_CHANNELS.HIDE_WIDGET),

  // ---- System ----
  setAutostart: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_AUTOSTART, enabled),

  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  exportLogs: (): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_LOGS),

  // ---- Alarms ----
  snoozeAlarm: (minutes?: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SNOOZE_ALARM, minutes),

  onAlarmTriggered: (callback: (event: AlarmEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, alarmEvent: AlarmEvent): void =>
      callback(alarmEvent)
    ipcRenderer.on(IPC_CHANNELS.ALARM_TRIGGERED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ALARM_TRIGGERED, handler)
  },

  // ---- Calibration ----
  calibrate: (meterMgdl: number, sensorMgdl: number): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.CALIBRATE, meterMgdl, sensorMgdl),

  resetCalibration: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_CALIBRATION),

  getCalibrationOffset: (): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CALIBRATION),

  // ---- Settings updates ----
  onSettingsChanged: (callback: (settings: AppSettings) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: AppSettings): void =>
      callback(settings)
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, handler)
  },

  // ---- Errors ----
  onError: (callback: (message: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string): void =>
      callback(message)
    ipcRenderer.on(IPC_CHANNELS.ERROR_OCCURRED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ERROR_OCCURRED, handler)
  },
}

// Expose typed API under window.glucodesk
contextBridge.exposeInMainWorld('glucodesk', glucodeskAPI)

// Type declaration for renderer process
export type GlucodeskAPI = typeof glucodeskAPI
