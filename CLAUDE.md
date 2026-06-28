# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

\*\*Note [> [!IMPORTANT] >
Every changes while coding prgoress need tracking and updating to document folder @docs/]

## Overview

Online event management & ticketing system ("Dề Dê"). A Spring Boot 3.2 / Java 21 monolithic backend (`backend/`) and a React + Vite + Tailwind frontend (`frontend/`), backed by MySQL 8 and Redis 7. Core domain: events, venues/seats, orders, payments (mock gateway with retry), QR tickets, gate check-in, feedback, notifications, and admin analytics. Design pressure throughout is high-concurrency ticket sales ("Golden Hour"): preventing double-booking, duplicate QR codes, and overload.

## Commands

All commands assume you are in the named directory. Copy `.env.example` → `.env` at the repo root before running Docker.

### Full stack (Docker, from repo root)

```bash
docker compose -f docker-compose.dev.yml up --build    # mysql + backend (hot reload) + frontend (vite)
docker compose -f docker-compose.prod.yml up --build   # adds Redis; nginx-served frontend; prod profiles
```

Dev URLs: frontend `http://localhost:5173`, backend `http://localhost:8080`.

### Backend (`backend/`)

```bash
mvn clean package                       # build fat jar (target/ticketing.jar); runs tests
mvn test                                # run all tests
mvn test -Dtest=OrderServiceReliabilityTest          # single test class
mvn test -Dtest=ReliabilityMatrixTest#methodName     # single test method
docker compose -f docker-compose.dev.yml up          # backend-only dev with MySQL + hot reload
```

Before running locally outside Docker, create the profile config files (see `backend/src/main/resources/README.md`):

```bash
cp backend/src/main/resources/application-dev-example.yml  backend/src/main/resources/application-dev.yml
cp backend/src/main/resources/application-prod-example.yml backend/src/main/resources/application-prod.yml
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev          # vite dev server on :5173
npm test             # vitest run (all tests)
npm run test:watch   # vitest watch mode
npx vitest run src/utils/format.test.js   # single test file
npm run build        # production build
```

## Architecture

### Backend layering

Classic Spring layered monolith under `com.odoomaster.ticketing` (note: package is `odoomaster`, not `dede`/`ticketing` despite some README text):
`controller → service → repository (Spring Data JPA) → MySQL`. DTOs (`dto/`, grouped as `*Dtos.java` record containers) cross the controller boundary; domain entities (`domain/`) never leave the service layer.

### Request lifecycle & cross-cutting concerns

- **Auth**: stateless JWT. `JwtAuthenticationFilter` (in `security/`) validates the `Authorization: Bearer` token and populates the security context; `JwtService` issues/verifies tokens (HS, secret from `APP_JWT_SECRET`, ≥32 chars). Controllers read the caller via `@CurrentUser AuthPrincipal`.
- **Authorization**: `SecurityConfig` defines route rules. Public: `/v1/auth/**`, `/v1/health`, `GET /v1/events/**`. `/v1/admin/**` requires role `ADMIN` or `ORGANIZER`. Everything else requires authentication. Roles are a many-to-many join (`roles`/`user_roles`), seeded as Spring authorities `ROLE_*`. `@EnableMethodSecurity` is on, so `@PreAuthorize` is also available.
- **All API routes are under `/v1`** (no `/api` prefix despite older README tables).
- **Error handling**: `GlobalExceptionHandler` + `ApiErrorEnvelope` produce a uniform JSON shape `{ "error": { code, message, details, traceId } }`. Throw `AppException` (in `exception/`) for domain errors. The frontend `apiClient.js` parses this envelope into an `ApiError`.
- **Tracing**: `TraceIdFilter` assigns a request id (exposed as `X-Request-Id`, logged via MDC `traceId`).
- **Audit**: `@Auditable(action, entity)` on a service method + `AuditAspect` (AOP) writes an `audit_logs` row.

### Concurrency model (the crux of the system)

Seat inventory lives in `event_seats` with a status + lock fields (`locked_by`, `locked_until`). `OrderService` holds seats with a **10-minute DB-level lock** (`LOCK_TTL_MINUTES`) when an order is created, inside a `@Transactional` boundary. `SeatLockSweeperJob` runs every 30s (`@Scheduled`) to release expired locks and evict the affected events from the seat cache. Treat any change to ordering, seat status transitions, or lock TTLs as concurrency-critical — preserve the transactional + cache-eviction guarantees.

### Caching (Redis)

`CacheConfig` defines three Spring caches with short TTLs: `events:list` (30s), `events:detail` (30s), `events:seats` (5s). Services use `@Cacheable` to read and `@CacheEvict`/`@Caching` to invalidate on writes (e.g. `OrderService` evicts all three on order creation). Redis is also intended for rate-limiting and idempotency entries (written with TTLs; prod Redis uses `volatile-lru` eviction). Redis runs in the prod compose; the dev compose does not start it, so dev runs without distributed caching unless you add it.

### Database & migrations

**Flyway** owns the schema — migrations in `backend/src/main/resources/db/migration/` named `V<yyyyMMdd>_<HHmmss>__desc.sql`. Add a new versioned migration for any schema change; never edit an applied one. Prod runs `ddl-auto: validate` (Hibernate must match the migrated schema exactly), dev runs `ddl-auto: update`. `DataSeeder` (CommandLineRunner) seeds demo events and a default admin user `admin@dede.test` / `admin1234`.

### Frontend structure

React Router SPA. `services/apiClient.js` is the single axios instance: it injects the bearer token from `localStorage`, resolves the base URL from `window.__APP_CONFIG__.apiBaseUrl` (runtime) or `VITE_API_BASE_URL`, and unwraps the backend error envelope. `services/api.js` holds the typed call functions — UI/pages call those, never axios directly. Auth state lives in `store/AuthContext.jsx`; `components/RequireAuth.jsx` and `RequireRole.jsx` gate routes. Pages split into customer (`pages/`) and admin (`pages/admin/`).

## Conventions

- **API contract is the error envelope** — backend returns `{ error: { code, message, details, traceId } }` on failure; keep both sides in sync when adding error codes.
- Config files containing real secrets (`application-dev.yml`, `application-prod.yml`, `.env`) are gitignored — only the `*-example` / `.env.example` templates are committed.
- Frontend never hardcodes the API URL; always go through `VITE_API_BASE_URL` / the runtime config.
- Backend uses Lombok (annotation processing configured in `pom.xml`).

### Replacing Commands

#### Files

```bash
rtk ls .                        # Token-optimized directory tree
rtk read file.rs                # Smart file reading
rtk read file.rs -l aggressive  # Signatures only (strips bodies)
rtk smart file.rs               # 2-line heuristic code summary
rtk find "*.rs" .               # Compact find results
rtk grep "pattern" .            # Grouped search results
rtk diff file1 file2            # Condensed diff (exit 1 if files differ)
```

#### Git

```bash
rtk git status                  # Compact status
rtk git log -n 10               # One-line commits
rtk git diff                    # Condensed diff
rtk git add                     # -> "ok"
rtk git commit -m "msg"         # -> "ok abc1234"
rtk git push                    # -> "ok main"
rtk git pull                    # -> "ok 3 files +10 -2"
```

#### GitHub CLI

```bash
rtk gh pr list                  # Compact PR listing
rtk gh pr view 42               # PR details + checks
rtk gh issue list               # Compact issue listing
rtk gh run list                 # Workflow run status
```

#### Test Runners

```bash
rtk jest                        # Jest compact (failures only)
rtk vitest                      # Vitest compact (failures only)
rtk playwright test             # E2E results (failures only)
rtk pytest                      # Python tests (-90%)
rtk go test                     # Go tests (NDJSON, -90%)
rtk cargo test                  # Cargo tests (-90%)
rtk rake test                   # Ruby minitest (-90%)
rtk rspec                       # RSpec tests (JSON, -60%+)
rtk err <cmd>                   # Filter errors only from any command
rtk test <cmd>                  # Generic test wrapper - failures only (-90%)
```

#### Build & Lint

```bash
rtk lint                        # ESLint grouped by rule/file
rtk lint biome                  # Supports other linters
rtk tsc                         # TypeScript errors grouped by file
rtk next build                  # Next.js build compact
rtk prettier --check .          # Files needing formatting
rtk cargo build                 # Cargo build (-80%)
rtk cargo clippy                # Cargo clippy (-80%)
rtk ruff check                  # Python linting (JSON, -80%)
rtk golangci-lint run           # Go linting (JSON, -85%)
rtk rubocop                     # Ruby linting (JSON, -60%+)
```

#### Package Managers

```bash
rtk pnpm list                   # Compact dependency tree
rtk pip list                    # Python packages (auto-detect uv)
rtk pip outdated                # Outdated packages
rtk bundle install              # Ruby gems (strip Using lines)
rtk prisma generate             # Schema generation (no ASCII art)
```

#### AWS

```bash
rtk aws sts get-caller-identity # One-line identity
rtk aws ec2 describe-instances  # Compact instance list
rtk aws lambda list-functions   # Name/runtime/memory (strips secrets)
rtk aws logs get-log-events     # Timestamped messages only
rtk aws cloudformation describe-stack-events  # Failures first
rtk aws dynamodb scan           # Unwraps type annotations
rtk aws iam list-roles          # Strips policy documents
rtk aws s3 ls                   # Truncated with tee recovery
```

#### Containers

```bash
rtk docker ps                   # Compact container list
rtk docker images               # Compact image list
rtk docker logs <container>     # Deduplicated logs
rtk docker compose ps           # Compose services
rtk kubectl pods                # Compact pod list
rtk kubectl logs <pod>          # Deduplicated logs
rtk kubectl services            # Compact service list
rtk oc get pods                 # OpenShift pod summary
rtk oc get services             # OpenShift service list
rtk oc logs <pod>               # Deduplicated logs
```

#### Infrastructure as Code

```bash
rtk pulumi preview              # Strip header/URL/duration noise
rtk pulumi up                   # Compact apply output
rtk pulumi destroy              # Compact destroy output
rtk pulumi refresh              # Drift summary
rtk pulumi stack                # Stack metadata (strips owner/timestamps)
```

#### Data & Analytics

```bash
rtk json config.json            # Structure without values
rtk deps                        # Dependencies summary
rtk env -f AWS                  # Filtered env vars
rtk log app.log                 # Deduplicated logs
rtk curl <url>                  # Truncate + save full output
rtk wget <url>                  # Download, strip progress bars
rtk summary <long command>      # Heuristic summary
rtk proxy <command>             # Raw passthrough + tracking
```

```bash
rtk mvn *
```

If you need to run the docker command but it fails. You should run the command to start colima

```bash
colima start
```

And when stop the docker you should stop colima list-roles

```bash
colima stop
```
