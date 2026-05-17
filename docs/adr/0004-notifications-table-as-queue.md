# ADR-0004: `NOTIFICATIONS` table as queue (no broker for Sprint 1)

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + backend team

## Context

The system has multiple async event types: ticket issuance email, seat-released notice, refund confirmation, event reminder, check-in push. A naive solution is "introduce Kafka or RabbitMQ" — but neither the throughput nor the durability requirements at Sprint 1's scale justify the operational cost.

The schema already includes a `NOTIFICATIONS` table with `status`, `type`, `content`, `sent_at`. MySQL 8 supports `SELECT … FOR UPDATE SKIP LOCKED`, which makes the table safe to drain from multiple workers without contention.

## Decision

Use the `NOTIFICATIONS` table as the work queue. Producers (payment success, sweeper, refund worker, cron) `INSERT` rows with `status = 'PENDING'`. The Notification Dispatcher pool drains using `SELECT … FOR UPDATE SKIP LOCKED LIMIT 100`, updates `status` to `SENT` / `FAILED`, and continues.

## Consequences

**Easier:** one fewer infrastructure dependency to operate; backups cover the queue; everything stays in one transactional store; failed sends are visible in normal SQL queries.
**Harder:** throughput tops out at MySQL's INSERT rate per `NOTIFICATIONS` row. For Sprint 1 targets this is far above what we need. We accept a hard ceiling here.
**Accepted:** the `NOTIFICATIONS` table grows over time. We will add a retention job (delete `SENT` rows older than 90 days) in Sprint 2.

## When this ADR should be revisited

- Sustained throughput requirements exceed ~5000 notifications/second.
- Fan-out becomes large enough that storing the same content N times is expensive.
- Cross-service event distribution becomes a requirement (other teams subscribing).

At that point, introduce Kafka (or Redis Streams as a lighter step) and migrate producers. Consumers can stay reading from the table during the transition.

## Alternatives considered

- **Kafka / RabbitMQ from day one.** Rejected: operational cost not justified at Sprint 1 scale.
- **Direct synchronous send from the producing transaction.** Rejected: payment commit cannot block on SMTP availability.
- **AWS SQS / managed queue.** Reasonable for a managed-cloud deployment, but ties us to a vendor before we need to.
