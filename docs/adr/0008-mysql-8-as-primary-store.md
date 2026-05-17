# ADR-0008: MySQL 8 as primary data store

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + DB owner

## Context

The schema (`docs/database-setup/schema-definition.md`) is heavily relational: USERS ↔ ROLES, EVENTS ↔ SEATS ↔ TICKETS ↔ ORDERS ↔ PAYMENTS, with explicit foreign keys and uniqueness constraints. Several correctness properties depend on:

- `UNIQUE` constraints (`ORDER_ITEMS.event_seat_id`, `TICKETS.qr_code`, `CHECK_INS.ticket_id`).
- `SELECT … FOR UPDATE SKIP LOCKED` for queue draining (ADR-0004).
- Multi-row transactions for seat lock + order + ticket issue (ADR-0002).

These are bread-and-butter for a mature RDBMS and awkward to do correctly elsewhere.

## Decision

Use **MySQL 8** as the single primary store. InnoDB engine, `READ-COMMITTED` isolation by default with explicit `REPEATABLE READ` on the booking transaction.

## Consequences

**Easier:** matches the schema's natural shape; transaction semantics are well understood; tooling is mature; the team already has experience.
**Harder:** any future "we need denormalized analytics across millions of orders" requirement may need a separate OLAP store. Out of scope for Sprint 1.
**Accepted:** vertical scaling first; read replicas if reads become the bottleneck (event listings, seat-map polls). Sharding is not on the roadmap.

## Configuration notes

- Charset: `utf8mb4` (full unicode; Vietnamese diacritics and emoji in event titles).
- Collation: `utf8mb4_0900_ai_ci`.
- `innodb_buffer_pool_size`: ≥ 60% of the host RAM in staging/prod.
- Slow-query log on for any query > 200ms; reviewed weekly.
- Connection pool: HikariCP, sized 2 × CPU cores per API pod, with a hard cap respected at the LB.

## Alternatives considered

- **PostgreSQL.** Equivalent capability; the team has more MySQL operational experience. No tie-breaking difference for this workload.
- **NoSQL (MongoDB, DynamoDB).** Rejected: the data model is relational and consistency requirements are strong.
- **CockroachDB / distributed SQL.** Overkill at Sprint 1 scale; revisit if multi-region becomes a hard requirement.
