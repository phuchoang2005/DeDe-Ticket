# Tracking Sheet — Iteration 7

> Date: 2026-07-31 → 2026-08-03
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

## Sprint 3 — Decouple remaining consumers & cascade ✅

> Date: 2026-08-03

Goal: remove every remaining cross-module repository/entity access from the
non-hot-path consumers (`AdminEventService`, `AnalyticsService`, `CheckInService`,
`TicketService`, `FeedbackService`), replace the admin delete's hand-written
foreign-row cascade with an event-driven one, and lock in the DAG by pushing all
entities/repositories behind each module's `internal` package.

| # | Change | Status |
|---|---|---|
| 1 | Publish the last enabling APIs: `iam/UserDirectory` (`find`/`findByEmail` → `UserRef`), `sales/SalesReporting` (paid revenue total/per-event, `revenueByDay` → `DailyRevenue`, order/payment status counts — the `Object[]`→`LocalDate` mapping moved here from `AnalyticsService`), `ticketing/TicketingReporting` (ticket totals + per-event/status counts); extend `catalog/EventCatalog` (`listForReporting` → `EventStats`, event/seat count aggregates) and `catalog/SeatInventory` (`releaseSold` for the cancel/refund path). Repoint `NotificationDataSeeder` off `UserRepository` onto `UserDirectory` (the Sprint 2 deferral) | ✅ |
| 2 | `AdminEventService`: revenue now catalog-local `SUM(price)` over `SOLD` `EventSeat`s (`EventSeatRepository.sumSoldPriceForEvent`); DRAFT-revert guard now catalog-local `existsByEventIdAndStatus(id,'SOLD')`; `delete()` publishes `shared/event/EventDeletedEvent` and drops the `Order`/`OrderItem`/`Payment`/`Ticket` repositories. New synchronous `@EventListener` purgers — `sales/internal/SalesEventCleanupListener` (order items → payments → order) and `ticketing/internal/TicketingEventCleanupListener` (check-ins → tickets) — run `Propagation.MANDATORY` inside the delete tx so the cascade stays atomic | ✅ |
| 3 | `AnalyticsService` rebuilt on `EventCatalog` + `SalesReporting` + `TicketingReporting`; drops `Event`/`EventSeat`/`Order`/`Payment`/`Ticket` repositories. Report output (KPIs, revenue-by-day, leaderboard, funnel, category breakdown, security signals) unchanged | ✅ |
| 4 | `CheckInService` + `TicketService` onto `EventCatalog.find` / `SeatInventory.findSeats`; `TicketService.cancelMine` frees the seat via `SeatInventory.releaseSold` (SOLD→AVAILABLE + eviction) rather than mutating `EventSeat`. `FeedbackService` onto `EventCatalog` + `UserDirectory`. `CheckInServiceReliabilityTest`/`FeedbackServiceTest` re-pointed at the mocked projections | ✅ |
| 5 | Push all **18 entities + 18 repositories** from each module's base package into `<module>/internal` (36 git renames; new `feedback/internal`, `audit/internal`); `findTrending` JPQL FQN → `…catalog.internal.EventSeat`; base-package services that used same-package access (`OrderService`, `CheckInService`, `TicketService`, `FeedbackService`) gained explicit `…internal` imports | ✅ |
| 6 | New/extended tests (+16): `EventDeleteCascadeTest`, `SalesReportingReliabilityTest`, `AnalyticsServiceTest`, `UserDirectoryReliabilityTest`, plus `EventCatalog`/`SeatInventory` extensions | ✅ |

### Impact
- **Boundaries.** No production module references another module's entity or repository —
  every cross-module call goes through a published API (`EventCatalog`, `SeatInventory`,
  `TicketIssuance`, `SalesReporting`, `TicketingReporting`, `UserDirectory`) or the shared
  `EventDeletedEvent`. Entities/repositories are now physically hidden in `…/internal`.
- **Cascade decoupled & hardened.** `catalog` deletes an event by publishing `EventDeletedEvent`;
  `sales`/`ticketing` observe it and purge their own rows. The ticketing purge now also removes
  **check-ins** before tickets — a correctness refinement, since the old catalog-side cascade
  deleted only tickets and would have failed the `check_ins.ticket_id → tickets.id` FK when an
  event had checked-in tickets. Listeners are `MANDATORY`, so they can only run inside the
  delete transaction — the whole cascade is atomic.
- **Revenue equivalence.** Admin views take revenue catalog-locally (`Σ SOLD seat price`);
  analytics takes it from `SalesReporting` (`Σ PAID order total`). Both agree while
  `totalAmount == Σ seat price` (no fees/discounts) — see the plan's risk note.
- **Tests.** 706 → 722.

### Verification
| Check | Result |
|---|---|
| `cd backend && mvn test` (JDK 21) | ✅ BUILD SUCCESS — 722 tests, 0 failures, 0 errors |
| Runtime boot smoke — Docker MySQL + throwaway `redis:7-alpine`, dev profile | ✅ context boots in ~51s with all entities in `…/internal` (Hibernate maps them, repositories wire, Flyway migrates); `GET /v1/health` → `UP` |
| JPQL FQN after the move | ✅ `GET /v1/events/trending` (runs `findTrending` with `…catalog.internal.EventSeat`) returns events |
| Analytics on the reporting APIs | ✅ `GET /v1/admin/analytics` → coherent report (revenue 800 000, 3 659 seats, 60 events) composed from `SalesReporting`/`TicketingReporting`/`EventCatalog` |
| `EventDeletedEvent` cascade | ✅ admin create DRAFT event → `DELETE` returns 204 (both `MANDATORY` listeners run in-tx, no error) → `GET` → 404 |
| Behaviour / API / schema | unchanged |

### Notes
- **Redis for admin writes.** `AdminEventService`'s write paths carry `@CacheEvict`, so with the
  Redis cache manager active they need Redis reachable; the dev compose omits Redis (as in Sprint 2),
  so the smoke attached a throwaway `redis:7-alpine` to the compose network — a pre-existing
  environment need, not a Sprint 3 change.
- **Redundant same-package imports** on the relocated entities/repositories were carried over from
  the pre-existing codebase convention (repositories already self-imported their entity) and left as-is.
- **Deferred to Sprint 4:** boundary **enforcement** — `@ApplicationModule(allowedDependencies = …)`
  per the DAG, `shared` OPEN, and `ApplicationModules.verify()` — plus `Documenter` output and the ADR.
- Commits: `feat(backend): publish UserDirectory, SalesReporting, TicketingReporting + extend catalog APIs`;
  `refactor(catalog): decouple AdminEventService + wire EventDeletedEvent cascade`;
  `refactor(analytics): decouple AnalyticsService onto reporting APIs`;
  `refactor(ticketing,feedback): decouple CheckIn/Ticket/Feedback onto module APIs`;
  `refactor(backend): push module entities & repositories into internal`;
  `test(backend): cover Sprint 3 APIs & the EventDeletedEvent cascade`.

## Sprint 4 — Enforce boundaries & documentation ✅

> Date: 2026-08-03

Goal: turn on Modulith boundary **verification** and produce the module
documentation + ADR. No capability logic changes.

| # | Change | Status |
|---|---|---|
| 1 | Declare `@ApplicationModule(allowedDependencies = …)` in a `package-info.java` for all **8 capability modules** per the agreed DAG (`catalog→shared`; `ticketing→catalog`; `sales→catalog,ticketing`; `feedback→catalog,iam`; `analytics→catalog,sales,ticketing`; `notification→iam`; `iam→shared`; `audit→shared`) | ✅ |
| 2 | Add `ModularityTests` → `ApplicationModules.of(Application.class).verify()`: pure static classpath analysis (no Spring context, no datasource), so it runs in a plain `mvn test` and **fails the build** on any cycle or any cross-module dependency not in `allowedDependencies` | ✅ |
| 3 | **Flatten the `shared` kernel** into its base package. `verify()` proved the Sprint 0 assumption wrong: Modulith 1.1 has **no** open modules (`type = Type.OPEN` only exists from 1.2) and `ApplicationModule.OPEN_TOKEN` only frees a module's *outgoing* deps — it does not expose nested-package types. So the sub-package kernel (`shared/exception`, `/web`, `/security`, `/audit`, `/event`) exposed an **empty** API and every reference to it read as an internal-access violation. Moved the 10 kernel types up into `com.odoomaster.ticketing.shared` (git renames, history preserved), rewrote ~35 consumer imports; consumers now allow a plain `"shared"` | ✅ |
| 4 | Add `DocumentationTests` → `Documenter`: system-wide C4 `components.puml`, one `module-<name>.puml` per module, one `module-<name>.adoc` canvas per module. Writes to Documenter's default `target/` folder so a plain `mvn test` never dirties the repo; the snapshot is committed under `docs/architecture/modulith/` with a README (mermaid DAG, file guide, regeneration steps) | ✅ |
| 5 | Docs: `adr/0011-spring-modulith.md` (+ ADR index row); rewrite `architecture/system-architecture.md` §3 to the capability-module view + DAG + module table; refresh the **Architecture** section of `CLAUDE.md` (module structure, flat kernel, `verify()` enforcement, updated cross-cutting package locations); this tracking entry | ✅ |

### Impact
- **Enforcement is live.** Module boundaries are no longer a convention — `ModularityTests.verify()`
  fails the build on any cycle or any cross-module dependency not declared in `allowedDependencies`.
  The full DAG (9 modules + kernel) is now machine-checked on every `mvn test`.
- **Kernel correction (deviation from Sprint 0/3).** The "OPEN `shared` module" recorded in earlier
  sprints never actually exposed its types — `OPEN_TOKEN` governs *outgoing* deps and 1.1 has no open
  modules. Flattening the kernel into a single package is the Modulith 1.1 idiom and makes it genuinely
  freely-usable (`"shared"`, no named interface). Rationale + rejected alternatives in
  [`adr/0011`](../adr/0011-spring-modulith.md).
- **Docs regenerate from code.** C4 diagrams + per-module canvases come from the live module model, so
  they cannot silently drift; `docs/architecture/modulith/README.md` documents regeneration.
- **No behaviour change.** Package moves + annotations + two tests + docs only; no logic, schema, or API touched.
- **Tests.** 722 → 724 (`ModularityTests`, `DocumentationTests`).

### Verification
| Check | Result |
|---|---|
| `cd backend && mvn test` (JDK 21) | ✅ BUILD SUCCESS — 724 tests, 0 failures, 0 errors |
| `ModularityTests.verify()` | ✅ green — no cycles, no boundary violations across the 9 modules + kernel |
| `Documenter` regeneration | ✅ `mvn test -Dtest=DocumentationTests` writes `components.puml` + 9 `module-*.puml` + 9 `module-*.adoc` |
| Runtime boot smoke — Docker MySQL + backend, dev profile | ✅ context boots (Flyway up-to-date, all `…/internal` entities mapped, filters wired); `GET /v1/health` → `UP`; `GET /v1/events` → 200 seeded events; `GET /v1/events/trending` → 200 (`findTrending` on `catalog.internal.EventSeat`) — the flattened `shared` kernel (HealthController/TraceIdFilter/GlobalExceptionHandler/SecurityConfig) resolves at runtime |
| Behaviour / API / schema | unchanged |

### Notes
- **Deviation from the plan.** The plan (and Sprints 0/3) assumed `shared` was an OPEN module via
  `OPEN_TOKEN`. Turning on `verify()` this sprint surfaced that this exposed nothing, so `shared` was
  **flattened**. Rejected alternatives (documented in ADR-0011): per-facet `@NamedInterface`s — 1.1.12
  does not merge same-named interfaces across packages, so every consumer would have to enumerate each
  kernel facet it uses; and upgrading to Modulith 1.2 for real open modules — a *runtime* dependency
  change targeting Boot 3.3, more risk than a one-time package flatten.
- Commits: `test(backend): enforce Modulith boundaries via ModularityTests.verify()`;
  `docs(architecture): generate Modulith module canvas & C4 diagrams`;
  `docs(tracking): record Sprint 4 boundary enforcement & docs`.

---

## Iteration 7 — done

All four sprints landed green and shippable. The backend is now a Spring Modulith modular monolith
sliced by business capability, with `…/internal` encapsulation, published module APIs, an event-driven
delete cascade, and **build-time boundary enforcement** (`ModularityTests.verify()`) — runtime behaviour,
schema, and API unchanged from the [tracking-6](./tracking-6.md) baseline.
