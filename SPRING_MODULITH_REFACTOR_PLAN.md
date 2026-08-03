# Spring Modulith Refactor — Sprint Plan

## Context

The backend (`backend/`, `com.odoomaster.ticketing`) is a **technically-layered** Spring Boot 3.2 / Java 21 monolith: packages are `controller / service / repository / domain / dto / …`, so a single business capability (e.g. ordering) is smeared across every layer and nothing enforces boundaries between capabilities.

**Goal:** re-slice the backend by **business capability** into Spring Modulith modules with enforced, documented boundaries, while preserving all runtime behaviour — especially the concurrency-critical `OrderService.pay()` single-transaction seat-lock/sell/issue flow.

**Decisions (agreed with the team):**
- **Coarser module set** — merge `order`+`payment` into one `sales` module; fold venue templates into `catalog`.
- **Decouple cross-module calls to module service APIs** — services stop reaching into *other* modules' repositories/entities and instead call published module APIs (still inside one Spring transaction, so ACID/locking is unchanged) or communicate via application events.

**Why it's feasible:** entities are coupled by **`Long` id references**, not JPA object graphs (only `Event↔EventCategory` and `User↔Role` graphs exist, both inside one module); `order→notification` is already event-driven (`TicketsIssuedEvent`).

---

## Target architecture (reference)

Modules = direct sub-packages of `com.odoomaster.ticketing`. Each module exposes only **API types in its base package**; entities, repositories and impls live in a hidden `…​.internal` sub-package. Cross-cutting infra lives in an **OPEN** `shared` module every module may use. `Application` stays in the root package.

### Module map (9 modules + shared)

| Module | Owns | Publishes (API) |
|---|---|---|
| `shared` (OPEN) | `AppException`, `ApiErrorEnvelope`, `GlobalExceptionHandler`, `TraceIdFilter`, `CurrentUser`, `AuthPrincipal`, `@Auditable`, event contracts `TicketsIssuedEvent`, `EventDeletedEvent` | all types |
| `iam` | User, Role, Auth, `JwtService`, `JwtAuthenticationFilter`, `SecurityConfig`, Auth/User controllers | `UserDirectory` |
| `catalog` | Event, EventCategory, TicketType, **EventSeat**, **Venue/Seat/Section**, `CacheConfig`, `SeatLockSweeperJob`, `EventService`, `SeatCatalogService`, `AdminEventService` (writes), Event/Admin* controllers | `EventCatalog`, `SeatInventory`, event-admin write API |
| `ticketing` | Ticket, CheckIn, `TicketService`, `CheckInService`, TicketController | `TicketIssuance`, `TicketingReporting` |
| `sales` | Order, OrderItem, Payment, PaymentRetry, `OrderService`, `PaymentRetryService`, payment-gateway strategy, OrderController | `SalesReporting` |
| `notification` | Notification, `NotificationService`, `NotificationEventListener`, NotificationController | `Notifications` |
| `feedback` | Feedback, `FeedbackService`, Feedback/AdminFeedback controllers | — |
| `analytics` | `AnalyticsService`, AnalyticsController | — |
| `audit` | AuditLog, `AuditAspect`, `AuditLogRepository`, AdminAuditController | — |

### Dependency graph (must stay acyclic — Modulith rejects cycles)

```
shared  ◄────────────── (everyone)
catalog → shared
ticketing → catalog, shared
sales → catalog, ticketing, shared
feedback → catalog, iam, shared
analytics → catalog, sales, ticketing, shared
notification → iam, shared      (+ listens shared:TicketsIssuedEvent)
iam → shared
audit → shared                  (AuditAspect matches @Auditable via AOP — no compile dep)
```

### Three cycle-breakers (key design)
`catalog`/`AdminEventService` currently reads/writes orders/payments/tickets → would create `catalog ↔ sales`/`catalog ↔ ticketing` cycles. Resolved by:
1. **Revenue** in admin views → catalog-local `SUM(price)` over `SOLD` `EventSeat`s (≡ `orders.sumPaidRevenueForEvent` while `totalAmount` == Σ seat price, no fees/discounts).
2. **"cannot revert to DRAFT once tickets issued"** guard → catalog-local `seats.existsByEventIdAndStatus(id,'SOLD')` (seat `SOLD` ⟺ ticket issued 1:1).
3. **Delete-event cascade** → catalog deletes its own seats/categories and publishes `EventDeletedEvent`; `sales` & `ticketing` listen and purge their rows (synchronous `@EventListener` in the delete tx → atomic).

### Cross-module decoupling summary
- **`OrderService`** (`sales`): `EventCatalog.requireOnSale` / `SeatInventory.lockSeats|markSold|releaseLocks` / `TicketIssuance.issueForOrder` replace foreign repos; seat state machine + lock TTL + cache eviction **move into catalog's `SeatInventory`**; keeps one `@Transactional`.
- **`AdminEventService`** (`catalog`): revenue + DRAFT-guard catalog-local; `delete()` → `EventDeletedEvent`.
- **`AnalyticsService`**: `SalesReporting` / `TicketingReporting` / `EventCatalog`.
- **`CheckInService`/`TicketService`**: `EventCatalog` / `SeatInventory`.
- **`FeedbackService`**: `EventCatalog` + `iam.UserDirectory`.
- **`DataSeeder`**: split into per-module `@Order`ed seeders.

---

## Sprints

Each sprint ends in a **green, shippable state** (`cd backend && mvn test` compiles and passes). Sprints are sequential; the risky ordering hot-path work (Sprint 2) is isolated.

### Sprint 0 — Modulith tooling & shared kernel ✅ _(done — see docs/tracking/tracking-7.md)_
**Goal:** introduce Spring Modulith and extract the cross-cutting kernel without touching capability logic.
- Add `spring-modulith-bom` (aligned to Boot 3.2, `1.1.x`) + `spring-modulith-starter-core`; test-scoped `spring-modulith-starter-test`, `spring-modulith-docs`.
- Create `shared` module (`type = OPEN`): move `exception/`, `web/`, `security/CurrentUser`+`AuthPrincipal`, `audit/Auditable`, and event contracts (`TicketsIssuedEvent`; add `EventDeletedEvent`).
- Everything else stays layered for now; fix imports.
**DoD:** compiles; full existing test suite green.

### Sprint 1 — Carve capability modules (structural move) ✅ _(done — see docs/tracking/tracking-7.md)_
**Goal:** physically re-slice remaining code into the 9 modules + `…/internal`, no logic change.
- Create module + `…/internal` packages; move controllers/services/domain/repos/dtos per the map.
- `SecurityConfig` + `Jwt*` → `iam/internal`; `CacheConfig` → `catalog/internal`.
- Split `DataSeeder` into per-module seeders (`iam`, `catalog`, `notification`), `@Order`ed; notification seeder resolves the demo user via `UserDirectory`.
- Cross-module foreign-repo calls still compile (needed repos briefly package-visible).
**DoD:** compiles; all existing tests pass with updated packages/imports.

### Sprint 2 — Publish module APIs & decouple the ordering hot path *(highest risk)* ✅ _done 2026-08-01_
**Goal:** the concurrency-critical decoupling.
- Add `catalog/EventCatalog`, `catalog/SeatInventory` (seat `AVAILABLE→LOCKED→SOLD` machine, lock TTL and event-cache eviction moved in), `ticketing/TicketIssuance` (+impls in `…/internal`).
- Refactor `OrderService` off `Event`/`EventSeat`/`Ticket` repos → these APIs; remove its `@CacheEvict` (eviction now lives with the seat mutations).
**DoD:** order→pay→issue→notification flow works end-to-end; `OrderServiceReliabilityTest` **rewritten** to mock the new APIs; **new `SeatInventory` concurrency/double-booking tests** carry the guarantees that moved out of `OrderService`; `mvn test` green.

### Sprint 3 — Decouple remaining consumers & cascade ✅ _done 2026-08-03_
**Goal:** remove all other cross-module repo access and lock in the DAG.
- `AdminEventService`: catalog-local revenue + DRAFT guard; `delete()` publishes `EventDeletedEvent`; add `sales` + `ticketing` listeners that purge their rows.
- `AnalyticsService` → `SalesReporting`/`TicketingReporting`/`EventCatalog` (add the aggregate methods those APIs need).
- `CheckInService`/`TicketService` → `EventCatalog`/`SeatInventory`; `FeedbackService` → `EventCatalog`/`UserDirectory`.
- Push all entities/repositories into `…/internal`.
**DoD:** no module references another module's internals; `CheckInServiceReliabilityTest`, `FeedbackServiceTest`, `SeatLockSweeperJobTest` etc. updated; `mvn test` green.

### Sprint 4 — Enforce boundaries & documentation
**Goal:** turn on verification and produce docs.
- Add `ModularityTests` → `ApplicationModules.of(Application.class).verify()`; add `@ApplicationModule(allowedDependencies = …)` per the DAG; `shared` OPEN.
- Generate module docs via `Documenter` → `docs/architecture/modulith/` (C4 component diagrams + module canvas).
- Write `docs/adr/0011-spring-modulith.md`; `docs/tracking/tracking-7.md` (follow the tracking-6 format: date 2026-07-30, scope, change table); update `docs/architecture/system-architecture.md` and the **Architecture** section of `CLAUDE.md`.
**DoD:** `verify()` green (no cycles/boundary violations); docs generated & committed; boot smoke test passes.

---

## Verification

- `cd backend && mvn test` — existing + new tests pass, **including `ModularityTests.verify()`** and Documenter generation.
- Boot the stack (`docker compose -f docker-compose.dev.yml up --build`) and drive the module-spanning **seat-lock/pay path**: browse events → create order (seats `LOCKED`) → pay (seats `SOLD`, tickets issued, `TicketsIssuedEvent` → in-app notification) → confirm ticket QR + notification. Then: admin event **detail shows correct revenue/sold counts**; **delete an event** → its orders/payments/tickets are purged; analytics numbers match pre-refactor.
- Run `/code-review` (or the `verify` skill) on the diff before finishing each sprint.

## Risks
- **Concurrency-critical:** relocating the seat state machine + lock TTL into `SeatInventory` (Sprint 2) is the highest-risk change — preserve exact status transitions, lock semantics, and cache-eviction keys; migrate the double-booking tests alongside it.
- **Cycles:** any accidental `catalog → sales/ticketing` reference fails `verify()`; the three cycle-breakers must hold.
- **Test churn:** mock-based unit tests injecting foreign repos must be re-pointed at the new APIs.
- **Revenue equivalence** assumes `totalAmount == Σ seat price`; if fees/discounts are added, revenue must come from `SalesReporting` (composed in `analytics`, not `catalog`).
