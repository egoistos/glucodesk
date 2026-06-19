import type { GlucodeskAPI } from '../preload/index'

declare global {
  interface Window {
    glucodesk: GlucodeskAPI
  }
}
