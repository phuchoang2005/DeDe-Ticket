# ADR-0001: Spring Boot monolith for Sprint 1

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + backend team

## Context

`GE-REQUIREMENT.md` asks for 10 000 concurrent users, 50 000 tickets/event, < 2s p95 — but the team is one squad on a capstone timeline. The seat-lock → order → payment → ticket-issue path is one logical transaction (see §3 of `design-supplement.md`); splitting it across services would force a distributed-transaction or saga implementation that the team has not yet built.

## Decision

Ship Sprint 1 as a single Spring Boot 3.2 / Java 21 deployable, layered (`controller → service → repository → domain`), with multiple horizontally scalable replicas behind a load balancer. Background workers (sweeper, notification dispatcher, refund) are *separate processes from the same codebase*, selected by profile / CLI flag.

## Consequences

**Easier:** in-process transactions, one CI pipeline, one deployable artifact, one log stream per request, one test harness.
**Harder:** any "blast radius" failure (e.g., a runaway query) affects the whole API surface; we mitigate with bulkhead thread pools per integration and per-endpoint timeouts.
**Accepted:** we cannot independently scale order-write capacity vs. event-read capacity. If load tests prove this is a real bottleneck, ADR-NNNN may carve out the read-listing path.

## Alternatives considered

- **Microservices from day one.** Rejected: distributed transactions for the booking path are a multi-quarter effort; not justified at one squad.
- **Modular monolith with strict module boundaries (e.g., gradle subprojects).** Reasonable, but adds build complexity without a clear payoff at Sprint 1's scope. Revisit at Sprint 3.
- **Serverless / FaaS.** Rejected: cold-start latency during golden-hour ramp would blow the < 2s p95 target.
