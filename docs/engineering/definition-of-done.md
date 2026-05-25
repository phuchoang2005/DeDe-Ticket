# Definition of Done

> Status: DRAFT — applies to every PR targeting `develop` or above.
> Companion: [`coding-standards.md`](coding-standards.md), [`test-strategy.md`](../quality/test-strategy.md).

A change is "done" when **all** of the following are true. If any item is N/A for a given PR, the author states why in the PR description.

---

## 1. Functional

- [ ] The change implements exactly what the linked issue / story describes — no more, no less.
- [ ] User-visible behavior was verified manually (for UI changes) or via curl / Postman (for API changes). The PR description includes one screenshot or one example request/response.
- [ ] Edge cases identified in the issue have been handled or explicitly deferred with a follow-up issue link.

## 2. Tests

- [ ] Unit tests cover the new logic and its error branches.
- [ ] For any change touching a controller, service, or repository: integration test using Testcontainers covers the happy path + at least one failure path.
- [ ] If the change touches a flow listed in `test-strategy.md` §3 (invariant tests), that invariant test passes.
- [ ] No test is `@Disabled` without an inline comment explaining why and linking a follow-up issue.
- [ ] Coverage on touched files does not decrease.

## 3. API contract

- [ ] If the change adds or modifies an endpoint, the OpenAPI spec (`docs/api/`) is updated in the **same PR**.
- [ ] The OpenAPI validator (contract test) is green.
- [ ] Conventions from `api/conventions.md` are honored: error envelope, idempotency headers, pagination, naming, dates.
- [ ] At least one `examples:` block exists for every new endpoint.

## 4. Schema

- [ ] If the change touches the schema, a Flyway migration in `backend/src/main/resources/db/migration/` exists, named per `database-setup/migration-strategy.md`.
- [ ] The migration was applied locally and integration tests pass against the new schema.
- [ ] JPA entities are aligned (`ddl-auto: validate` does not throw on app start).
- [ ] Indexes exist for every new foreign key.
- [ ] Destructive changes (DROP / RENAME / type narrowing) are called out in the PR description.

## 5. Security

- [ ] No secrets committed. `.env`, `application-dev.yml`, `application-prod.yml` remain gitignored.
- [ ] PII is not logged, returned in unrelated responses, or written to non-secured tables.
- [ ] New endpoints declare `security:` in OpenAPI and `@PreAuthorize` in the service layer.
- [ ] User input is validated with Bean Validation; outputs to HTML / SQL are parameterized / escaped.
- [ ] If the change touches an asset listed in `security/threat-model.md` §1, the threat-model doc reflects the change.

## 6. Observability

- [ ] At least one `INFO` log per significant business event (order created, payment success, seat locked, sweeper pass complete) with the conventional structured fields (`traceId`, `userId`, `eventName`).
- [ ] Errors log at `ERROR` with enough context to debug — never just `e.getMessage()`.
- [ ] If the change adds a background job or new external dependency, a health / readiness / metric is exposed.

## 7. Performance

- [ ] Any new query against a large table (≥ 10 k rows in prod) was reviewed: it uses an index, no SELECT *, and has a sensible LIMIT.
- [ ] N+1 query risk addressed: JPA fetch joins or explicit projections where applicable.
- [ ] External calls have timeouts (default: 2 s connect, 5 s read) and a circuit breaker if on a hot path.
- [ ] If the change touches a path measured by the load-test plan, the load test was rerun against staging (release PRs only).

## 8. Code quality

- [ ] Code follows `coding-standards.md`: layering, naming, transactions, no field injection, no `Thread.sleep`.
- [ ] Formatter ran (`mvn spotless:apply` / `npm run format`).
- [ ] No dead code, no commented-out blocks, no TODO without a linked issue.
- [ ] No new "while I was in there" refactor unrelated to the change. Separate PR if needed.

## 9. Documentation

- [ ] Code comments only where the **why** is non-obvious — no narration of **what**.
- [ ] If the change shifts an architectural decision, an ADR is added in `docs/adr/`.
- [ ] If the change introduces a new pattern other contributors should follow, `coding-standards.md` or the relevant guide is updated.
- [ ] User-facing README / install steps still work end-to-end.

## 10. Process

- [ ] PR title follows Conventional Commits.
- [ ] PR description includes: the *why*, the *what*, screenshots / examples, manual test notes, follow-up issues if any.
- [ ] CI is green (build, unit, integration, contract, lint, CVE scan).
- [ ] At least one approving review from a non-author. Two reviews for: migrations, security-tagged PRs, anything touching the booking or payment flow.
- [ ] No unresolved `[blocking]` review comments.
- [ ] Branch is rebased / merged with `develop` (no merge conflicts).
- [ ] If this is a hotfix, both `main` and `develop` receive the change per `branching-strategy.md`.

---

## Quick checklist (copy into PR description)

```markdown
## Definition of Done

- [ ] Functional: matches the issue; edge cases handled.
- [ ] Tests: unit + integration; invariants covered.
- [ ] API: OpenAPI updated; conventions followed.
- [ ] Schema: Flyway migration if needed; JPA aligned.
- [ ] Security: no PII leaks; threat-model updated if relevant.
- [ ] Observability: structured logs at INFO; errors traceable.
- [ ] Performance: queries indexed; timeouts on external calls.
- [ ] Code quality: standards followed; formatter ran.
- [ ] Documentation: ADR / standards updated if needed.
- [ ] Process: CI green; reviewed; merged with develop.
```

---

## Reviewer's red-flag list

Reviewers should reject (or send back) PRs with any of these:

- New endpoint without OpenAPI update.
- Schema change without a Flyway migration.
- New code path without a corresponding test.
- `Thread.sleep` anywhere in production code.
- Application-level "double-check" logic that duplicates an existing DB constraint.
- Mocking `EntityManager` / `JdbcTemplate` in a test that exists to verify SQL behavior.
- Logging at `ERROR` for expected user errors (e.g., a `400` from validation).
- A merge that bundles a refactor with a feature without splitting.
