# GlucoDesk Agent Rules

- Keep the desktop Electron app working. Do not move the desktop app into `apps/desktop` unless the user explicitly starts that migration.
- Keep `packages/shared-core` platform-neutral. Do not import Electron, renderer code, IPC, `electron-store`, `safeStorage`, `better-sqlite3`, or other Node/Electron-only adapters there.
- Work in small vertical slices: keep the desktop app working, wire platform-neutral logic through shared-core, then verify.
- The mobile app already exists in `apps/mobile`; do not move it or the desktop app as part of the current mobile work.
- Apple Health and Live Activity code is allowed only inside thin mobile/native integration boundaries. Keep these adapters gated so Expo Go does not crash when native modules are unavailable.
- Do not add widgets, watchOS, backend/APNs, or broader Apple-specific integrations unless the user explicitly starts that increment.
- Do not run EAS build, submit, credential generation, or post-EAS setup steps unless the user explicitly asks for that step.
- After changes, run `npm run build`, `npm test`, and `npm run lint` when practical. Report any command that cannot be run or fails.
- For mobile changes, also run `npm run mobile:typecheck` and, when practical, `npx expo-doctor` from `apps/mobile`.
- At the end of each increment, write a concise follow-up prompt or handoff brief for the next actions, ideally covering the next one or two increments.
- Never commit secrets, tokens, credentials, `.env`, or local machine configuration.
- Do not rewrite git history, force push, or discard user changes unless explicitly asked.
