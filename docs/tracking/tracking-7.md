# Tracking Sheet — Iteration 7

> Date: 2026-07-31 → 2026-08-01 (in progress)
> Scope: backend re-architecture from a technically-layered monolith
> (`controller / service / repository / domain / dto`) into
> **Spring Modulith** modules sliced by business capability, with
> enforced, documented boundaries. Runtime behaviour is preserved —
> especially the concurrency-critical `OrderService` seat-lock/sell/issue
> single-transaction flow.
> Baseline: [`tracking-6.md`](./tracking-6.md). Plan of record:
> [`../../SPRING_MODULITH_REFACTOR_PLAN.md`](../../SPRING_MODULITH_REFACTOR_PLAN.md).
> This is a multi-sprint iteration; each sprint appends below and ends in a
> green, shippable state (`cd backend && mvn test`).

---

## Sprint 0 — Modulith tooling & shared kernel ✅

Goal: introduce Spring Modulith and extract the cross-cutting kernel into
an OPEN `shared` module, without touching any capability logic.

| # | Change | Status |
|---|---|---|
| 1 | Add Spring Modulith tooling: import `spring-modulith-bom` 1.1.12 (the line aligned to Spring Boot 3.2), add `spring-modulith-starter-core` (runtime) + test-scoped `spring-modulith-starter-test` and `spring-modulith-docs` | ✅ |
| 2 | Create OPEN module `com.odoomaster.ticketing.shared` and relocate the kernel into sub-packages: `shared/exception` (`AppException`), `shared/web` (`ApiErrorEnvelope`, `GlobalExceptionHandler`, `TraceIdFilter`), `shared/security` (`CurrentUser`, `AuthPrincipal`), `shared/audit` (`@Auditable`), `shared/event` (`TicketsIssuedEvent`) | ✅ |
| 3 | Add published contract `shared/event/EventDeletedEvent` (delete-cascade; emitter + `sales`/`ticketing` listeners wired in Sprint 3) | ✅ |
| 4 | Declare `shared` OPEN via `@ApplicationModule(allowedDependencies = ApplicationModule.OPEN_TOKEN)` in `shared/package-info.java` (the Modulith 1.1 idiom; `type = Type.OPEN` only exists from 1.2, which needs Boot 3.3+) | ✅ |
| 5 | Fix-ups from the move: rewrite all consumer imports to `…​.shared.*`; add explicit imports to `AuditAspect` and `JwtAuthenticationFilter` (types were previously same-package); repoint the `AuditAspect` AOP pointcut string; soften two javadoc `@link`s so `shared` holds no upward references | ✅ |

### Impact
- **New module.** One module (`shared`) exists so far; all remaining code stays
  layered and is carved into capability modules in Sprint 1.
- **File moves.** 8 files relocated as git renames (history preserved), 2 new files
  (`EventDeletedEvent`, `package-info`). ~25 consumer files had imports rewritten.
- **No behaviour change.** Pure relocation + import fixes; no logic, no schema, no API touched.

### Verification
| Check | Result |
|---|---|
| `cd backend && mvn test` (JDK 21) | ✅ BUILD SUCCESS — 691 tests, 0 failures, 0 errors |
| Behaviour / API / schema | unchanged |

### Notes
- **JDK.** The suite must run under **JDK 21** (`JAVA_HOME` →
  `/Library/Java/JavaVirtualMachines/openjdk.jdk/Contents/Home`). The machine
  default resolves to JDK 26, on which Mockito's inline mock maker fails to
  instrument classes (~34 spurious errors) — an environment issue, not the code.
- Boundary **verification** (`ApplicationModules.verify()`) and Documenter output
  are deferred to Sprint 4; the test-scoped starters are in place ready for it.

## Sprint 1 — Carve capability modules ✅

> Date: 2026-08-01

Goal: physically re-slice the remaining layered code into the 8 business
capability modules (alongside the Sprint 0 `shared` kernel), with **no logic
change**. Boundary enforcement stays off — cross-module foreign-repo calls
still compile — so this is a pure structural move plus import fixes.

| # | Change | Status |
|---|---|---|
| 1 | Create the 8 capability modules under `com.odoomaster.ticketing` — `iam`, `catalog`, `ticketing`, `sales`, `notification`, `feedback`, `analytics`, `audit` — and move every controller / service / domain entity / repository / dto into its owning module per the plan's module map | ✅ |
| 2 | `iam/internal` ← `SecurityConfig`, `JwtService`, `JwtAuthenticationFilter` | ✅ |
| 3 | `catalog/internal` ← `CacheConfig`, `SeatLockSweeperJob` | ✅ |
| 4 | `sales/payment` ← payment-gateway strategy (`MockPaymentGateway`, `PaymentGateway`, `PaymentGatewayResolver`, `PaymentRequest`, `PaymentResult`) | ✅ |
| 5 | `shared/web` ← `HealthController` (cross-cutting `/v1/health` liveness endpoint — the only controller with no capability owner) | ✅ |
| 6 | Expand `OrderService`'s `domain.*` / `repository.*` wildcard imports into explicit cross-module imports (`catalog` `Event`/`EventSeat`/`*Repository`, `ticketing` `Ticket`/`TicketRepository`); rewrite all remaining consumer imports repo-wide | ✅ |
| 7 | Re-point tests that reached their subject via same-package access — add explicit imports for `OrderService`, `CheckInService`, `NotificationService`, `PaymentRetryService`, `FeedbackService`/`FeedbackController`/`AdminFeedbackController`, `SeatLockSweeperJob` | ✅ |
| 8 | Split `config/DataSeeder` into three `@Order`-ed per-module `CommandLineRunner`s — `iam/internal/IamDataSeeder` (1), `catalog/internal/CatalogDataSeeder` (2), `notification/internal/NotificationDataSeeder` (3); remove the now-empty `config` package | ✅ |

### Impact
- **Module count.** 9 modules now (`shared` + 8 capabilities); every capability's
  code lives in its own module package.
- **File moves.** 80 files relocated as git renames (history preserved); 3 new
  seeder files; 1 file deleted (`DataSeeder`). Cross-module foreign-repo calls
  still compile — Modulith boundary enforcement (`…/internal` hiding,
  `@ApplicationModule`, `verify()`) is deferred to Sprint 4.
- **No behaviour change.** Pure relocation + import fixes + a behaviour-preserving
  seeder split; no logic, no schema, no API touched.

### Verification
| Check | Result |
|---|---|
| `cd backend && mvn test` (JDK 21) | ✅ BUILD SUCCESS — 691 tests, 0 failures, 0 errors |
| Runtime boot smoke — Docker MySQL + `mvn spring-boot:run` (dev profile) | ✅ context wires across all modules; Flyway migrated; `GET /v1/health` → `UP`; `POST /v1/auth/login` (`demo@dede.test`) → token |
| Seeders run in `@Order` sequence | ✅ `IamDataSeeder` (3 users) → `CatalogDataSeeder` (60 events) → `NotificationDataSeeder` (2 demo notifications); `/v1/events` and `/v1/notifications` served correctly |
| Behaviour / API / schema | unchanged |

### Notes
- The notification seeder resolves the demo user by email via a **direct
  `UserRepository` call** (permitted in Sprint 1); this is re-pointed at the
  `iam` `UserDirectory` API in Sprint 2.
- Entities and repositories intentionally stay in each module's **base** package
  for now; they are pushed into `…/internal` in Sprint 3, once cross-module
  consumers stop importing them directly.
- Commits: `refactor(backend): carve capability modules (Sprint 1)`;
  `refactor(backend): split DataSeeder into per-module seeders (Sprint 1)`.

## Sprint 2 — Publish module APIs & decouple the ordering hot path ✅

> Date: 2026-08-01

Goal (highest-risk sprint): publish the three cross-module APIs the sale spans
and refactor the concurrency-critical `OrderService` off other modules'
entities/repositories onto them, moving the seat state machine, lock TTL, and
event-cache eviction into catalog — all while preserving the single-transaction
seat-lock/sell/issue behaviour exactly.

| # | Change | Status |
|---|---|---|
| 1 | Publish `catalog/EventCatalog` (+ `catalog/internal/EventCatalogImpl`): `requireOnSale(eventId)` (not-found / not-published guards) and `find(eventId)`, returning the `EventSummary` projection instead of the `Event` entity | ✅ |
| 2 | Publish `catalog/SeatInventory` (+ `catalog/internal/SeatInventoryImpl`): `lockSeats` / `markSold` / `releaseLocks` / `findSeats`. The `AVAILABLE → LOCKED → SOLD` state machine, the 10-minute `LOCK_TTL_MINUTES`, and the event-cache eviction **moved here** from `OrderService`; returns the `SeatDetail` projection | ✅ |
| 3 | Publish `ticketing/TicketIssuance` (+ new `ticketing/internal/TicketIssuanceImpl`): `issueForOrder(TicketOrder)` builds/persists one `VALID` QR ticket per line and returns the count | ✅ |
| 4 | Refactor `OrderService`: drop `EventRepository`/`EventSeatRepository`/`TicketRepository` and the `Event`/`EventSeat`/`Ticket` imports; orchestrate via `EventCatalog` + `SeatInventory` + `TicketIssuance`; keep the sole `@Transactional` (inner APIs join it). Remove its `@Caching`/`@CacheEvict` — eviction now lives with the seat mutations in `SeatInventory` | ✅ |
| 5 | Rewrite `OrderServiceReliabilityTest` to mock the three APIs and assert orchestration (delegation args, ordering, idempotency, error propagation) | ✅ |
| 6 | New `SeatInventoryReliabilityTest` carrying the guarantees that moved out of `OrderService` — contention/double-booking rejection, cross-event guard, expired-lock re-lock, sell/release transitions, per-event cache eviction; new `TicketIssuanceReliabilityTest` (QR shape + unique QR under concurrent issuance, moved from the old order test); new `EventCatalogReliabilityTest` (on-sale guards + projection) | ✅ |

### Impact
- **Boundaries.** `sales` no longer imports any `catalog`/`ticketing` entity or
  repository — it depends only on the three published APIs. New `ticketing/internal`
  package created for the issuance impl.
- **Concurrency crux relocated.** The seat state machine + lock TTL + cache eviction
  now live in catalog's `SeatInventoryImpl`; `OrderService` is pure orchestration.
  The whole sale is still one Spring transaction, so ACID/locking is unchanged.
- **Eviction refinement (behaviour-preserving).** Eviction is now colocated with the
  seat mutation and keyed per-event for `events:seats`/`events:detail` (clearing
  `events:list`). The old idempotent-PAID `pay` and already-CANCELLED `cancel`
  early-returns no longer evict — correct, since no seat changes on those paths.
- **Tests.** Suite grew 691 → 706 (`OrderServiceReliabilityTest` 27 → 17 as the
  seat/QR cases moved out; +15 `SeatInventory`, +3 `TicketIssuance`, +7 `EventCatalog`).

### Verification
| Check | Result |
|---|---|
| `cd backend && mvn test` (JDK 21) | ✅ BUILD SUCCESS — 706 tests, 0 failures, 0 errors |
| Runtime hot-path smoke — local dev boot (Docker MySQL + local Redis), `demo@dede.test` | ✅ browse events → `POST /v1/orders` (seat `AVAILABLE→LOCKED`, order `PENDING`, `eventTitle` via `EventCatalog`) → `POST /v1/orders/{id}/pay` (seat `SOLD`, `VALID` 32-char QR ticket issued, `TICKETS_ISSUED` notification with event title, order `PAID`) → `DELETE /v1/orders/{id}` on a second order (seat `LOCKED→AVAILABLE` via `releaseLocks`) |
| Real Redis eviction inside the pay/cancel transaction | ✅ no failure; caches evicted on commit |
| Behaviour / API / schema | unchanged |

### Notes
- Redis is exercised for the first time end-to-end here (the pay path evicts caches);
  the dev compose omits Redis, so the smoke ran the backend locally against a
  throwaway `redis:7-alpine` container. Under `show-sql`, the catalog seeder takes
  ~4.5 min to insert the 60 events / 3.6k seats — data appears only after it finishes.
- **Deferred to Sprint 3:** the notification seeder still resolves the demo user via a
  direct `UserRepository` call; it is repointed at `iam`'s `UserDirectory` alongside the
  other cross-module consumers (Feedback/Analytics/CheckIn/Ticket) in Sprint 3.
- Commits: `feat(backend): publish EventCatalog, SeatInventory, TicketIssuance APIs`;
  `refactor(sales): decouple OrderService onto catalog/ticketing APIs`;
  `test(backend): cover new SeatInventory/TicketIssuance/EventCatalog APIs`.

## Sprint 3 — Decouple remaining consumers & cascade — _pending_
## Sprint 4 — Enforce boundaries & documentation — _pending_
