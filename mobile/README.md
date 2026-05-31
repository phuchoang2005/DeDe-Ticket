# Dề Dê staff scanner (mobile)

Expo (managed workflow) React Native app for staff ticket scanning: log in, scan a QR
(or type a code), see the validation result. It reuses the existing backend unchanged.
Online-first; offline is out of scope (see `docs/adr/0011-expo-online-first-staff-scanner.md`
and ADR-0009).

Stack: Expo SDK 54, React Native 0.81, React 19, `expo-camera`, `expo-secure-store`,
`expo-audio`, React Navigation, axios.

## Prerequisites

- Node 18+ (no Android Studio / Xcode needed for the Expo Go loop).
- The backend reachable on your LAN (run the dev or prod compose at the repo root).
- The Expo Go app on a phone for the inner loop, or an EAS build for a standalone APK.

## Setup

```bash
npm install
cp .env.example .env          # then set EXPO_PUBLIC_API_BASE_URL to your dev machine LAN IP
```

`EXPO_PUBLIC_API_BASE_URL` must be the dev machine's LAN IP and port (for example
`http://192.168.2.18:8080`), never `localhost` (on the phone that resolves to the phone).
`app.config.js` feeds it into `expo.extra.apiBaseUrl`; `src/config/env.js` resolves it.
You can also change the server URL at runtime from the login screen ("Cài đặt máy chủ"),
which persists via `expo-secure-store`.

## Run (Expo Go)

```bash
npm start                     # Metro; scan the QR with Expo Go on a same-Wi-Fi phone
npx expo start --tunnel       # when the phone and dev machine are not on the same network
```

Log in with a scanner-capable seeded account (for example `scanner@dede.test` / `scan1234`;
admin and organizer accounts also work). Non-scanner accounts are rejected in-app.

## Test

```bash
npm test                      # jest-expo unit/integration tests in tests/
```

## Build a shareable APK (EAS, cloud)

Requires an Expo account and `eas-cli` (`npm i -g eas-cli`, then `eas login`). Profiles are
in `eas.json`.

```bash
eas build --profile preview --platform android     # internal-distribution APK
eas build --profile production --platform android   # store-ready build
```

No local Android toolchain is required; builds run in Expo's cloud.

## Manual device test matrix

Run against the dev backend over Wi-Fi and confirm on at least:

- Android phone (Expo Go and/or a `preview` APK) — primary target.
- iOS phone (Expo Go) if available.

Checklist per device: login + role gate, camera permission prompt, QR scan of a seeded
valid ticket (OK), rescan of the same ticket (`ALREADY_USED`), an unknown code
(`TICKET_NOT_FOUND`), manual code entry, front/back camera toggle, the freeze-on-result
behavior and "Quét vé khác" resume, and the airplane-mode / wrong-server-URL error paths.

## Layout

```
src/
  config/env.js            API base URL resolution + runtime override
  services/apiClient.js    axios + JWT interceptor + error-envelope -> ApiError
  services/authService.js  POST /v1/auth/login
  services/scanService.js  POST /v1/tickets/scan
  storage/                 secureStore (JWT), deviceId, serverConfig (API URL)
  store/AuthContext.js     auth state + token-gated navigation
  navigation/              RootNavigator, AuthStack, AppStack (headers hidden)
  screens/                 LoginScreen, ScanScreen
  components/ErrorBoundary.js
  utils/                   scanOutcome, errorMessage, beep
  theme.js                 color tokens mirrored from the web Tailwind theme
tests/                     jest-expo unit/integration tests
__mocks__/                 expo-secure-store, expo-constants, expo-camera, expo-audio
```
