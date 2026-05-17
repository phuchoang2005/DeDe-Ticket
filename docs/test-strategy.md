# Test Strategy

> Status: DRAFT — applies to backend and frontend; load testing lives in [`nfr-load-test-plan.md`](nfr-load-test-plan.md).
> Owner: QA + tech lead.

This document defines what we test, how, and what blocks a merge. The goal is not coverage-for-coverage's-sake; it is to verify the **invariants** the business depends on (no double-bookings, no duplicate QRs, no charged-but-no-ticket) cheaply on every PR.

---

## 1. Pyramid

```
                 ╱╲
                ╱E2╲           ~5 %   slow, brittle, golden-path only
               ╱────╲
              ╱ Cont ╲          ~10 % contract: OpenAPI conformance, JSON shapes
             ╱────────╲
            ╱   Integ  ╲        ~30 % real DB (Testcontainers), real HTTP layer
           ╱────────────╲
          ╱     Unit     ╲      ~55 % pure logic, fast, no I/O
         ────────────────
```

Numbers are rough targets, not gates. We will reject PRs that invert the pyramid (e.g., a 3-line bug fix landing 10 e2e tests).

---

## 2. Test layers

### 2.1 Unit tests (backend)

- Framework: JUnit 5 + AssertJ + Mockito.
- Scope: a single class or a small cluster of pure-logic classes. No Spring context. No DB.
- Where: `backend/src/test/java/.../<class>Test.java`.
- Naming: `methodName_givenCondition_expectedOutcome` or `describe`-style.
- Must-test:
  - Every service method's branches, including error paths.
  - Mappers between DTOs and domain entities.
  - Validation logic, calculators, formatters.
- Must-NOT-test:
  - Spring wiring.
  - JPA queries (those belong in integration).

### 2.2 Integration tests (backend)

- Framework: JUnit 5 + Spring Boot Test + **Testcontainers** (real MySQL 8 container).
- Scope: HTTP-in through to DB-out. The "unit" is a feature.
- Where: `backend/src/test/java/.../<Feature>IntegrationTest.java`.
- Setup: `@SpringBootTest` with a Testcontainers-managed MySQL container, Flyway runs from V1 on a fresh DB per class (or per method when state matters).
- **Mocks vs. real**:
  - **DB**: always real (Testcontainers). Never H2 — InnoDB quirks and SQL dialect matter, and the schema's `UNIQUE` constraints and `SELECT … FOR UPDATE SKIP LOCKED` need to behave exactly like prod.
  - **Redis**: real (Testcontainers) for tests that depend on Redis semantics; otherwise Embedded.
  - **Payment gateway**: WireMock stub with a contract file in `backend/src/test/resources/contracts/payment-gateway.json`.
  - **Email / SMS / Push**: collected by an in-process spy; assertions on `(channel, recipient, payload)`.
- Must-test:
  - Every controller endpoint: happy path + at least one failure path + auth/RBAC.
  - Every invariant from the threat model and architecture doc:
    - Two concurrent locks on the same seat → exactly one wins, one gets `409 SEAT_TAKEN`.
    - Replay of the same Idempotency-Key returns the cached response.
    - `ORDER_ITEMS.event_seat_id` UNIQUE prevents double-booking even when the application code is bypassed.
    - Sweeper releases an expired lock and does not release a freshly-paid one.
  - The compensation flow ("paid but ticket-issue commit fails") — simulate the commit failure by injecting a constraint violation.

### 2.3 Contract tests

- Framework: `openapi-validator` (or `atlassian/swagger-request-validator`) wired into integration tests.
- Goal: every response from every endpoint conforms to the OpenAPI schema, every request validates against it. If the spec and the code disagree, the test fails — forcing one to be updated.

### 2.4 End-to-end (E2E)

- Framework: Playwright (web) + Maestro (mobile) — TBD final picks.
- Scope: full user journey on a deployed staging environment, real browser, real network to the API.
- Coverage: the **golden paths** only:
  - Customer registers → buys 2 seats → receives ticket QR.
  - Organizer creates an event → publishes → it appears in listings.
  - Staff scans a valid QR → it goes `USED`.
  - Customer attempts to scan an already-used QR → rejected.
- Runtime budget: < 10 minutes for the whole suite.
- E2E does **not** chase edge cases — those belong in integration.

### 2.5 Load / performance

See [`nfr-load-test-plan.md`](nfr-load-test-plan.md). Load runs on schedule, not on every PR.

### 2.6 Frontend (Vite / React)

- Unit: Vitest + React Testing Library for components with logic.
- Integration: MSW (Mock Service Worker) to mock the backend at the network layer. Assertions on user-visible behavior, not implementation.
- E2E: Playwright (see §2.4).
- No snapshot tests unless the value over a normal RTL assertion is clear.

---

## 3. Invariant tests (the non-negotiable ones)

These tests must exist and must pass on every PR. They protect the business-critical correctness properties:

| ID | Property | Where |
|---|---|---|
| INV-1 | Two concurrent lock requests on the same seat — exactly one succeeds. | `SeatLockConcurrencyIntegrationTest` |
| INV-2 | After 50 concurrent paid orders for distinct seats, `COUNT(*) FROM ORDER_ITEMS GROUP BY event_seat_id HAVING COUNT(*) > 1` is empty. | same |
| INV-3 | After 100 ticket issuances, `COUNT(*) FROM TICKETS GROUP BY qr_code HAVING COUNT(*) > 1` is empty. | `TicketIssuanceIntegrationTest` |
| INV-4 | Idempotency-Key replay returns the original response body and status code. | `IdempotencyIntegrationTest` |
| INV-5 | Sweeper releases an expired lock; does not release one that became `BOOKED` during the sweep. | `SweeperIntegrationTest` |
| INV-6 | Payment commit failure after `PAYMENT_SUCCESS` enqueues a refund and marks the order `REFUND_PENDING`. | `PaymentCompensationIntegrationTest` |
| INV-7 | Two devices syncing the same offline check-in: the earliest scan wins; the later one logs to `AUDIT_LOGS` with `DUPLICATE_OFFLINE_CHECKIN`. | `OfflineCheckinIntegrationTest` |
| INV-8 | An expired JWT is rejected; a revoked refresh token is rejected. | `AuthIntegrationTest` |
| INV-9 | An IP exceeding the rate limit gets `429` with `Retry-After`. | `RateLimitIntegrationTest` |

These tests use real concurrency (`CompletableFuture` / `ExecutorService` with N threads) — not Mockito. Mocks can't reproduce a race.

---

## 4. Test data

- Seed scripts in `backend/src/test/resources/fixtures/` provide a deterministic baseline: 1 published event, 100 seats, 3 ticket types, 10 users (mix of roles).
- Each integration test class is responsible for tearing down what it inserts. We prefer `@Transactional` rollback when feasible, explicit DELETEs when the test commits intentionally.
- **No production data in tests, ever.** Even anonymized. Anything that comes from prod goes through a synthetic data generator first.

---

## 5. Coverage

- Target: ≥ 75 % line coverage on `backend/src/main/java/com/odoomaster/ticketing/service/` and `web/`.
- Target: ≥ 60 % line coverage overall.
- Coverage is a smell detector, not a goal. Reviewers reject "test added to hit the coverage line" PRs.

---

## 6. Test environments

| Env | Purpose | DB | Cleanup |
|---|---|---|---|
| Local | dev's machine | Docker Compose MySQL | dev controls |
| CI | per-PR pipeline | Testcontainers MySQL | per-run fresh |
| Staging | E2E + load + manual QA | managed MySQL | nightly seed reset |

---

## 7. CI gates

A PR cannot merge to `develop` unless:

1. `mvn verify` passes (unit + integration + contract).
2. Frontend `npm run test` passes.
3. The OpenAPI spec validates and matches all controller responses (contract tests).
4. Code coverage does not drop below the targets in §5.
5. No new test class is marked `@Disabled` without an inline reason comment.

A PR cannot merge to `main` (release) unless:

6. E2E suite passes against staging.
7. Load scenarios A + B + C pass against staging.

---

## 8. Anti-patterns the reviewer rejects

- Mocking `EntityManager` / `JdbcTemplate` instead of using Testcontainers.
- Using H2 to "speed up" tests — H2 does not enforce InnoDB constraints the way production does.
- Sleeps and `Thread.sleep` in tests. Use `Awaitility` with explicit conditions.
- Asserting on log messages as the primary assertion.
- Tests that depend on order between methods within a class.
- Tests that only pass when the test machine is fast — race-prone synchronization with `Thread.sleep`.

---

## 9. Open questions

- [ ] Playwright vs. Cypress for web E2E — Playwright leading.
- [ ] Mobile E2E framework: Maestro vs. Detox.
- [ ] Mutation testing (PIT) — useful but expensive; defer to Sprint 3.
