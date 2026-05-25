# Documentation Index

Use this index to find the current implementation docs. Historical iteration notes under `tracking/` are kept for audit context and may describe the state at the time they were written.

## Current implementation

- [Implemented feature and flow reference](./feature-flow-reference.md) - user, admin, checkout, ticketing, feedback, notification, audit, and deployment flows.
- [OpenAPI contract](./api/openapi.yaml) - current `/v1` backend endpoint surface.
- [API conventions](./api/conventions.md) - request/response conventions and explicit notes for planned-but-not-implemented items.
- [System architecture](./architecture/system-architecture.md) - current architecture snapshot and known gaps.
- [Load balancing](./architecture/load-balancing.md) - nginx load balancer and multi-backend compose topology.
- [Database schema](./database-setup/schema-definition.md) - current Flyway-backed MySQL schema.

## Supporting docs

- [Test strategy](./test-strategy.md)
- [NFR load-test plan](./nfr-load-test-plan.md)
- [Security threat model](./security/threat-model.md)
- [ADRs](./adr/README.md)
- [UI/UX mockups](./UI-UX/)
- [Tracking notes](./tracking/)
