# ADR-0009: Offline-first mobile check-in with local SQLite

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + mobile owner

## Context

`GE-REQUIREMENT.md` §2.4, §2.5 explicitly require the staff scanner to work without network at the venue gate. Venues have unreliable Wi-Fi; queues form quickly. A scanner that refuses to scan because the API is unreachable is not acceptable.

## Decision

The staff mobile app maintains a local SQLite database that is **the authority during the event window**. On launch (and at 2h before event start), the app pulls the ticket manifest for the assigned event(s):

```
TICKETS_LOCAL(qr_code PK, ticket_id, order_item_id, status)
PENDING_CHECKINS(qr_code PK, scanned_at, staff_user_id, sync_status)
```

Scans update local state immediately and append to `PENDING_CHECKINS`. A background sync drains `PENDING_CHECKINS` to `POST /tickets/sync-offline` whenever the app has connectivity.

Server-side de-duplication relies on `CHECK_INS.ticket_id UNIQUE` and `INSERT … ON DUPLICATE KEY UPDATE checked_in_at = LEAST(checked_in_at, VALUES(checked_in_at))` — the server keeps the **earliest** scan and logs duplicates as fraud signals.

## Consequences

**Easier:** scanning continues regardless of network state; the venue gate keeps moving.
**Harder:** two devices scanning the same ticket independently both see "valid" locally. We accept this — server reconciles and surfaces the conflict.
**Accepted:** the pre-fetch window means a ticket purchased < 2h before event start may not be in the local DB. Mitigation: the app re-fetches every 5 min when online; tickets purchased at the door are checked in online by a fallback device.

## Alternatives considered

- **Always-online scanner with retry queue.** Rejected: blocks the queue at the gate on first network blip.
- **Server-pushed delta feed (WebSocket).** Useful enhancement, not Sprint 1. Pull-based pre-fetch is simpler and robust.
- **No local DB; in-memory cache only.** Rejected: app crash / restart loses scans.

## Implementation rules

- Pre-fetch ticket data only includes `qr_code`, `ticket_id`, `order_item_id`, `status` — **no PII**. The QR is enough to validate; staff doesn't need the buyer's name.
- Conflicts surfaced post-sync are logged to `AUDIT_LOGS` with `action='DUPLICATE_OFFLINE_CHECKIN'`.
- The mobile app must encrypt the local SQLite (SQLCipher) — staff phones get lost.
- See `design-supplement.md` §4 for the full flow.
