# ADR-0006: `Idempotency-Key` header + persisted result

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + backend team

## Context

Mobile clients on flaky networks will retry POST requests. Without idempotency, retries cause double-orders, double-payments, double-locks. The schema already implies this (see `design-supplement.md` §1 and §3); we need a single, consistent server-side mechanism.

## Decision

Every state-changing request (POST / PUT / PATCH / DELETE) accepts an HTTP header:

```
Idempotency-Key: <client-generated-uuid-v4>
```

Behavior on the server:

1. The first request with a given `(method, path, key)` tuple is processed normally; the response body + status code are persisted.
2. Any subsequent request with the same tuple within the TTL (24h) returns the persisted response verbatim — the underlying business logic is **not** re-executed.
3. If a request with the same key but a different body arrives, return `422 IDEMPOTENCY_KEY_REUSE`.

Storage:

- Hot path: Redis (`idem:{method}:{path}:{key}` → JSON of `{status, body, headersHash}`, TTL 24h).
- Durable path: `IDEMPOTENCY_KEYS` table — `(key VARCHAR(64) PK, method, path, request_hash, response_status, response_body JSON, expires_at, created_at)`. Inserted in the same transaction as the business write.

The filter `web/IdempotencyKeyFilter` short-circuits the request before it reaches the controller on a replay.

## Consequences

**Easier:** clients can retry freely; the booking flow and payment flow tolerate network failures without inventing per-endpoint dedup logic.
**Harder:** every state-changing controller method must accept the header; the filter must run *inside* a transaction for the durable-path insert to be consistent. We codify this in the API conventions doc.
**Accepted:** 24h TTL means a very late retry (e.g., 48h later due to outage) will re-execute the business logic. Acceptable: real-world retry windows are seconds to minutes.

## Alternatives considered

- **`requestId` in the body.** Rejected: easy to forget; doesn't fit non-JSON requests; HTTP header is the industry norm (Stripe, AWS).
- **DB-only storage (no Redis).** Workable, slower hot path under retry storms. Use Redis as L1, table as L2.
- **Per-endpoint dedup tables.** Rejected: scales poorly across the API surface and fragments the contract.

## Implementation rules

- `Idempotency-Key` is **mandatory** on: `POST /orders`, `POST /orders/{id}/pay`, `POST /events/{id}/seats/lock`. Missing → `400 IDEMPOTENCY_KEY_REQUIRED`.
- Optional but honored on every other state-changing endpoint.
- Key format: UUID v4. Reject other formats with `400`.
- The `request_hash` is SHA-256 of canonicalized JSON body; we use it to detect "same key, different body" abuse.
- See `api/conventions.md` for the full header contract.
