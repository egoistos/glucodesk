import { Tray, Menu, nativeImage, app } from 'electron'
import log from 'electron-log'
import { toggleWidget, showWidget } from './windows/widget'
import { createOrFocusSettingsWindow } from './windows/settings'
import type { GlucoseReading } from '../renderer/shared/types'
import { toDisplayValue, TREND_ARROWS, TrendDirection, classifyZone } from '../renderer/shared/types'
import { getSettings } from '../core/store/settings'

// ============================================================
// System tray — colored circle icon based on glucose zone
// ============================================================

let tray: Tray | null = null

/** Generate a 16x16 colored circle as tray icon */
function createCircleIcon(color: string): Electron.NativeImage {
  // Create a data URL with an SVG circle
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <circle cx="8" cy="8" r="7" fill="${color}" />
  </svg>`
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  return nativeImage.createFromDataURL(dataUrl)
}

const ZONE_ICON_COLORS: Record<string, string> = {
  inRange: '#16a34a',    // green
  high: '#eab308',       // yellow
  urgentHigh: '#dc2626', // red
  low: '#f97316',        // orange
  urgentLow: '#dc2626',  // red
  stale: '#6b7280',      // gray
  default: '#6b7280',    // gray
}

export function createTray(): Tray {
  const icon = createCircleIcon(ZONE_ICON_COLORS.default)

  tray = new Tray(icon)
  tray.setToolTip('GlucoDesk — Loading...')

  updateTrayMenu()

  tray.on('double-click', () => {
    showWidget()
  })

  log.info('[Tray] Created')
  return tray
}

export function updateTrayWithReading(reading: GlucoseReading | null): void {
  if (!tray) return

  const settings = getSettings()

  if (!reading) {
    tray.setToolTip('GlucoDesk — No data')
    tray.setImage(createCircleIcon(ZONE_ICON_COLORS.default))
    return
  }

  const displayValue = toDisplayValue(reading.value, settings.glucoseUnit)
  const arrow = TREND_ARROWS[reading.trend] ?? TREND_ARROWS[TrendDirection.UNKNOWN]
  const label = `${displayValue} ${arrow}`

  tray.setToolTip(`GlucoDesk  ${label} (${settings.glucoseUnit})`)

  // Update icon color based on zone
  const zone = classifyZone(reading.value, settings.alarmThresholds)
  const iconColor = ZONE_ICON_COLORS[zone] ?? ZONE_ICON_COLORS.default
  tray.setImage(createCircleIcon(iconColor))

  updateTrayMenu(reading)
}

function updateTrayMenu(reading?: GlucoseReading | null): void {
  if (!tray) return

  const settings = getSettings()
  const readingLabel = reading
    ? `${toDisplayValue(reading.value, settings.glucoseUnit)} ${TREND_ARROWS[reading.trend]}`
    : 'No data'

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Glucose: ${readingLabel}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show / Hide Widget',
      click: () => toggleWidget(),
    },
    {
      label: 'Settings...',
      click: () => createOrFocusSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit GlucoDesk',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
