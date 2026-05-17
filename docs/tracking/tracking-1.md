# Tracking Sheet — Iteration 1

> Date: 2026-05-17
> Scope: first working slice of the platform (web auth, browsing, booking, mock payment, tickets, notifications)
> Source of truth: this folder's design docs — `architecture/system-architecture.md`, `api/conventions.md` + `api/openapi.yaml`, `database-setup/schema-definition.md`, `adr/`, `coding-standards.md`, `test-strategy.md`, `nfr-load-test-plan.md`, `security/threat-model.md`, `UI-UX/`.
> Public URL: `http://54.179.11.126/` · Demo login: `demo@dede.test` / `demo1234`

This document compares what was built in iteration 1 against the design as written. "Done" means it is implemented, deployed, and verifiable from the public URL. "Partial" means a working subset exists but the doc's full intent isn't met. "Not done" means nothing was built.

---

## 1. ADRs

| ADR | Title | Status | Notes |
|---|---|---|---|
| [0001](../adr/0001-monolith-spring-boot.md) | Monolithic Spring Boot | ✅ Done | Single `com.odoomaster.ticketing` deployable; layered as specified (`controller/service/repository/domain/dto/security/web/config/exception`). |
| [0002](../adr/0002-optimistic-locking-event-seats.md) | Optimistic locking on EVENT_SEATS | ✅ Done | `EventSeat.version` `@Version`; the `WHERE status='AVAILABLE' AND version=:v` clause is enforced through Hibernate's optimistic lock + the `ORDER_ITEMS.event_seat_id` UNIQUE backstop. |
| [0003](../adr/0003-redis-advisory-cache-only.md) | Redis advisory cache only | ✅ Done | Redis 7 in compose, Spring Cache + Lettuce, three caches: `events:list` (30s), `events:detail` (30s), `events:seats` (5s). Cache evicted on order create/pay. Verified 107ms → 14ms cached. DB remains source of truth for seat status. |
| [0004](../adr/0004-notifications-table-as-queue.md) | NOTIFICATIONS as queue | ⚠️ Partial | `notifications` table + REST inbox is implemented; `TICKETS_ISSUED` auto-created on payment; `WELCOME` + `EVENT_REMINDER` seeded for the demo user. **Missing:** dispatcher worker with `SELECT … FOR UPDATE SKIP LOCKED` draining `PENDING` rows and pushing to Email/SMS/Push. Today everything is created with `status=SENT, channel=IN_APP`. |
| [0005](../adr/0005-flyway-for-migrations.md) | Flyway for migrations | ❌ Not done | Schema is bootstrapped by Hibernate `ddl-auto: update`. No `V*.sql` files; no Flyway plugin in `pom.xml`. Acceptable for iteration 1 but blocks anything resembling production. |
| [0006](../adr/0006-idempotency-key-strategy.md) | Idempotency-Key strategy | ❌ Not done | `Idempotency-Key` header is not parsed; no `IDEMPOTENCY_KEYS` table; no replay-safe caching of responses. Required by `api/conventions.md §2` for `POST /orders`, `/orders/{id}/pay`, `/events/{id}/seats/lock` — currently those endpoints accept replays as fresh requests. |
| [0007](../adr/0007-jwt-authentication.md) | JWT authentication | ✅ Done | HS512 JWT with `app.jwt.secret` (32+ bytes) + bcrypt password hashing; 1440-minute TTL; `JwtAuthenticationFilter` populates `AuthPrincipal`; `@PreAuthorize`-ready RBAC via the `role` claim. Refresh-token flow is not implemented; tokens are silently re-issued on login only. |
| [0008](../adr/0008-mysql-8-as-primary-store.md) | MySQL 8 as primary store | ✅ Done | `mysql:8` in compose, HikariCP pool size 20, UTF-8 + UTC; UNIQUE constraints on `ORDER_ITEMS.event_seat_id`, `TICKETS.qr_code`, and `(event_id, section, row_label, seat_number)` per design. |
| [0009](../adr/0009-offline-first-mobile-checkin.md) | Offline-first mobile check-in | ❌ Not done | No mobile app, no scanner, no `CHECK_INS` table. Web-only iteration. |
| [0010](../adr/0010-single-instance-sweeper.md) | Single-instance seat-lock sweeper | ❌ Not done | No scheduled sweeper job; `EVENT_SEATS.locked_until` is checked lazily in `OrderService.create` (lock-expired seats can be re-acquired by the next caller). This is enough functionally for low concurrency but breaks the design's golden-hour guarantees. |

---

## 2. Architecture invariants (`architecture/system-architecture.md §7`)

| # | Invariant | Status |
|---|---|---|
| 1 | DB is source of truth for seat status | ✅ — Redis only caches event/seat read responses; writes go straight to MySQL with the version check. |
| 2 | One transaction per logical unit of work | ✅ — `@Transactional` on `OrderService.create` and `OrderService.pay`; seat update + order/items rows + payment + tickets commit together. |
| 3 | Sweeper runs in exactly one instance, no sweep code in API request handlers | ❌ — sweeper not implemented (see ADR-0010). |
| 4 | `ORDER_ITEMS.event_seat_id` UNIQUE stays | ✅ — `@UniqueConstraint(name="uk_order_items_seat", columnNames="event_seat_id")` on `OrderItem`. |
| 5 | `TICKETS.qr_code` UNIQUE stays | ✅ — `@UniqueConstraint(name="uk_tickets_qr", columnNames="qr_code")` on `Ticket`. |
| 6 | Idempotency-Key honored on every state-changing POST | ❌ — header is ignored (see ADR-0006). |
| 7 | All external calls have timeouts | ⚠️ — no real external calls yet; payments are mocked. When real MoMo/VNPay integrations land, the `WebClient` config from `coding-standards.md §1.10` must be enforced. |

---

## 3. API surface

| Endpoint | Method | Status |
|---|---|---|
| `/v1/health` | GET | ✅ |
| `/v1/auth/register` | POST | ✅ |
| `/v1/auth/login` | POST | ✅ |
| `/v1/users/me` | GET/PUT | ✅ |
| `/v1/events` | GET | ✅ (cached 30s) |
| `/v1/events/{id}` | GET | ✅ (cached 30s) |
| `/v1/events/{id}/seats` | GET | ✅ (cached 5s) |
| `/v1/orders` | GET/POST | ✅ |
| `/v1/orders/{id}` | GET | ✅ |
| `/v1/orders/{id}/pay` | POST | ✅ (mock; auto-success) |
| `/v1/tickets` | GET | ✅ |
| `/v1/tickets/{id}` | GET | ✅ |
| `/v1/notifications` | GET (with `?type=`) | ✅ |
| `/v1/notifications/unread-count` | GET | ✅ |
| `/v1/notifications/{id}/read` | POST | ✅ |
| `/v1/notifications/read-all` | POST | ✅ |
| Refresh token | POST | ❌ not implemented |
| Admin/organizer event CRUD | — | ❌ not implemented |
| Check-in / scan | POST | ❌ not implemented |
| Refund / cancellation | POST | ❌ not implemented |

### Cross-cutting (`api/conventions.md`)

| Concern | Status |
|---|---|
| Base path `/v1` | ✅ |
| JSON `camelCase` keys, DB `snake_case` | ✅ |
| ISO-8601 timestamps with timezone | ✅ (Jackson default + JavaTimeModule) |
| Money as integer minor units (VND, integer) | ✅ |
| `X-Request-Id` echoed + propagated to logs and error envelope | ✅ via `TraceIdFilter` + MDC |
| Error envelope `{error:{code,message,details,traceId}}` | ✅ via `GlobalExceptionHandler` |
| `Idempotency-Key` on state-changing POSTs | ❌ |
| Standard pagination | ❌ list endpoints return full collections |
| Rate-limit headers (`X-RateLimit-*`) | ❌ |
| Versioning policy enforced (no breaking on `/v1`) | ✅ by convention |

---

## 4. Database schema (`database-setup/schema-definition.md`)

| Designed table | Implemented as | Status |
|---|---|---|
| `USERS` | `users` | ✅ minus separate `password_hash` rotation tracking |
| `ROLES`, `USER_ROLES` | flattened to `users.role` string column | ⚠️ simplified — no many-to-many; OK for two roles (USER, ADMIN). |
| `EVENT_CATEGORIES`, `EVENT_CATEGORY_MAP` | flattened to `events.category` string column | ⚠️ simplified — fine for the 6 fixed categories used in seeding; loses ability to associate one event with multiple categories. |
| `EVENTS` | `events` | ✅ — added `category`, `organizer`, `image_url`. |
| `VENUES`, `SECTIONS`, `SEATS` | flattened into `event_seats.section` + `row_label` + `seat_number` per event | ⚠️ denormalized — works for the seeder but blocks reuse of seat data across events at one venue. |
| `EVENT_SEATS` | `event_seats` | ✅ with `@Version` optimistic locking column. |
| `TICKET_TYPES` | merged into per-seat price column | ⚠️ no separate TICKET_TYPES table; tier name is the section name. |
| `ORDERS` | `orders` | ✅ — `event_id` denormalized for easier lookup. |
| `ORDER_ITEMS` | `order_items` | ✅ — UNIQUE `event_seat_id`. |
| `PAYMENTS` | `payments` | ✅ — single row per order; `retry_count` not stored. |
| `PAYMENT_RETRIES` | — | ❌ not implemented. |
| `TICKETS` | `tickets` | ✅ — UNIQUE `qr_code`, indexed by `user_id`, `order_item_id`. |
| `CHECK_INS` | — | ❌ not implemented. |
| `NOTIFICATIONS` | `notifications` | ✅ — added `channel`, `link_url`, `read_at`. |
| `AUDIT_LOGS` | — | ❌ not implemented. |

Hibernate `ddl-auto: update` writes the schema on first boot. Flyway migrations (ADR-0005) still owe the project a hand-written set of `V*__init.sql` files before any production cutover.

---

## 5. UI/UX (`UI-UX/*.svg`)

| Mockup | Page in app | Status |
|---|---|---|
| `home.svg` | `/` | ✅ — green hero with featured event, 6 category cards, "Sắp diễn ra" grid. |
| `events.svg` | `/events` | ✅ — search bar, scrollable category chips, "chỉ còn vé" toggle, responsive 1–4 col grid. **Skipped:** date-range and city dropdowns; pagination (returns all events). |
| `event-details.svg` | `/events/{id}` | ✅ — hero, organizer line, full description, step indicator, seat selection inline. |
| `seat-selection.svg` | shares `/events/{id}` | ✅ — sections, rows, color-coded legend (Trống/Đang chọn/Đang giữ/Đã bán), stage label. **Visual-only:** the 10-minute hold timer chip is not displayed on the page. |
| `checkout.svg` | `/checkout/{orderId}` | ✅ — order summary + 3 payment methods (MoMo / VNPay / Mock); mock auto-success. **Skipped:** invoice request, voucher input. |
| `login.svg` | `/login` | ✅ |
| `register.svg` | `/register` | ✅ |
| `profile.svg` | `/profile` | ✅ — avatar with initials, role badge, name/phone edit. **Skipped:** sidebar with order history, address book, security/2FA panels. |
| `my-tickets.svg` | `/tickets` | ✅ — status tabs (Tất cả / Còn hiệu lực / Đã sử dụng / Đã hủy), big date column + QR; `/tickets/{id}` shows full QR + event detail. **Skipped:** "Tải vé PDF", "Chuyển nhượng", "Xem hóa đơn" buttons. |
| `notifications-inbox.svg` | `/notifications` | ✅ — left filter rail (desktop) → horizontal chips (mobile); grouped by HÔM NAY / HÔM QUA / TUẦN NÀY / CŨ HƠN; click marks read; "Đánh dấu đã đọc tất cả" works. **Skipped:** "Cài đặt kênh nhận" settings panel. |
| `admin-event-editor.svg` | — | ❌ not built (no admin UI). |
| `admin-venue-editor.svg` | — | ❌ not built. |
| `analytics-dashboard.svg` | — | ❌ not built. |
| `staff-scanner.svg` | — | ❌ not built (no mobile module). |

### Responsive (per design language)

Viewport breakpoints exercised:
- iPhone SE 2020 (375 px), iPhone 12/13/14 (390 px), iPhone XR (414 px), Pixel (412 px): mobile base styles
- Tablets (≥ 640 px): `sm:` styles
- Desktop (≥ 768 / 1024 / 1280 px): `md:` / `lg:` / `xl:` styles
- Mobile-specific affordances: hamburger drawer, sticky bottom checkout bar on event detail, horizontally-scrollable chip/tab rows, smaller seat buttons, stacked footer.

---

## 6. Coding standards (`coding-standards.md`)

| Rule | Status |
|---|---|
| Java 21 + Spring Boot 3.2 | ✅ |
| Package layout matches §1.1 (`config`, `controller`, `service`, `repository`, `domain`, `dto`, `security`, `web`, `exception`) | ✅ |
| Controller → service only; service owns `@Transactional`; repository never returns DTOs | ✅ |
| DTOs as Java `record`s with Jakarta Bean Validation | ✅ |
| Constructor injection only; no `@Autowired` fields | ✅ |
| `@Slf4j` everywhere; no `System.out` / `printStackTrace` | ✅ |
| One project-wide `AppException(code, message, status)` hierarchy → `GlobalExceptionHandler` → standard envelope | ✅ |
| MDC `traceId` per request | ✅ |
| Validation errors → `400 VALIDATION_FAILED` with per-field `details` | ✅ |
| Spotless / google-java-format wired into Maven plugin (§7) | ❌ not configured |
| MapStruct mappers (§1.2) | ❌ — mapping is currently inline in services; small enough that it isn't a bottleneck. |
| Frontend conventions §3 (services layer, Tailwind tokens, no inline API URLs) | ✅ |

---

## 7. Tests (`test-strategy.md`)

| Layer | Status |
|---|---|
| Unit tests (services with mocks) | ❌ |
| MockMvc controller tests | ❌ |
| Integration tests with Testcontainers MySQL + Redis | ❌ |
| Frontend component tests (Vitest / RTL) | ❌ |
| E2E (Playwright/Cypress) | ❌ |

Only manual API smoke tests and curl QA have been executed against the public URL. The full E2E happy-path (register → login → seat-pick → mock-pay → ticket QR) and key error envelopes (`SEAT_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`) have been verified.

---

## 8. Non-functional (`nfr-load-test-plan.md`)

The plan in the docs targets 10 000 concurrent users + 50 000 tickets per event with p95 < 2 s. **Nothing has been load-tested yet.** No k6 / Gatling / JMeter script is in the repo; no soak test, no capacity profile. The cache + optimistic locking primitives are in place but un-measured.

---

## 9. Security (`security/threat-model.md`)

| Control | Status |
|---|---|
| TLS / HTTPS termination | ❌ — HTTP only on EC2 |
| JWT auth on all non-public endpoints, public allow-list explicit | ✅ |
| BCrypt password hashing | ✅ |
| CORS configured (currently `allowedOriginPatterns: *`) | ⚠️ — tighten to known origins once HTTPS is in place. |
| Rate limiting (Redis token bucket per design-supplement §5) | ❌ |
| HMAC challenge gate at edge | ❌ |
| Input validation on every DTO | ✅ |
| Secrets sourced from env (`APP_JWT_SECRET` enforced ≥ 32 bytes) | ✅ |
| Audit logging for state-changing actions | ❌ (no `AUDIT_LOGS` table written to) |
| Logging masks for PII (email/phone) | ⚠️ — not actively masked. |
| Dependency CVE scan (Trivy / OWASP dep-check) | ❌ |
| Threat-model mitigations: bot purchase, replay, QR duplication, oversell | ⚠️ — QR uniqueness ✓; oversell prevented by DB UNIQUE; bot/replay protections not in place. |

---

## 10. Operations

| Item | Status |
|---|---|
| Docker Compose with `mysql`, `redis`, `backend`, `frontend` + healthchecks | ✅ |
| Multi-stage Dockerfiles (Maven→JRE, Node→nginx) | ✅ |
| nginx reverse proxy on the frontend container forwards `/v1/*` to backend; SPA fallback configured | ✅ |
| Deployment on AWS EC2 (`my-ec2`, `ap-southeast-1`) | ✅ |
| Public URL reachable on port 80 (HTTP) | ✅ after the user opened the SG rule |
| HTTPS (port 443) | ❌ |
| Backups, log shipping, metrics dashboards | ❌ |
| CI/CD (GitHub Actions, Dependabot) | ❌ |

---

## 11. Definition of Done (`definition-of-done.md`)

Per-PR DoD is **not yet enforceable** — the only PR-time gates that exist today are formatting consistency by author discipline. The repo lacks:
- pre-commit hooks (Husky / pre-commit framework)
- CI checks (Spotless, ESLint, tests, build)
- branch protection on `main`

Most DoD bullets in the doc require those to be present.

---

## 12. What is genuinely shippable today

A demo user can:
1. Open `http://54.179.11.126/` on phone or desktop.
2. Browse 60 published events across 6 categories with cache-backed listings.
3. Register, log in, or sign in as `demo@dede.test`.
4. Pick a seat on an interactive seat map.
5. Reserve the seat (lock for 10 min with version-based concurrency), proceed to a mock payment.
6. Receive a unique-QR ticket, view it via `/tickets/{id}`, see a fresh `TICKETS_ISSUED` notification with unread badge in the nav bell.
7. Re-attempts on the same seat get `409 SEAT_TAKEN` with a proper error envelope including `traceId`.

Concurrency, durability, observability, payments, mobile staff app, admin tooling, and the full normalized schema all still remain — see the "❌" rows above. Iteration 2 should pick from the ADRs that are still `❌` and the NFR plan.

---

## 13. Iteration-2 candidates (ranked by impact / effort)

1. **Flyway baseline** (ADR-0005) — write `V1__init.sql` capturing what `ddl-auto: update` produced; flip prod profile to `ddl-auto: validate`. ~½ day.
2. **Idempotency-Key filter + table** (ADR-0006) — required for safe retry of order/pay. ~1 day.
3. **Single-instance seat-lock sweeper** (ADR-0010) — `@Scheduled` job with DB advisory lock releasing expired `LOCKED` rows. ~1 day.
4. **Real notification dispatcher** (ADR-0004) — `@Scheduled` worker drains `status=PENDING` rows via `SELECT … FOR UPDATE SKIP LOCKED`; pluggable Email/SMS senders. ~1.5 days.
5. **Rate-limit token bucket** in Redis + per-route quotas. ~1 day.
6. **JUnit + MockMvc + Testcontainers** scaffolding and ten critical-path tests. ~2 days.
7. **TLS / ACM cert + ALB** in front of the EC2. ~½ day.
8. **k6 smoke** of the booking path to establish baseline against NFR §2.4. ~1 day.
9. **Admin events CRUD** + organizer dashboard skeleton. ~2 days.
10. **Mobile staff scanner** (`CHECK_INS`, offline sync per ADR-0009). ~3+ days.
