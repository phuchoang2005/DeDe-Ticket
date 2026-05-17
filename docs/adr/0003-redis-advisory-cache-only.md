# ADR-0003: Redis is advisory cache, never source of truth

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead

## Context

The system uses Redis for several things: seat-availability fast-path snapshots, per-user rate-limit token buckets, idempotency-key cache, listing cache. It is tempting to treat Redis as authoritative for hot data — but Redis can lose state (eviction, restart, network partition), and any divergence from MySQL on seat status would cause oversell.

## Decision

Redis is **strictly advisory**. MySQL is the single source of truth for every domain fact. Specifically:

| Use case | Redis role | Authority |
|---|---|---|
| Seat availability fast-path (fail-fast before DB UPDATE) | Snapshot, may be stale | MySQL `EVENT_SEATS` + version check |
| Rate-limit token buckets | Authoritative for the limit itself (limit lives nowhere else) | Redis |
| Idempotency-key cache | Hot-path lookup; persisted to MySQL on first write | MySQL `IDEMPOTENCY_KEYS` |
| Listing cache (events) | Performance only, 30s TTL | MySQL |

A Redis failure is a degradation, not an outage: requests fall through to MySQL. A MySQL failure is an outage.

## Consequences

**Easier:** correctness is reasoned about against MySQL alone. We can cold-start Redis any time.
**Harder:** every flow has a DB-authoritative step even when the cache could shortcut it. We accept the cost.
**Accepted:** rate-limit state is the one place Redis is *the* authority — a Redis flush would reset all token buckets. We accept this for Sprint 1 (worst case: a brief burst of traffic before buckets re-fill).

## Alternatives considered

- **Redis as authoritative seat lock store.** Rejected: see ADR-0002. The schema already gives us the right primitive in MySQL.
- **In-process caches (Caffeine).** Used in addition to Redis for very hot read-only data (e.g., ticket-type lookups per request), not as a replacement.
