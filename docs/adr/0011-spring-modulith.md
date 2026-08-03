# ADR-0011: Spring Modulith modules with enforced boundaries

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deciders:** Tech lead
- **Supersedes:** partially reshapes [ADR-0001](0001-monolith-spring-boot.md) (stays a monolith; re-slices its internals)

## Context

The backend (`com.odoomaster.ticketing`) shipped as a **technically-layered** Spring
Boot monolith: `controller / service / repository / domain / dto`. A single business
capability (ordering, ticketing, catalog…) was smeared across every layer, and
**nothing stopped one capability from reaching into another's entities or
repositories**. `OrderService` read `Event`/`EventSeat`/`Ticket` repositories directly;
`AnalyticsService` joined five modules' tables. Coupling was invisible until it broke,
and the concurrency-critical `OrderService.pay()` flow was entangled with foreign
persistence. We want capability boundaries that are **explicit, documented, and
verified at build time**, without giving up the operational simplicity of a single
deployable (still justified by [ADR-0001](0001-monolith-spring-boot.md); we are not
ready for the network boundaries, distributed transactions, and ops overhead of
microservices).

## Decision

Adopt **Spring Modulith** (1.1.12, the line aligned to Spring Boot 3.2). Re-slice the
backend by **business capability** into **9 modules + a shared kernel**, direct
sub-packages of `com.odoomaster.ticketing`:

`shared` (kernel), `iam`, `catalog`, `ticketing`, `sales`, `notification`, `feedback`,
`analytics`, `audit`.

Rules:

- **API vs internal.** Each module exposes only the API types in its **base package**;
  entities, repositories and impls live in a hidden **`…​.internal`** sub-package that
  other modules cannot reference.
- **Cross-module calls go through published APIs**, not foreign repositories:
  `EventCatalog`, `SeatInventory`, `TicketIssuance`, `SalesReporting`,
  `TicketingReporting`, `UserDirectory`. All still execute inside **one Spring
  transaction**, so ACID and the seat-lock semantics are unchanged.
- **Declared dependencies.** Every module's `package-info.java` carries
  `@ApplicationModule(allowedDependencies = …)`. The enforced DAG:

  ```
  catalog → shared
  ticketing → catalog, shared
  sales → catalog, ticketing, shared
  feedback → catalog, iam, shared
  analytics → catalog, sales, ticketing, shared
  notification → iam, shared        (+ listens shared:TicketsIssuedEvent)
  iam → shared
  audit → shared                    (matches @Auditable via AOP — no compile dep)
  ```

- **Three cycle-breakers** keep `catalog` from depending on `sales`/`ticketing`:
  1. admin revenue = catalog-local `Σ price` over `SOLD` seats;
  2. the "cannot revert to DRAFT once tickets issued" guard = catalog-local
     `existsByEventIdAndStatus(id,'SOLD')`;
  3. delete-event cascade = `catalog` publishes `shared:EventDeletedEvent`; `sales`
     and `ticketing` listen (synchronous, `MANDATORY`) and purge their own rows in the
     delete transaction.
- **Verification is a test.** `ModularityTests` runs
  `ApplicationModules.of(Application.class).verify()` — pure static classpath analysis
  (no Spring context, no datasource) that **fails the build** on any cycle or any
  cross-module dependency not in `allowedDependencies`.
- **Docs are generated.** `DocumentationTests` runs `Documenter` to emit a C4 component
  diagram, per-module diagrams and per-module canvases; the snapshot lives in
  [`../architecture/modulith/`](../architecture/modulith/).

**Shared kernel is flat.** All cross-cutting types (`AppException`, `ApiErrorEnvelope`,
`GlobalExceptionHandler`, `TraceIdFilter`, `AuthPrincipal`, `@CurrentUser`,
`@Auditable`, `TicketsIssuedEvent`, `EventDeletedEvent`) live **directly in the
`shared` base package**, so the whole kernel is exposed API and any module depends on it
with a plain `"shared"`. Modulith 1.1 has **no open modules** (`type = Type.OPEN`
arrived in 1.2, which needs Boot 3.3+), and `ApplicationModule.OPEN_TOKEN` only marks a
module's *outgoing* dependencies unconstrained — it does **not** expose nested-package
types. Flattening is the 1.1 idiom for a frictionless shared kernel; enforcement
(`verify()`, turned on in Sprint 4) is what surfaced that the earlier sub-package layout
left `shared`'s API empty.

## Consequences

**Easier:** coupling is now a compile/test-time error, not a code-review guess. New
contributors read the module canvas + the DAG and know exactly what each capability may
touch. The ordering hot path is decoupled from foreign persistence yet keeps its single
transaction. Architecture docs regenerate from code, so they cannot silently drift.

**Harder:** a legitimately new cross-module call fails `verify()` until its
`allowedDependencies` is updated (intended friction). Reporting that spans modules must
be composed via published aggregate APIs rather than ad-hoc joins.

**Accepted:** still one deployable and one database — Modulith enforces *logical*
boundaries only; it does not stop a `@Transactional` method spanning modules (which we
rely on for `pay()`). Revenue equivalence between the catalog-local figure and
`SalesReporting` holds only while `order.totalAmount == Σ seat price` (no fees/discounts);
if that changes, admin revenue must move to `SalesReporting`.

## Alternatives considered

- **Stay technically-layered + ArchUnit rules.** Hand-written ArchUnit rules could ban
  cross-package access, but we'd re-implement module modelling, named interfaces, and
  diagram generation that Modulith gives for free.
- **Split into microservices.** Rejected for this stage — network boundaries and
  distributed transactions would break the single-transaction seat-lock/sell/issue flow
  and add ops we don't need at current scale. Modulith keeps the option open later.
- **Named interfaces for the shared kernel** (keep `shared/exception`, `shared/web`, …
  and expose each via `@NamedInterface`). Rejected: 1.1.12 does not merge same-named
  interfaces across packages, so every consumer would have to enumerate each kernel facet
  it uses — the opposite of a freely-usable kernel. Flattening gives a plain `"shared"`.
- **Upgrade to Modulith 1.2 for real open modules.** Rejected: `spring-modulith-starter-core`
  is a *runtime* dependency and 1.2 targets Boot 3.3; a framework bump mid-refactor is
  more risk than a one-time package flatten.

## Implementation rules

- Any schema/behaviour-preserving module change MUST keep `mvn test` (incl.
  `ModularityTests.verify()`) green — a boundary violation is a review-block.
- New cross-module access goes through a **published API type in the target's base
  package** or a **`shared` event**, never a foreign `…​.internal` type.
- `shared` must not depend on any capability module (it is the base of the DAG).
- After changing modules, regenerate the docs (`mvn test -Dtest=DocumentationTests`,
  then copy into `docs/architecture/modulith/`) — see that folder's README.
