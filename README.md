# GlucoDesk

GlucoDesk is a glucose monitor for LibreLinkUp. The repository now contains a
working Windows desktop app, a shared TypeScript domain package, and an Expo iOS
mobile app that can be built into an installable `.ipa` through EAS.

## Current Status

- Desktop Electron app remains the stable Windows client.
- `packages/shared-core` contains platform-neutral glucose, LibreLinkUp,
  unit-conversion, history-mapping, calibration, and alarm logic.
- `apps/mobile` contains the iPhone app built with Expo SDK 54 and React Native.
- The mobile app works in Expo Go for the JavaScript-only MVP flow:
  LibreLinkUp login, current glucose, trend, delta, history, settings, polling,
  local alarms, and charting.
- Apple Health and Dynamic Island / Lock Screen Live Activity wiring is present,
  but those surfaces require a custom iOS development or internal build. They do
  not run inside Expo Go.

## Repository Layout

```text
glucodesk/
  src/                    Desktop Electron app
  apps/mobile/            Expo iPhone app
  packages/shared-core/   Platform-neutral domain logic
  docs/                   Roadmap, build notes, next-chat handoff
```

## Desktop Stack

- Electron + electron-vite
- React 18 + TypeScript strict mode
- Tailwind CSS
- Lightweight Charts for sparklines
- electron-store for settings
- better-sqlite3 for history
- Zustand for renderer state

## Mobile Stack

- Expo SDK 54 + React Native 0.81
- TypeScript strict mode
- Expo SecureStore for LibreLinkUp credentials
- Expo SQLite for mobile history/settings
- Expo Notifications for local alarms
- `@kingstinct/react-native-healthkit` for Apple Health native builds
- `expo-live-activity` for Dynamic Island / Lock Screen native builds

## Setup

Install dependencies:

```bash
npm install
```

Run the desktop app:

```bash
npm run dev
```

Run the mobile app in Expo Go:

```bash
npm run mobile:start
```

Run checks:

```bash
npm run build
npm test -- --run
npm run lint
npm run mobile:typecheck
```

Smoke-test the mobile iOS JavaScript bundle without starting an EAS build:

```powershell
cd apps/mobile
npx expo export --platform ios --output-dir dist-ci
Remove-Item -Recurse -Force dist-ci
```

## iOS Build Notes

The mobile app is prepared for EAS build profiles:

- `development`: custom dev client for native module testing.
- `preview`: internal installable `.ipa` for registered devices.
- `production`: TestFlight/App Store build.

Actual iPhone installation requires external Apple/Expo state:

- Expo account login or `EXPO_TOKEN`.
- Apple Developer Program membership.
- Valid signing credentials and registered test devices for internal builds.

Do not commit `.env`, Expo tokens, Apple certificates, provisioning profiles, or
other credentials.

## LibreLinkUp Region Flow

Login starts against the global LibreView endpoint. If LibreLinkUp returns a
regional redirect, GlucoDesk retries against the region-specific endpoint and
persists that region for subsequent requests. For Russia, the supported endpoint
is `https://api.libreview.ru`.

## Apple Platform Surfaces

Apple Health and Live Activities are implemented behind native-gated adapters:

- In Expo Go, Settings should show a clear "custom iOS build required" status.
- In a custom iOS build, Apple Health can request consent and write blood glucose
  samples from LibreLinkUp readings.
- In a custom iOS build, Live Activity can display current glucose, trend, delta,
  and freshness on the Lock Screen and Dynamic Island.
- Without a backend/APNs pipeline, Lock Screen freshness is limited by iOS app
  foreground/app-active refresh behavior.

## Documentation

- [Mobile IPA Build](docs/mobile-ipa-build.md)
- [iOS IPA Roadmap](docs/mobile-ios-ipa-roadmap.md)
- [Next Chat Handoff](docs/next-chat-handoff.md)
