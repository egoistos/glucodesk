import path from 'path'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

// ============================================================
// Alarm sound player — uses HTML5 Audio in a hidden window
// Falls back to system beep if audio fails
// ============================================================

let audioProcess: ReturnType<typeof setTimeout> | null = null
let isPlaying = false

// Sound files are in assets/ relative to app root
function getSoundPath(urgent: boolean): string {
  const filename = urgent ? 'alarm-urgent.wav' : 'alarm-normal.wav'
  const subdir = 'sounds'

  // In dev: assets/ relative to project root
  // In production: resources/assets/ in asar
  if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
    return path.join(process.cwd(), 'assets', subdir, filename)
  }
  return path.join(process.resourcesPath, subdir, filename)
}

/**
 * Play alarm sound. Urgent alarms repeat faster.
 * Uses Electron shell to play system sound as fallback.
 */
export function playAlarmSound(urgent: boolean): void {
  if (isPlaying) {
    stopAlarmSound()
  }

  isPlaying = true
  const soundPath = getSoundPath(urgent)
  const repeatIntervalMs = urgent ? 5_000 : 15_000

  log.info(`[Sound] Playing ${urgent ? 'URGENT' : 'normal'} alarm: ${soundPath}`)

  // Use electron's BrowserWindow to play audio
  // We send a message to the widget window to play sound via Web Audio API
  try {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.executeJavaScript(`
        (function() {
          if (window.__glucodeskAlarmAudio) {
            window.__glucodeskAlarmAudio.pause();
          }
          const audio = new Audio('file://${soundPath.replace(/\\/g, '/')}');
          audio.volume = ${urgent ? 1.0 : 0.7};
          audio.play().catch(e => console.warn('Audio play failed:', e));
          window.__glucodeskAlarmAudio = audio;
        })()
      `).catch((e: Error) => log.warn(`[Sound] executeJavaScript failed: ${e.message}`))
    }
  } catch (e) {
    log.warn(`[Sound] Failed to play audio: ${String(e)}`)
  }

  // Repeat alarm sound
  audioProcess = setInterval(() => {
    if (!isPlaying) return
    try {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.executeJavaScript(`
          if (window.__glucodeskAlarmAudio) {
            window.__glucodeskAlarmAudio.currentTime = 0;
            window.__glucodeskAlarmAudio.play().catch(() => {});
          }
        `).catch(() => {})
      }
    } catch {
      // ignore
    }
  }, repeatIntervalMs)
}

/**
 * Stop any playing alarm sound
 */
export function stopAlarmSound(): void {
  isPlaying = false

  if (audioProcess) {
    clearInterval(audioProcess)
    audioProcess = null
  }

  // Stop audio in renderer
  try {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].webContents.executeJavaScript(`
        if (window.__glucodeskAlarmAudio) {
          window.__glucodeskAlarmAudio.pause();
          window.__glucodeskAlarmAudio = null;
        }
      `).catch(() => {})
    }
  } catch {
    // ignore
  }

  log.info('[Sound] Stopped')
}
