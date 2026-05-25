# Database Migration Strategy

> Status: DRAFT — replaces the `init_schema.py` workflow.
> Owner: DB owner + backend team.
> Companion: [ADR-0005](../../adr/0005-flyway-for-migrations.md).

This document is the operations playbook for the decision in ADR-0005 (Flyway). Read the ADR first for the "why"; this doc covers the "how".

---

## 1. Tool: Flyway

We use **Flyway Community** (open-source, ships with Spring Boot starter). Liquibase was considered and rejected (ADR-0005).

Spring Boot dependency:

```xml
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-mysql</artifactId>
</dependency>
```

---

## 2. Layout

```
backend/src/main/resources/
└── db/
    └── migration/
        ├── V20260515_120000__initial_schema.sql
        ├── V20260520_100000__add_event_status_enum.sql
        ├── V20260601_153000__add_idempotency_keys_table.sql
        └── R__seed_demo_data.sql      # (optional repeatable)
```

### Naming

| Prefix | Meaning |
|---|---|
| `V<timestamp>__<desc>.sql` | Versioned forward migration. Timestamp = `YYYYMMDD_HHMMSS` UTC. |
| `R__<desc>.sql` | Repeatable — re-runs whenever its checksum changes. Used only for views, stored procs, and seed data. Never for tables. |

`<desc>` is `snake_case`, < 50 chars, describes the change.

### Rules

1. Once a `V*.sql` file is merged to `develop` or beyond, it is **immutable**. Never edit. Even fixing a typo means writing a new migration.
2. New schema goes in `db/migration/`. Nothing else does.
3. Seed data for **dev / test** is in `R__seed_*.sql` files **gated by Flyway placeholder** so they never run in prod:

   ```sql
   ${seedEnabled:-true}  -- replaced with 'true' in dev/test, 'false' in prod
   ```
   Or simpler: keep seed scripts in `backend/src/test/resources/fixtures/` and don't ship them in production builds.

---

## 3. Profiles

| Profile | Flyway | JPA `ddl-auto` |
|---|---|---|
| `dev` | enabled, `validate-on-migrate=false` while iterating, `clean` allowed | `update` (Hibernate may add columns the dev is mid-experimenting on) |
| `test` (CI) | enabled, `clean-disabled=false` (test container is ephemeral), runs all `V*` from V1 every pipeline | `validate` |
| `staging` | enabled, `clean-disabled=true`, `out-of-order=false` | `validate` |
| `prod` | enabled, `clean-disabled=true`, `out-of-order=false`, manual approval gate | `validate` |

`ddl-auto: validate` in staging/prod is a safety net: if a JPA entity drifts from the schema, the app refuses to start. That is the desired behavior — better a deploy fail than silent schema rot.

---

## 4. Converting `init_schema.py`

`docs/engineering/database/init_schema.py` becomes the first migration:

1. Generate `V20260515_120000__initial_schema.sql` containing every CREATE TABLE / INDEX / CONSTRAINT from the Python script, in dependency order.
2. Remove the hardcoded password (line 10 in the Python script) — it's no longer needed.
3. Keep `init_schema.py` in the repo with a deprecation note at the top pointing to the SQL file, **for one release cycle**, then delete it.
4. `insert_dummy.py` (currently empty) is removed; demo data lives in `backend/src/test/resources/fixtures/`.

---

## 5. Writing a migration: the checklist

Before opening a PR with a `V*.sql` file, confirm:

- [ ] Filename matches `V<timestamp>__<snake_case_desc>.sql` and the timestamp is later than every existing file on `develop`.
- [ ] DDL is idempotent only where Flyway expects it (it doesn't expect it — write straight DDL, no `IF NOT EXISTS`).
- [ ] No raw passwords or environment-specific values.
- [ ] Indexes added for every new foreign key.
- [ ] Charset is `utf8mb4`, collation `utf8mb4_0900_ai_ci`.
- [ ] Destructive changes (DROP TABLE / COLUMN, RENAME, type narrowing) are called out in the PR description and approved by two reviewers including the DB owner.
- [ ] If the migration runs over a table with > 100 k rows in prod, you have benchmarked it on a copy of staging and included the runtime in the PR description.
- [ ] If JPA entities change in the same PR, the entities match the new schema (otherwise `ddl-auto: validate` will fail in staging).

---

## 6. Online / staged migrations

For large prod tables we cannot afford `ALTER TABLE` blocking writes. The pattern:

1. **Migration N**: add the new column / index *nullable* and *online* (`ALGORITHM=INPLACE, LOCK=NONE` for MySQL 8 where supported).
2. **Code release**: dual-write or backfill via an idempotent job that processes in batches.
3. **Migration N+1**: tighten the constraint (NOT NULL, UNIQUE) after backfill confirms zero NULLs.
4. **Code release**: drop the old column reads.
5. **Migration N+2**: drop the old column.

Each step is a separate PR; never combine.

---

## 7. Rollback

Flyway Community has no `undo`. Rollback is **forward-only**:

- Discover the problem in staging — never in prod.
- If a bad migration reaches prod and the system is broken: write a new `V*.sql` that reverses it (e.g., re-add a dropped column, restore from backup if data was lost), and a code hotfix.
- Backups: full nightly snapshot + 5-min binlog point-in-time recovery, retained 14 days. Restore drill quarterly.

---

## 8. Prod migration playbook

Every prod migration follows this procedure:

1. **Pre-flight**: PR merged to `main`; CI green; staging migrated and load-tested for at least one full cycle.
2. **Snapshot**: trigger a fresh MySQL snapshot immediately before. Note the binlog position.
3. **Maintenance gate** (only if the migration is non-online): set the API to read-only mode at the edge (returning `503` with `Retry-After` on writes). Out-of-hours.
4. **Run**: deploy the new image. Flyway runs on boot. Monitor logs for `Successfully applied N migrations`.
5. **Smoke test**: hit five core endpoints (`/health`, `/events`, `/auth/login`, an order creation, a ticket check-in). Confirm success.
6. **Open the gate**.
7. **Watch**: keep the deployer on shift for 30 min; review `AUDIT_LOGS` and 5xx rates.
8. **Document**: append a line to `docs/engineering/database/migration-log.md` with date, migration IDs, runtime, anomalies.

If step 5 fails: roll back the application image (Flyway has already run; the schema is forward-compatible by design). If the schema itself is broken: restore from snapshot per the rollback section.

---

## 9. CI integration

GitHub Actions job:

```yaml
- name: flyway-check
  run: |
    mvn -pl backend flyway:info
    mvn -pl backend flyway:validate
```

Runs against a fresh Testcontainers MySQL. Fails the PR if:

- Any `V*.sql` file is out of order.
- Any checksum of a previously-applied migration has changed (i.e., someone edited a merged migration).
- A new migration cannot apply cleanly from V1.

---

## 10. Open questions

- [ ] Should we adopt the Flyway `community` vs. `teams` edition for production observability features?
- [ ] How do we coordinate migrations with read replicas — replication lag during long ALTERs?
- [ ] Long-term retention policy on `NOTIFICATIONS` and `AUDIT_LOGS` (purge job vs. partition).
