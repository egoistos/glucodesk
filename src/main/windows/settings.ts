import { BrowserWindow } from 'electron'
import path from 'path'
import log from 'electron-log'

let settingsWindow: BrowserWindow | null = null

export function createOrFocusSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 520,
    minWidth: 540,
    minHeight: 460,
    title: 'GlucoDesk — Settings',
    frame: true,
    resizable: true,
    skipTaskbar: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  settingsWindow.setMenu(null)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    // Dev mode: vite serves from localhost:5173
    // electron-vite uses /settings.html for the second entry point
    void settingsWindow.loadURL(`${rendererUrl}/settings.html`)
  } else {
    void settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'))
  }

  settingsWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log.error(`[Settings] Failed to load: ${url} — ${code} ${desc}`)
  })

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
    settingsWindow?.focus()
    log.info('[Settings] Window opened')
  })

  // Destroy fully on close — recreate next time
  settingsWindow.on('closed', () => {
    settingsWindow = null
    log.info('[Settings] Window closed')
  })

  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

export function closeSettingsWindow(): void {
  settingsWindow?.destroy()
  settingsWindow = null
}
