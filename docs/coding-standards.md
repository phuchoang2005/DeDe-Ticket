# Coding Standards

> Status: DRAFT — applies to all code in `backend/` and `frontend/`.
> Companion: [`definition-of-done.md`](definition-of-done.md), [`branching-strategy.md`](branching-strategy.md), [`github-commit-strategy.md`](github-commit-strategy.md).

This is what reviewers check against. Style auto-fixers handle most of it; this doc covers the parts that can't be auto-enforced.

---

## 1. Java / Spring Boot

### 1.1 Package layout

Already specified in `CLAUDE.md`. Restated here as a non-negotiable contract:

```
com.odoomaster.ticketing
├── config/         Spring @Configuration classes
├── controller/     HTTP endpoints, DTO ↔ domain mapping
├── service/        business logic, @Transactional
├── repository/     Spring Data JPA interfaces
├── domain/         JPA @Entity classes (not "entity", not "model")
├── dto/            request and response DTOs
├── security/       JWT filter, password encoder, RBAC helpers
├── integration/    external clients (payment, email, sms)
├── jobs/           scheduled tasks, sweeper, dispatcher
├── audit/          AuditLogService and friends
├── web/            cross-cutting HTTP concerns (filters, error mapper)
└── common/         shared utilities (date, money, ids) — keep small
```

### 1.2 Layering rules

- Controllers depend on services. They never call repositories.
- Services depend on repositories and other services. They never reference HTTP types (`HttpServletRequest`, `ResponseEntity`).
- Repositories return entities or projections. They never return DTOs.
- Mapping between DTOs and entities happens in **dedicated mapper classes** (MapStruct preferred) — not inline in controllers or services.

### 1.3 Transactions

- `@Transactional` lives on **service methods**, never on controllers or repositories.
- One service method = one logical unit of work = one transaction.
- For read-only flows: `@Transactional(readOnly = true)`.
- For the booking flow: `@Transactional(isolation = Isolation.REPEATABLE_READ)`.
- Long-running operations (> 1 s) do NOT run inside a single transaction. Break them into steps with their own transactions.

### 1.4 Naming

| Construct | Convention |
|---|---|
| Class | `PascalCase`, noun |
| Method | `camelCase`, verb |
| Constant | `SCREAMING_SNAKE_CASE` |
| Package | lowercase, no underscores |
| Test class | `<Subject>Test` for unit, `<Subject>IntegrationTest` for integration |
| Test method | `methodName_givenCondition_expectedOutcome` |
| DB column | `snake_case` |
| JPA field | `camelCase`, mapped via `@Column(name="...")` |

### 1.5 Style

- Java 21, but conservative use of preview features. No records-with-deconstruction patterns until they're stable.
- Use `var` only when the type is obvious from the right-hand side. Don't use `var` for collection types where the element type isn't visible.
- Prefer immutable: `final` on fields by default, `List.copyOf` on inputs, records for DTOs.
- Constructor injection only. **No** `@Autowired` field injection.
- One top-level class per file.
- Line length: 120 chars (matches Spotless / google-java-format).

### 1.6 Exceptions

- One project-wide hierarchy rooted at `AppException(String code, String message, HttpStatus status)`.
- Specific subclasses: `SeatTakenException`, `OrderStateInvalidException`, etc. — one per error code in `api/conventions.md`.
- `GlobalExceptionHandler` (`@RestControllerAdvice`) maps every `AppException` to the standard error envelope.
- Never catch `Exception` to swallow it. If you catch, you handle it or you re-throw.
- Never use exceptions for normal control flow.

### 1.7 Logging

- SLF4J via Lombok `@Slf4j`. No `System.out.println`. No `printStackTrace`.
- Levels:
  - `ERROR` — something is broken; humans need to look.
  - `WARN` — unexpected but the system handled it; review periodically.
  - `INFO` — significant business events (order paid, seats locked, sweeper pass complete).
  - `DEBUG` — useful during development.
  - `TRACE` — almost never; per-call gory detail.
- Structured logging in JSON in non-dev profiles. Required fields: `timestamp`, `level`, `logger`, `message`, `traceId`, `userId` (when known), `eventName` (for INFO+).
- Never log: passwords, password hashes, JWTs, refresh tokens, full credit-card numbers, full QR codes, email/phone in plain text (mask: `te***@example.com`).
- A `MDC` filter sets `traceId` per request; pull it into every log line automatically.

### 1.8 Validation

- Jakarta Bean Validation on every DTO field that takes user input.
- `@Valid` on controller parameters.
- Custom validators live in `common/validation/`.
- Validation errors → `400 VALIDATION_FAILED` with per-field `details`.

### 1.9 Comments and Javadoc

- Default to no comments. Code should read clearly.
- Write a Javadoc paragraph only when:
  - The class is a public service that other modules call.
  - The method's behavior surprises a reader (idempotency, retry semantics, hidden constraints).
- Never restate what the code does.

### 1.10 Forbidden

- `Thread.sleep` in production code.
- `new RestTemplate()` inline — use the configured `WebClient` bean.
- `System.currentTimeMillis()` — use `Clock` (injectable for tests).
- Static mutable state.
- Reflective access to private members.
- Spring `@Async` on transactional methods (the boundary doesn't compose the way people expect).

---

## 2. SQL (migration files)

- Tables `UPPER_SNAKE_CASE` matching the schema doc; columns `lower_snake_case`.
- One statement per logical change; semicolon-terminated.
- Every FK has an index.
- Use `ENUM` columns sparingly; prefer `VARCHAR` + app-side validation when the set changes often (Flyway makes enum extension awkward).
- Comments on non-obvious constraints — readers should understand *why* a UNIQUE is there.

---

## 3. Frontend (React + Vite)

### 3.1 Layout

```
frontend/src/
├── pages/        route-level components, one per screen
├── components/   reusable UI
├── services/     API clients (one file per backend domain)
├── hooks/        custom React hooks
├── store/        global state (Zustand or Redux — TBD)
├── utils/        pure helpers
└── styles/       Tailwind config + globals
```

### 3.2 Style

- Functional components only. No class components.
- Hooks rules of React (no conditional hooks).
- Tailwind for styling. Avoid arbitrary value classes (`w-[473px]`) — extend the theme.
- Prefer composition over prop drilling. Use context for cross-cutting state (auth, theme).
- File naming: `PascalCase.jsx` for components, `camelCase.js` for utils/services.

### 3.3 API calls

- All HTTP through `services/`. Components never call `fetch` directly.
- Every service module exposes typed (JSDoc) functions returning Promises.
- Centralized error handling: a base `apiClient` parses the standard error envelope and throws a typed `ApiError(code, message, details, traceId)`.

### 3.4 Forbidden

- Inline API URLs — use `VITE_API_BASE_URL`.
- `any` / `unknown` types in JSDoc as a shortcut.
- `dangerouslySetInnerHTML` outside of explicitly sanitized renderers.

---

## 4. Tests

See [`test-strategy.md`](test-strategy.md). Key style points:

- One assertion per test ideally; up to three when they verify a single behavior together.
- Use AssertJ for backend: `assertThat(x).isEqualTo(y)`, never `assertEquals`.
- Test names describe the behavior, not the method. `bookingFailsWhenSeatAlreadyLocked` not `testLock`.
- No `Thread.sleep`; use Awaitility.

---

## 5. Git

- Commits: Conventional Commits, lowercase subject, imperative, ≤ 72 chars, no trailing period. Full rules in `github-commit-strategy.md`.
- Branches: hybrid Git Flow per `branching-strategy.md`. `feature/<module>-<desc>`, `hotfix/<issue>`, `release/v*`.
- PR titles mirror the commit style.
- One concern per PR. Reviewers reject "while I was in there" PRs.

---

## 6. Code review etiquette

- Reviewers respond within one working day.
- Tag comments:
  - `[blocking]` — must fix before merge.
  - `[nit]` — style or preference, author can ignore.
  - `[question]` — not blocking, but author should answer.
- Prefer "Suggested change" blocks over prose for small fixes.
- Disagreement: escalate to tech lead within the PR thread, don't re-request review silently.

---

## 7. Tooling

| Tool | Purpose | Wired in |
|---|---|---|
| Spotless / google-java-format | Java formatting | Maven plugin, `mvn spotless:apply` |
| Checkstyle | Java style rules beyond formatting | TBD |
| ESLint | JS lint | `frontend/eslint.config.js` exists; `npm run lint` script to be added |
| Prettier | JS formatting | TBD |
| Dependabot | dependency updates | GitHub config |
| Trivy / OWASP dep-check | CVE scan | CI step |

A pre-commit hook (Husky or pre-commit) runs the formatters locally so PRs don't fail CI on style alone. Setup lives in the README's onboarding section.
