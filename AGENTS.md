# GlucoDesk Agent Rules

- Keep the desktop Electron app working. Do not move the desktop app into `apps/desktop` during Sprint 0+1.
- Keep `packages/shared-core` platform-neutral. Do not import Electron, renderer code, IPC, `electron-store`, `safeStorage`, `better-sqlite3`, or other Node/Electron-only adapters there.
- Work in small vertical slices: extract a narrow shared-core capability, wire it back into desktop, then verify.
- Do not create the mobile app until shared-core is connected back to desktop.
- Do not add HealthKit, Live Activity, widgets, watchOS, backend, or Apple-specific integrations in this increment.
- After changes, run `npm run build`, `npm test`, and `npm run lint` when practical. Report any command that cannot be run or fails.
- At the end of each increment, write a concise follow-up prompt or handoff brief for the next actions, ideally covering the next one or two increments.
- Never commit secrets, tokens, credentials, `.env`, or local machine configuration.
- Do not rewrite git history, force push, or discard user changes unless explicitly asked.
