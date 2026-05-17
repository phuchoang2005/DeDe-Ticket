# ADR-0010: Single-instance seat-lock sweeper via DB advisory lock

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead

## Context

`design-supplement.md` §2 describes a sweeper that releases expired `EVENT_SEATS` locks every 10s. If the sweeper runs on every API pod, N replicas would scan the same rows simultaneously, causing wasted writes, version-bumps, and noisy logs — but more importantly, racing the user's own commit path (a user might be paying for a seat right as the sweeper tries to release it).

## Decision

The sweeper runs in **exactly one instance** at any time, enforced by a **DB-level advisory lock** acquired at startup:

```sql
SELECT GET_LOCK('seat_lock_sweeper', 0);
```

If `GET_LOCK` returns 0, the process logs "sweeper already running" and exits. If it returns 1, the process holds the lock for its lifetime; on crash, MySQL releases the lock automatically and a backup pod can acquire it.

Deployment-wise, the sweeper is a **separate process from the same artifact**, started with `--sweeper` (or `SPRING_PROFILES_ACTIVE=sweeper`). API pods do not run sweep code.

## Consequences

**Easier:** no duplicate work, no leader-election infrastructure, no Zookeeper / etcd. Works on managed MySQL out of the box.
**Harder:** if the sweeper pod crashes and the replacement takes 30s to start, locks expire late and seats stay `LOCKED` for an extra half-minute. We accept this — the worst case is a user re-trying the booking attempt, not data corruption.
**Accepted:** we can't horizontally scale the sweeper. At current targets (10k concurrent, 50k seats/event), a single sweeper running every 10s with `LIMIT 500` per pass is sufficient.

## Alternatives considered

- **Leader election via Zookeeper / etcd.** Operationally heavier; the GET_LOCK approach gives the same correctness for one process.
- **Run on every API pod with overlap tolerance.** Rejected: causes the race with the user's own paying flow.
- **DB scheduled events.** Workable in MySQL 8 but limits observability and our ability to emit notifications + audit logs in the same logical pass.

## Implementation rules

- The sweep query MUST re-check `status = 'LOCKED' AND locked_until < NOW()` inside the UPDATE — a user may have just committed a payment between the SELECT and the UPDATE.
- `LIMIT 500` per pass; the next iteration drains the remainder.
- Each released lock generates one `NOTIFICATIONS` row (`type='SEAT_RELEASED'`) and one `AUDIT_LOGS` row (`action='SEAT_LOCK_EXPIRED'`).
- Sweeper liveness is monitored: alert if no successful pass in 60 seconds.
- See `design-supplement.md` §2 for the full flow.
