# ADR-0011: Online-first Expo (React Native) staff scanner app — MVP

- **Status:** Accepted
- **Date:** 2026-05-29
- **Deciders:** Tech lead + mobile owner

## Context

Staff need a native, installable scanner on their phones. The web SPA scanner (`/scan`) works but has two limits for gate use: the browser's `getUserMedia` requires a secure context (HTTPS in prod — the plain-HTTP prod frontend on `:8081` can't open the camera), and a web page isn't an installable app.

The backend scan contract is already stable and needs no changes for an MVP:

```
POST /v1/auth/login            → JWT + user.roles[]
POST /v1/tickets/scan {qrCode, deviceId}   roles SCANNER/ADMIN/ORGANIZER
  → OK | 404 TICKET_NOT_FOUND | 409 ALREADY_USED | 409 TICKET_NOT_VALID
```

`ADR-0009` specifies an offline-first scanner with local encrypted SQLite. That is the eventual target, but it depends on a `POST /tickets/sync-offline` endpoint that does **not** exist server-side yet, plus SQLCipher, a ticket-manifest pre-fetch, and duplicate reconciliation. Shipping that first would gate a working app on significant backend + crypto + conflict work.

We want a working, installable scanner on real phones quickly, reusing the proven web patterns.

## Decision

Build the MVP as an **Expo managed-workflow React Native app** under `mobile/` (already scaffolded: Expo SDK 54, RN 0.81, React 19, `expo-camera`, `expo-secure-store`, React Navigation, axios).

- **Online-first.** Every scan calls the live backend synchronously; there is **no local ticket DB** in the MVP. Offline-first (`ADR-0009`) is a deferred follow-up, layered on later without rewriting the online path.
- **Scope:** log in / out, camera QR scan, validation result. History is deferred (the `GET /v1/tickets/scans` endpoint already exists).
- **Architecture mirrors the web SPA** so we reuse solved problems rather than reinvent them:
  - an `apiClient` (axios + `Authorization: Bearer` interceptor + error-envelope → `AppError` mapping),
  - an `AuthContext`,
  - JWT and a per-device UUID `deviceId` persisted in `expo-secure-store`,
  - a token-gated navigator (Auth stack vs App stack) standing in for the SPA's `RequireRole`.
- **Allowed roles:** `SCANNER`, `ADMIN`, `ORGANIZER` — parity with the scan endpoint and the SPA's `scannerRoles`.
- **API base URL is runtime-configurable in-app** (persisted, defaulted from app config), so demos on shifting networks can point at the backend LAN IP (`http://<host-ip>:8080`) without a rebuild.
- **`expo-camera` `CameraView`** does QR detection natively (no extra decode library). Debounce and pause on first decode before awaiting the API; resume on "scan next".

## Consequences

**Easier:** a real, installable scanner on staff phones fast; no browser HTTPS / secure-context constraint; zero new backend work; reuses battle-tested request/auth patterns from `frontend/`.

**Harder / accepted:** the gate needs connectivity — a network blip blocks a scan. Mitigation: a clear retry UX now; true offline mode is tracked by `ADR-0009` as the next phase. Two devices scanning the same ticket online are still safe — the server's `check_ins.ticket_id UNIQUE` rejects the second with `ALREADY_USED`.

**Accepted:** `deviceId` is a client-generated UUID, not a hardware identifier — an opaque forensic tag, same as the web scanner.

## Alternatives considered

- **Implement `ADR-0009` offline-first now.** Rejected for the MVP: needs the unbuilt `/tickets/sync-offline` endpoint, SQLCipher, manifest pre-fetch, and conflict reconciliation — too much to gate a first working app on. Deferred, not abandoned.
- **Bare React Native (no Expo) / Android-Studio native.** Rejected: slower inner loop and more toolchain; Expo Go + EAS covers the MVP and we need no custom native modules.
- **Wrap the web SPA in a WebView / PWA.** Rejected: a camera in a remote WebView still hits the secure-context problem and gives a worse install/permission story than native `expo-camera`.

## Implementation rules

- No backend changes for the MVP; if one becomes necessary it gets its own ADR/PR.
- All HTTP goes through the mobile `apiClient` — screens never call `axios`/`fetch` directly (mirrors the `frontend/` rule).
- JWT and `deviceId` live only in `expo-secure-store`; never logged.
- Every request has a bounded timeout (parity with system invariant #5, "external calls must have bounded timeouts").
- Offline work, when it lands, follows `ADR-0009` and must not regress the online path.
- Develop on a new `feature/mobile-scanner` branch off `demo`; standard Conventional Commits + Definition of Done.
