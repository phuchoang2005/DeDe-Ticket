# Tracking Sheet — Iteration 3

> Date: 2026-05-19
> Scope: seat-hold live tracking + sweeper, user feedback submission, admin feedback report, checkout cancel-on-exit, automated unit tests, production deployment switch to port 80
> Source of truth: same docs as iterations 1–2 (`architecture/system-architecture.md`, `api/conventions.md`, `api/openapi.yaml`, `database-setup/schema-definition.md`, `adr/`, `coding-standards.md`).
> Public URL: `http://ec2-13-250-21-208.ap-southeast-1.compute.amazonaws.com/` · Demo logins (chip-pickable on `/login`):
> - `demo@dede.test / demo1234` — Người dùng
> - `organizer@dede.test / org12345` — Ban tổ chức
> - `admin@dede.test / admin1234` — Quản trị viên
> Baseline: see [`tracking-2.md`](./tracking-2.md). This sheet only covers deltas since that document.

---

## 1. What this iteration delivered

### 1.1 Seat-lock sweeper (was ❌ in tracking-2 §3 candidate #4 / ADR-0010)

| Component | Detail | Status |
|---|---|---|
| `SeatLockSweeperJob` | `@Scheduled(fixedDelay = 30_000)` — every 30 s queries `EVENT_SEATS WHERE status='LOCKED' AND locked_until < now`, resets them to AVAILABLE (clears `locked_by`, `locked_until`), calls `seats.saveAll()`, then evicts the Redis `events:seats` cache per affected event. | ✅ Done |
| `@EnableScheduling` | Added to `Application.java` | ✅ Done |
| `EventSeatRepository.findExpiredLocks(Instant now)` | New JPQL query backing the sweeper | ✅ Done |
| `SeatItem` DTO `lockedUntil` field | `EventDtos.SeatItem` record now includes `Instant lockedUntil`; `EventService.seats()` maps it from the entity | ✅ Done |

**ADR-0010 status:** ✅ Sweeper implemented. DB advisory lock for multi-instance safety (per ADR-0010 spec) is **not yet wired** — `fixedDelay` is sufficient for single-instance Docker deployment; revisit before horizontal scaling.

### 1.2 Seat countdown UI (was ⚠️ visual-only in tracking-1 §5 `seat-selection.svg`)

| Capability | Detail | Status |
|---|---|---|
| Live countdown on LOCKED seats | Each LOCKED seat button shows remaining time (`8p`, `42s`) derived from `lockedUntil`; updated every second via `setInterval(1 000)`. | ✅ Done |
| Auto-poll seat map | `EventDetailPage` polls `GET /v1/events/{id}/seats` every 20 s; seats that became unavailable while selected are auto-deselected. | ✅ Done |
| Tooltip | Hover shows "Đang giữ, còn Xp" for LOCKED seats. | ✅ Done |

### 1.3 User feedback submission (new feature)

| Component | Detail | Status |
|---|---|---|
| `Feedback` domain entity | Fields: `userId`, `eventId` (nullable), `category` (GENERAL / EVENT / PAYMENT / BUG_REPORT / SUGGESTION), `subject`, `body`, `rating` (1–5, nullable), `status` (NEW / READ / RESOLVED), `adminNote`, `resolvedAt`, `createdAt`. | ✅ Done |
| `POST /v1/feedback` | Authenticated users only. Validates category, subject, body, rating range. Returns 201 + `Location` header. | ✅ Done |
| `FeedbackPage` `/feedback` | Category picker, subject input, body textarea, 1–5 star rating selector, success confirmation screen. | ✅ Done |
| Feedback nav button | All logged-in users see a pill-styled "Phản hồi" button (brand-50 bg, brand-700 text) in the desktop header and mobile drawer — distinct from plain text nav links. | ✅ Done |

### 1.4 Admin feedback report (new feature)

| Component | Detail | Status |
|---|---|---|
| `GET /v1/admin/feedback` | Paginated (page/limit), filterable by `status` and `category`. Returns `FeedbackPage` with `PageMeta`. ADMIN/ORGANIZER only. | ✅ Done |
| `GET /v1/admin/feedback/summary` | Returns `FeedbackSummary`: total count, new/read/resolved counts, average rating (null if no ratings). | ✅ Done |
| `PATCH /v1/admin/feedback/{id}/status` | Update status + optional `adminNote`; sets `resolvedAt` when transitioning to RESOLVED. | ✅ Done |
| `AdminFeedbackReportPage` `/admin/feedback` | 4 KPI cards (total, unread, resolved, avg rating), filterable table by status/category, pagination chips, slide-in detail panel with inline status update. Auto-marks feedback READ when admin opens it. | ✅ Done |
| Nav link | "Phản hồi KH" nav item added for ADMIN / ORGANIZER in desktop nav and mobile drawer. | ✅ Done |

### 1.5 Checkout cancel-on-exit + seat release (bug fix)

**Bug:** `OrderService.create()` locked seats for 10 min. If the user navigated away from `CheckoutPage` without paying, those seats stayed LOCKED until the sweeper TTL — blocking other buyers.

| Fix | Detail | Status |
|---|---|---|
| `OrderService.cancel(userId, orderId)` | Resets LOCKED seats to AVAILABLE, deletes `ORDER_ITEMS` rows (prevents `uk_order_items_seat` violation on re-book), marks order CANCELLED. Guards: no-op if already CANCELLED; throws `ORDER_ALREADY_PAID` if PAID. | ✅ Done |
| `DELETE /v1/orders/{id}` | Controller endpoint delegating to `cancel()`. Returns 204 No Content. | ✅ Done |
| `CheckoutPage` unmount cleanup | `useEffect` cleanup fires when user navigates away (SPA back-nav, link click, etc.); if `paidRef.current` is false, calls `orderApi.cancel(id)`. `paidRef` is set to true immediately before `navigate('/tickets')` so successful payment does not trigger cancel. | ✅ Done |
| `orderApi.cancel(id)` | `DELETE /v1/orders/{id}` added to frontend service. | ✅ Done |

**Residual:** Browser hard-close / tab kill will not fire the cleanup; those seats are released by the sweeper after the 10-min TTL. Acceptable for current scale.

**Secondary bug fixed:** First version of `cancel()` omitted `orderItems.deleteAll(items)`, causing `Duplicate entry for key 'order_items.uk_order_items_seat'` on re-booking. Fixed in the same iteration.

### 1.6 Automated unit tests (was ❌ in tracking-2 §3 candidate #8)

25 Mockito unit tests, run in `maven:3.9.6-eclipse-temurin-21` Docker container on EC2:

| Class | Tests | Covers |
|---|---|---|
| `SeatLockSweeperJobTest` | 4 | No-op on empty list; reset to AVAILABLE + clear fields; cache evicted once per distinct event; null cache manager safe |
| `FeedbackServiceTest` | 14 | submit happy path, blank subject/body, invalid rating, unknown/null category; list normalises filter strings; updateStatus sets resolvedAt only on RESOLVED, throws on bad status/id; summary aggregates + null avgRating |
| `FeedbackControllerSmokeTest` | 7 | submit → 201 + Location, AppException propagation; adminList default + with filters; adminSummary KPIs; adminUpdateStatus + not-found propagation |
| **Total** | **25** | **BUILD SUCCESS** |

**Still missing** from `test-strategy.md`: Testcontainers integration tests, MockMvc slice tests, Vitest frontend tests, Playwright E2E.

### 1.7 Production deployment switch

| Item | Detail | Status |
|---|---|---|
| Switched from `docker-compose.dev.yml` to `docker-compose.yml` | Prod compose uses multi-stage Maven→JRE build (no hot-reload); nginx serves frontend on port 80; backend `expose: 8080` only (not host-bound). | ✅ Done |
| Port 80 | `FRONTEND_PORT=80` already set in `.env`; prod compose maps `80:80`; nginx config proxies `/v1/*` to `backend:8080`. Site accessible on standard HTTP port. | ✅ Done |
| All new features in the prod image | Sweeper, feedback, cancel endpoint, countdown UI all compiled and running. | ✅ Done |

---

## 2. Tracking-2's "Iteration-3 candidates" — status check

From `tracking-2.md §12`:

| # | Candidate | Status this iteration |
|---|---|---|
| 1 | Reconcile OpenAPI spec (admin endpoints + paged `/v1/events`) | ❌ Still not reconciled. New endpoints (feedback, cancel) also undocumented in spec. |
| 2 | Flyway baseline (ADR-0005) | ❌ Still on `ddl-auto: update`. `FEEDBACKS` table was added this iteration via Hibernate auto-DDL. |
| 3 | Idempotency-Key (ADR-0006) | ❌ Still not implemented. |
| 4 | Single-instance sweeper (ADR-0010) | ✅ **Done** (this iteration, §1.1). No DB advisory lock yet. |
| 5 | Real notification dispatcher (ADR-0004) | ❌ Still `status=SENT, channel=IN_APP`; no worker. |
| 6 | Cursor pagination | ❌ Still offset/limit. |
| 7 | Rate-limit token bucket | ❌ Not implemented. |
| 8 | JUnit + MockMvc + Testcontainers | ⚠️ **Partial** — 25 Mockito unit tests added (§1.6). No Testcontainers/MockMvc slice tests. |
| 9 | Audit logging | ❌ No `AUDIT_LOGS` table. |
| 10 | TLS / ACM + ALB | ❌ Still HTTP only. |
| 11 | k6 booking-path smoke | ❌ Not run. |
| 12 | Mobile staff scanner (ADR-0009) | ❌ Not implemented. |
| 13 | Resource-level RBAC | ❌ Any ADMIN/ORGANIZER can edit any event. |
| 14 | CSV import / copy venue structure | ❌ Deferred. |

---

## 3. Architecture invariants — re-check

Changes vs tracking-2:

| # | Invariant | Status |
|---|---|---|
| 1 | DB is source of truth for seat status | ✅ |
| 2 | One transaction per logical unit of work | ✅ — `cancel()` resets seats + deletes order items + marks order CANCELLED in one `@Transactional` method. |
| 3 | Sweeper runs in exactly one instance | ⚠️ — Sweeper now **exists** (`@Scheduled` every 30 s). DB advisory lock from ADR-0010 not yet wired; safe for single Docker instance. |
| 4 | `ORDER_ITEMS.event_seat_id` UNIQUE stays | ✅ — actively tested: `cancel()` deletes order items before releasing seats so the constraint is never violated on re-book. |
| 5 | `TICKETS.qr_code` UNIQUE stays | ✅ |
| 6 | Idempotency-Key honored | ❌ (unchanged) |
| 7 | All external calls have timeouts | ⚠️ (still no real external calls) |
| 8 | No business logic in controllers | ✅ — `FeedbackController` and `AdminFeedbackController` are thin; all guards in `FeedbackService`. |

---

## 4. API surface — deltas

New since tracking-2:

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/orders/{id}` | DELETE | Cancel PENDING order, release seat locks, delete order items |
| `/v1/feedback` | POST | Authenticated user submits feedback |
| `/v1/admin/feedback` | GET | Paginated, filterable feedback list (ADMIN/ORGANIZER) |
| `/v1/admin/feedback/summary` | GET | KPI counts + average rating |
| `/v1/admin/feedback/{id}/status` | PATCH | Update status + optional admin note |

Still ❌ from tracking-2:
- Refresh-token endpoint
- Check-in / scan endpoints
- Idempotency-Key behaviour
- Rate-limit response headers
- Cursor pagination on listing endpoints

### 4.1 OpenAPI spec drift (additive to tracking-2 §5.1)

Admin endpoints (`/v1/admin/events/*`, `/v1/admin/analytics`) were already undocumented. This iteration adds five more undocumented endpoints (cancel order, feedback CRUD). All new behaviour is described in this tracking sheet and in code. Reconciling `docs/api/openapi.yaml` is now more urgent.

---

## 5. Database schema — deltas

One new table added via `ddl-auto: update`:

| Table | Columns | Notes |
|---|---|---|
| `feedbacks` | `id`, `user_id`, `event_id`, `category`, `subject`, `body`, `rating`, `status`, `created_at`, `resolved_at`, `admin_note` | Indexes on `user_id`, `status`, `created_at`. No FK constraints at DB level (raw Long FKs, consistent with existing pattern). |

No other schema changes. `ORDER_ITEMS` and `EVENT_SEATS` tables unchanged; the cancel fix is a service-layer change only.

---

## 6. UI/UX inventory — deltas

| Mockup / capability | Status this iteration |
|---|---|
| `seat-selection.svg` hold timer chip | ✅ **Done** — per-seat countdown (e.g. "8p", "42s") now shown directly on LOCKED seat buttons, updating every second. Was ⚠️ visual-only in tracking-1. |
| Feedback submission page `/feedback` | ✅ **New** — no mockup existed; designed and implemented fresh. |
| Admin feedback report `/admin/feedback` | ✅ **New** — no mockup existed; KPI cards + table + detail panel. |
| Feedback nav pill button | ✅ **New** — pill-styled button (brand-50 bg) distinguishable from plain nav links. |
| `staff-scanner.svg` | ❌ Still not built. |

---

## 7. Tests — deltas

| Layer | Was (tracking-2) | Now |
|---|---|---|
| Unit tests (services / jobs with mocks) | ❌ | ✅ 18 tests (FeedbackServiceTest 14 + SeatLockSweeperJobTest 4) |
| Controller smoke tests (unit, no Spring context) | ❌ | ✅ 7 tests (FeedbackControllerSmokeTest) |
| MockMvc / `@WebMvcTest` slice tests | ❌ | ❌ |
| Integration tests (Testcontainers) | ❌ | ❌ |
| Frontend component tests (Vitest / RTL) | ❌ | ❌ |
| E2E (Playwright / Cypress) | ❌ | ❌ |

Test runner: `maven:3.9.6-eclipse-temurin-21` Docker container on EC2 (`rtk docker run --rm -v ... mvn test`). No H2 or Testcontainers — all 25 tests are pure Mockito, no Spring context loaded.

---

## 8. Operations — deltas

| Item | Status |
|---|---|
| Switched to prod compose (`docker-compose.yml`) | ✅ — multi-stage Maven→JRE image; nginx on port 80; no hot-reload mount. |
| All 4 containers healthy (`mysql_prod`, `redis_prod`, `backend_prod`, `frontend_prod`) | ✅ |
| All feature branches pushed to GitHub | ✅ — `feature/seat-hold-tracking`, `feature/admin-feedback-report`, `feature/checkout-cancel-and-feedback-btn`, `demo` |
| HTTPS (port 443) | ❌ |
| Backups, log shipping, metrics | ❌ |
| CI/CD | ❌ |

---

## 9. What is genuinely shippable today (additive to tracking-2 §11)

In addition to what was shippable in iteration 2, a user can now:

1. See live countdown timers on LOCKED seats — e.g. "8p" or "42s" — refreshed every second. The seat map also re-polls every 20 s so newly released seats appear without a page reload.
2. Navigate away from checkout (back button, header link) and have their seat locks released immediately — other buyers can rebook within seconds instead of waiting up to 10 minutes.
3. Submit feedback at `/feedback` — choose category, write subject + body, give a 1–5 star rating.
4. As ADMIN/ORGANIZER: visit `/admin/feedback` to see KPI cards (total, unread, resolved, avg rating), filter the feedback table by status and category, open a detail panel, update status (NEW → READ → RESOLVED), and add an admin note.

---

## 10. Iteration-4 candidates (ranked by impact / effort)

Carrying forward all ❌ items from tracking-2 §12 plus new items uncovered this iteration.

| # | Candidate | Source | Est. |
|---|---|---|---|
| 1 | **Flyway baseline** (ADR-0005) — `V1__init.sql` capturing current schema (now includes `feedbacks`); flip to `ddl-auto: validate`. | ADR-0005 | ½ day |
| 2 | **OpenAPI spec reconciliation** — document all admin, feedback, cancel, and pagination endpoints in `openapi.yaml`. | Conventions | ½ day |
| 3 | **Idempotency-Key** (ADR-0006) for `POST /orders`, `POST /orders/{id}/pay`. | ADR-0006 | 1 day |
| 4 | **DB advisory lock** on sweeper (ADR-0010 full spec) — safe for multi-instance scale-out. | ADR-0010 | ½ day |
| 5 | **Real notification dispatcher** (ADR-0004) — `SELECT … FOR UPDATE SKIP LOCKED` draining PENDING rows; pluggable senders. | ADR-0004 | 1.5 days |
| 6 | **TLS / HTTPS** — ACM cert + ALB, or Certbot on EC2; tighten CORS allow-list. | Security | ½ day |
| 7 | **Rate-limit token bucket** in Redis + `X-RateLimit-*` headers. | NFR | 1 day |
| 8 | **MockMvc + Testcontainers** for critical-path tests (order lifecycle guards, DRAFT/COMPLETED rules, feedback auth). | Test strategy | 2 days |
| 9 | **k6 booking-path smoke** — baseline against NFR §2.4 (p95 < 2 s, 10 k concurrent). | NFR | 1 day |
| 10 | **Audit logging** — write `AUDIT_LOGS` rows on admin mutations + security signals; surface in analytics panel. | Threat model | 1 day |
| 11 | **Cursor pagination** on `/v1/events` per `api/conventions.md §6`. | Conventions | ½ day |
| 12 | **Resource-level RBAC** — organizer can only edit events they own (`@PreAuthorize` + ownership check). | Security | 1 day |
| 13 | **Mobile staff scanner** (ADR-0009 + `CHECK_INS` table, offline sync). | ADR-0009 | 3+ days |
| 14 | **Feedback — link to event** — from ticket detail or post-payment screen, pre-fill `eventId` on feedback form. | UX | ½ day |
| 15 | **CI/CD** — GitHub Actions: build + test on PR, deploy to EC2 on merge to `demo`. | Ops | 1 day |
