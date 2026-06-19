import { BrowserWindow, screen } from 'electron'
import path from 'path'
import log from 'electron-log'
import { getSettings, updateSettings } from '../../core/store/settings'

// ============================================================
// Widget window — frameless, transparent, always-on-top
// Floating glucose display
// ============================================================

let widgetWindow: BrowserWindow | null = null

const WIDGET_SIZES = {
  compact: { width: 140, height: 52 },
  normal: { width: 200, height: 110 },
  large: { width: 280, height: 150 },
}

export function createWidgetWindow(): BrowserWindow {
  const settings = getSettings()
  const size = WIDGET_SIZES[settings.widgetSize]

  // Determine initial position
  const savedPos = settings.widgetPosition
  let x: number
  let y: number

  if (savedPos) {
    x = savedPos.x
    y = savedPos.y
  } else {
    // Default: top-right corner with margin
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenW } = primaryDisplay.workAreaSize
    x = screenW - size.width - 20
    y = 20
  }

  widgetWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    alwaysOnTopLevel: 'screen-saver',
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Load widget renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    void widgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html`)
  } else {
    void widgetWindow.loadFile(path.join(__dirname, '../renderer/widget.html'))
  }

  // Set click-through if configured
  if (settings.widgetClickThrough) {
    widgetWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  widgetWindow.once('ready-to-show', () => {
    widgetWindow?.show()
    log.info(`[Widget] Window created at (${x}, ${y}), size: ${settings.widgetSize}`)
  })

  // Save position on move
  widgetWindow.on('moved', () => {
    if (!widgetWindow) return
    const [wx, wy] = widgetWindow.getPosition()
    updateSettings({ widgetPosition: { x: wx, y: wy } })
  })

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  return widgetWindow
}

export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindow
}

export function showWidget(): void {
  widgetWindow?.show()
}

export function hideWidget(): void {
  widgetWindow?.hide()
}

export function toggleWidget(): void {
  if (!widgetWindow) return
  widgetWindow.isVisible() ? widgetWindow.hide() : widgetWindow.show()
}

export function setClickThrough(enabled: boolean): void {
  if (!widgetWindow) return
  widgetWindow.setIgnoreMouseEvents(enabled, { forward: true })
  updateSettings({ widgetClickThrough: enabled })
}

export function resizeWidget(size: 'compact' | 'normal' | 'large'): void {
  if (!widgetWindow) return
  const { width, height } = WIDGET_SIZES[size]
  widgetWindow.setSize(width, height)
  updateSettings({ widgetSize: size })
}


/**
 * Apply display-related settings to widget window without restart.
 * Called when settings change via IPC.
 */
export function applyWidgetSettings(settings: {
  widgetSize?: 'compact' | 'normal' | 'large'
  widgetClickThrough?: boolean
}): void {
  if (!widgetWindow) return

  if (settings.widgetSize) {
    const { width, height } = WIDGET_SIZES[settings.widgetSize]
    // Electron ignores setSize on non-resizable transparent windows
    widgetWindow.setResizable(true)
    widgetWindow.setSize(width, height)
    widgetWindow.setResizable(false)
    log.info(`[Widget] Resized to ${settings.widgetSize} (${width}x${height})`)
  }

  if (settings.widgetClickThrough !== undefined) {
    widgetWindow.setIgnoreMouseEvents(settings.widgetClickThrough, { forward: true })
    log.info(`[Widget] Click-through: ${settings.widgetClickThrough}`)
  }
}