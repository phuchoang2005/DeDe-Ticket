# Tracking Sheet — Iteration 7

> Date: 2026-07-31 (in progress)
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

## Sprint 1 — Carve capability modules — _pending_
## Sprint 2 — Publish module APIs & decouple the ordering hot path — _pending_
## Sprint 3 — Decouple remaining consumers & cascade — _pending_
## Sprint 4 — Enforce boundaries & documentation — _pending_
