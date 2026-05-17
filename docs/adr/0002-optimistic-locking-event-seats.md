# ADR-0002: Optimistic locking via `EVENT_SEATS.version`

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + DB owner

## Context

Golden-hour traffic puts thousands of users in contention for the same seats. The schema already provides `EVENT_SEATS.status`, `locked_by`, `locked_until`, and `version`. We need correctness under contention (no double-locks, no double-bookings) without serializing the whole table.

## Decision

All seat-state transitions use **optimistic concurrency control** with the `version` column. Every UPDATE includes `WHERE status = :expectedStatus AND version = :v` and increments `version`. Affected-rows = 0 means another transaction won the race — the loser **does not retry server-side**; the API returns `409 SEAT_TAKEN` and the client re-picks from a fresh seat map.

DB-level guarantees that complement this:
- `ORDER_ITEMS.event_seat_id` is `UNIQUE` — last-line defense against double-booking.
- All seats in one lock request are mutated inside **one transaction**; partial success rolls back.

## Consequences

**Easier:** no row locks held across user-think-time; no `SELECT … FOR UPDATE` on hot rows; the system stays responsive even when 99% of contenders lose.
**Harder:** clients must handle 409s gracefully (UI must refresh the seat map). Optimistic retries are a client-side UX problem, not a server-side loop.
**Accepted:** under extreme contention many users will see "seat taken" — that is the correct UX. Hiding it with server-side retry would only move the lock contention upstream.

## Alternatives considered

- **Pessimistic `SELECT … FOR UPDATE` on `EVENT_SEATS`.** Rejected: holds row locks for the duration of the request and serializes all contenders on the same seats — exactly the opposite of what golden hour needs.
- **Application-level mutexes (e.g., Redis SETNX per seat).** Rejected: introduces a second source of truth that can diverge from MySQL; the DB still needs the version check anyway.
- **Queue-based ticket assignment ("you get whatever seat we hand you").** Defers contention but doesn't fit the product (assigned-seat venues).

## Implementation rules

- The `WHERE status = ... AND version = :v` clause is mandatory on every state transition. Reviewers must reject PRs that omit it.
- The sweeper (ADR-0010) is the only path that flips a `LOCKED` seat back to `AVAILABLE` without a user-initiated request.
- Redis seat-availability cache is advisory only (ADR-0003) — never skip the DB version check based on a cache hit.
