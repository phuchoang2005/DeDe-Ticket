# ADR-0005: Flyway for schema migrations

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + DB owner

## Context

The current schema lives in `docs/engineering/database/init_schema.py` — an imperative Python script with a hardcoded password (`init_schema.py:10`). JPA is set to `ddl-auto: update` in dev. Neither is acceptable for a production deployment: there is no versioning, no rollback story, no controlled prod migration path, and CI cannot start from a clean DB deterministically.

## Decision

Adopt **Flyway** as the single schema-migration tool.

- Migration files live in `backend/src/main/resources/db/migration/` and follow `V<timestamp>__<snake_case_description>.sql` (e.g., `V20260515_120000__initial_schema.sql`).
- `init_schema.py` is converted to `V20260515_120000__initial_schema.sql` and retired.
- Profiles:
  - `dev`: `spring.jpa.hibernate.ddl-auto=update`, Flyway `validate-on-migrate=false` while iterating locally.
  - `test` (CI): Flyway clean → migrate from V1 every pipeline; `ddl-auto=validate`.
  - `prod`: Flyway migrate only; `ddl-auto=validate`. No `update`, no `create`, no exceptions.

## Consequences

**Easier:** every schema change is reviewable as a SQL file in the same PR as the code. CI starts from a clean DB. Prod migrations are auditable.
**Harder:** developers must write SQL DDL by hand instead of relying on Hibernate to auto-add columns. We accept this — auto-generated schemas drift quickly and we already need explicit migration scripts for things like `UNIQUE` constraints, enum changes, and the schema deltas in `design-supplement.md` §schema-deltas.
**Accepted:** Flyway Community edition does not include undo migrations. Rollback is forward-only: write a new migration that reverses the prior one. This is industry-standard practice.

## Alternatives considered

- **Liquibase.** Equivalent capability. Rejected on simplicity grounds — Liquibase's YAML/XML changesets add a layer that the team doesn't need at Sprint 1.
- **Keep `ddl-auto: update`.** Rejected: not safe for prod; loses migration history; cannot express data backfills or constraint additions safely.
- **Hand-written SQL applied manually via README.** Rejected: zero auditability, error-prone.

## Implementation rules

- Migrations are **append-only**. Never edit a merged `V*.sql` — write a new file.
- Every migration must be reviewable as plain SQL — no shell scripts, no Python, no Liquibase-style abstraction.
- Destructive changes (DROP TABLE, DROP COLUMN) require an explicit sign-off in the PR description.
- Data migrations that may take > 30s on prod size data must be staged: a non-blocking online step first, then a fast cutover.
- See [`database-setup/migration-strategy.md`](../engineering/database/migration-strategy.md) for the operations playbook.
