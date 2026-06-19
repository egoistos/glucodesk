# GlucoDesk Next Chat Handoff

Date: 2026-06-19.

## Current Project State

- Repository: `H:\Dev\glucodesk`.
- Branch: `main`.
- Remote: `origin https://github.com/egoistos/glucodesk.git`.
- Desktop app: Electron app in `src/`, still the stable Windows client.
- Shared package: `packages/shared-core`, platform-neutral TypeScript logic.
- Mobile app: `apps/mobile`, Expo SDK 54, React Native, TypeScript.
- Expo Go MVP is working on iPhone for LibreLinkUp login, current glucose,
  trend, delta, history, settings, foreground polling, local alarms, and chart.
- EAS profiles are configured, but EAS build/submit/credential steps are paused
  until the user explicitly approves them.
- Apple Health write-sync wiring exists through
  `apps/mobile/src/lib/appleHealth.ts`.
- Dynamic Island / Lock Screen Live Activity wiring exists through
  `apps/mobile/src/lib/liveActivity.ts`.
- HealthKit and Live Activity are native-only. Expo Go should show fallback
  statuses instead of crashing.

## Most Recent Completed Increment

Implemented and committed:

- Apple Health Settings toggle and explicit connect action.
- HealthKit permission request and blood glucose sample write adapter.
- Live Activity Settings toggle, update, and stop actions.
- Live Activity model: glucose value, unit, trend, delta, freshness.
- iOS app config for HealthKit usage descriptions and Live Activities.
- Native-only fallback behavior for Expo Go.
- Build notes updated.

Verified:

- `npm run mobile:typecheck`
- `npx expo-doctor`
- `npx expo export --platform ios --output-dir dist-native-surface-smoke`
- `npm run build`
- `npm test -- --run`
- `npm run lint`

## Next Increment Goal

Harden the native-only Apple surfaces before the first development/internal EAS
build. Do not run EAS build/submit/credentials yet.

## Plan

1. Inspect current git status and latest commits.
2. Read `AGENTS.md`, `apps/mobile/AGENTS.md`, `README.md`,
   `docs/mobile-ipa-build.md`, and this file.
3. Verify Expo native config without building:
   `npx expo config --type introspect` from `apps/mobile`.
4. Confirm HealthKit usage descriptions and native plugin config are present.
5. Confirm Live Activity config includes `NSSupportsLiveActivities` and push
   updates remain disabled.
6. Add JS-level tests or a small testable seam for native adapter fallback
   behavior if practical.
7. Decide whether `expo-live-activity` is acceptable for the first native test
   build despite deprecation, or whether to replace it before EAS build.
8. Run:

```powershell
npm run mobile:typecheck
cd apps/mobile
npx expo-doctor
npx expo export --platform ios --output-dir dist-ci
Remove-Item -Recurse -Force dist-ci
cd ../..
npm run build
npm test -- --run
npm run lint
```

9. Commit documentation/code changes.
10. Prepare a go/no-go note for the first `development` EAS build.

## Prompt For The Next Chat

```text
Ты senior Apple/React Native разработчик. Продолжаем GlucoDesk в H:\Dev\glucodesk.

Сначала прочитай AGENTS.md, apps/mobile/AGENTS.md, README.md, docs/mobile-ipa-build.md и docs/next-chat-handoff.md.

Контекст:
- desktop Electron app должен оставаться рабочим;
- shared-core уже подключен;
- mobile Expo MVP работает в Expo Go;
- EAS setup есть, но build/submit/credentials пока не выполнять без моего явного разрешения;
- Apple Health и Dynamic Island / Lock Screen Live Activity wiring уже добавлены, но требуют custom iOS development/internal build и не работают в Expo Go.

Цель:
Захарднить native-only Apple surfaces перед первым development/internal EAS build, не запуская сам EAS build.

Сделай:
1. Проверь git status и последние коммиты.
2. Проверь Expo native config через npx expo config --type introspect из apps/mobile.
3. Проверь HealthKit config, Live Activity config и fallback behavior в Expo Go.
4. Добавь JS-level тесты/fallback seam для native adapters, если это разумно без нативной сборки.
5. Оцени риск deprecated expo-live-activity: оставить на первый dev build или заменить до сборки.
6. Запусти mobile:typecheck, expo-doctor, expo export --platform ios, npm run build, npm test -- --run, npm run lint.
7. Закоммить изменения.
8. Дай короткий go/no-go план для первого development EAS build.

Ограничения:
- Не запускать EAS build/submit/credentials.
- Не добавлять widgets, watchOS, backend/APNs без отдельного решения.
- Не коммитить secrets, tokens, .env, .p8, .p12, .mobileprovision.
- Не переписывать историю и не force push.
```

## Risks To Keep Visible

- Expo Go cannot validate HealthKit or ActivityKit native behavior.
- `expo-live-activity` is deprecated, so it may be acceptable only as a first
  native-build probe.
- Reliable near-real-time Lock Screen freshness likely needs backend/APNs later.
- HealthKit and ActivityKit entitlement edge cases may require macOS/Xcode for
  final debugging.
