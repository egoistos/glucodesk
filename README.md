# GlucoDesk

Desktop glucose monitor for LibreLinkUp (Windows).

## Stack

- Electron + electron-vite
- React 18 + TypeScript (strict)
- Tailwind CSS
- Lightweight Charts (TradingView) for sparklines
- electron-store (settings) + better-sqlite3 (history)
- Zustand (state management)

## Setup

```bash
npm install
npm run dev       # Development mode
npm run build     # Build for production
npm run dist:win  # Build Windows NSIS installer
```

## Architecture

```
src/
├── main/          # Electron main process
├── core/          # Business logic (data sources, alarms, store, scheduler)
├── renderer/      # React UI (widget + settings windows)
├── preload/       # IPC bridge (typed API exposed to renderer)
└── assets/        # Icons, sounds, fonts
```

## Data Flow

1. `scheduler/polling.ts` — triggers every 60s (configurable)
2. `data-sources/libre-link-up/auth.ts` — ensures valid JWT
3. `data-sources/libre-link-up/client.ts` — fetches connections
4. `data-sources/libre-link-up/mapper.ts` — maps to `GlucoseReading`
5. `store/history.ts` — persists to SQLite
6. IPC broadcast → widget renderer → `useGlucoseData` hook → UI

## LibreLinkUp Region Auto-detect

Login flow:
1. POST to `api.libreview.io` (global)
2. If `{ redirect: true, region: 'ru' }` → retry on `api.libreview.ru`
3. Save detected region for subsequent requests

## Security

- Passwords encrypted via Electron `safeStorage` (DPAPI on Windows)
- `contextIsolation: true`, `nodeIntegration: false`
- All IPC through typed preload bridge only

## Phase Roadmap

- **Phase 0** ✅ Scaffold (this)
- **Phase 1.1** — LibreLinkUp client (auth + polling + error handling)
- **Phase 1.2** — Floating widget UI
- **Phase 1.3** — Tray icon
- **Phase 1.4** — Alarms
- **Phase 1.5** — Settings UI
- **Phase 1.6** — SQLite history + installer → MVP v0.1
- **Phase 2** — Nightscout, dashboard, multi-patient
