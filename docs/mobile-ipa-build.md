# GlucoDesk Mobile IPA Build

Date: 2026-06-19.

This repo is prepared for iOS builds through Expo EAS from Windows. The mobile app lives in
`apps/mobile` and currently uses Expo SDK 54 for compatibility with the installed iPhone Expo Go client.

## Current Build Profiles

`apps/mobile/eas.json` defines:

- `development`: internal development client with `expo-dev-client`.
- `preview`: internal standalone build for registered devices. This is the first installable `.ipa` target.
- `production`: App Store/TestFlight build with auto-incremented build number.

Expo reference:

- EAS profiles live in `eas.json`, under the `build` key: https://docs.expo.dev/build/eas-json/
- Internal distribution produces direct install links for testers: https://docs.expo.dev/build/internal-distribution/
- iOS device builds require Apple Developer permissions for signing credentials: https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/

## Local Windows Commands

From repo root:

```powershell
npm ci
npm run build
npm test -- --run
npm run lint
npm run mobile:typecheck
```

Smoke-test the iOS JS bundle:

```powershell
cd apps/mobile
npx expo export --platform ios --output-dir dist-ci
Remove-Item -Recurse -Force dist-ci
```

## First EAS Setup

Run from `apps/mobile`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

If the Expo project is not initialized yet:

```powershell
npx eas-cli@latest init
```

Do not commit generated credentials, local credential files, `.env`, `.p8`, `.p12`, `.mobileprovision`, or Expo tokens.

## Build IPA

Development client for iteration:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform ios --profile development
```

Standalone internal `.ipa`:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform ios --profile preview
```

Production/TestFlight:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

## Required External State

The code/config can be completed on Windows, but the actual `.ipa` requires:

- Expo account login or `EXPO_TOKEN`.
- Apple Developer Program membership.
- Permission to create or use iOS signing credentials.
- Registered test devices for internal/ad hoc installation, unless using TestFlight.

Once EAS finishes, Expo provides an install URL/QR for internal builds or a submitted build in App Store Connect for TestFlight.

## Current MVP Capability

The mobile app currently includes:

- LibreLinkUp login with region redirect handling.
- Secure session storage through Expo SecureStore.
- SQLite-backed local reading history and settings.
- Current reading, trend, delta, stale state, patient selection, and history chart.
- Foreground polling and app-active refresh.
- Pure shared-core alarm evaluation with Expo local notifications.
- Apple Health write-sync wiring for blood glucose samples, gated behind explicit Settings consent.
- Dynamic Island / Lock Screen Live Activity wiring for current glucose, trend, delta, and freshness.

Not included in this increment:

- Widgets.
- Watch surfaces.
- Backend/APNs realtime poller.

## Native iOS Surface Notes

Apple Health and Live Activities cannot run in Expo Go. The Settings toggles are native-gated: Expo Go should show
a clear custom-build-required status instead of crashing. Real verification needs an EAS development or internal iOS
build installed on a physical iPhone.

Current native config:

- `@kingstinct/react-native-healthkit` with HealthKit usage descriptions.
- `expo-live-activity` with `NSSupportsLiveActivities` and push updates disabled for now.
- No backend/APNs live update pipeline yet, so Lock Screen updates are driven by app foreground/app-active refreshes.
