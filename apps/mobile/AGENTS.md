# Expo Go Compatibility

This app currently targets Expo SDK 54 to match the installed iPhone Expo Go client.
Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing mobile code.

## Native-only surfaces

- Apple Health and Live Activity require a custom iOS development/internal build.
- Expo Go can run the JavaScript MVP, but it cannot load HealthKit or ActivityKit native modules.
- Keep native imports lazy and guarded so Expo Go shows a clear unsupported/custom-build-required status instead of crashing.
- Do not start EAS builds, credential generation, or submit steps unless the user explicitly asks.
