# Tracking Sheet — Iteration 2

> Date: 2026-05-18
> Scope: admin/organizer console — events CRUD with lifecycle rules, sections (ticket-type) editor, analytics dashboard with diagrams, plus public-list pagination and login UX polish
> Source of truth: same docs as iteration 1 (`architecture/system-architecture.md`, `api/conventions.md`, `api/openapi.yaml`, `database-setup/schema-definition.md`, `adr/`, `coding-standards.md`, `UI-UX/admin-*.svg`, `UI-UX/analytics-dashboard.svg`).
> Public URL: `http://13.212.19.227/` · Demo logins (chip-pickable on `/login`):
> - `demo@dede.test / demo1234` — Người dùng
> - `organizer@dede.test / org12345` — Ban tổ chức
> - `admin@dede.test / admin1234` — Quản trị viên
> Baseline: see [`tracking-1.md`](./tracking-1.md). This sheet only covers deltas since that document.

---

## 1. What this iteration delivered

### 1.1 Admin console (was ❌ in tracking-1 §5 & §3)

| Mockup / capability | Implementation | Status |
|---|---|---|
| `UI-UX/admin-event-editor.svg` | `/admin/events/{id}` — left form (title, description, location, image, organizer, datetime range, status chips, category chips), right ticket-types panel with capacity + target-revenue totals + publish warning. Header has Preview / Publish / Delete actions. | ✅ Done |
| `UI-UX/admin-venue-editor.svg` | `/admin/events/{id}/venue` — section tree on the left, seat grid + section metadata editor on the right with stage marker, inline rename + price edit, delete-section button refusing in-use sections. | ✅ Done |
| `UI-UX/analytics-dashboard.svg` | `/admin/analytics` — 4 KPI cards, line+area revenue chart, donut category breakdown, payment funnel, operational-signals bar list, top-events leaderboard, day-range chips (7/14/30/90). | ✅ Done |
| Admin events list | `/admin/events` — table with status / capacity / sold / revenue + status filter chips + create + per-row delete. | ✅ Done |
| Role-gated routes | `RequireRole` component; admin nav links surface only for `ADMIN` / `ORGANIZER`. | ✅ Done |

### 1.2 Backend admin API (was ❌ in tracking-1 §3)

All under `hasAnyRole('ADMIN','ORGANIZER')` via `SecurityConfig`.

| Endpoint | Verb | Purpose |
|---|---|---|
| `/v1/admin/events` | GET | List with sold / revenue per row |
| `/v1/admin/events` | POST | Create as `DRAFT` (validated `AdminEventUpsertRequest`) |
| `/v1/admin/events/{id}` | GET / PUT | Detail + update |
| `/v1/admin/events/{id}` | DELETE | Delete with cascade rules (see §1.5) |
| `/v1/admin/events/{id}/status` | POST | Status transitions with guards |
| `/v1/admin/events/{id}/sections` | POST | Add section (rows × seats × price); auto-picks next free row letter |
| `/v1/admin/events/{id}/sections/{name}` | PUT / DELETE | Rename & reprice / drop (refuses LOCKED or SOLD seats) |
| `/v1/admin/analytics?days=N` | GET | KPI summary + revenue-by-day + top events + payment funnel + category breakdown + security signals |

Cache eviction wired on every admin mutation (`events:list`, `events:detail`, `events:seats`) per ADR-0003.

### 1.3 Pagination (was ❌ in tracking-1 §3 cross-cutting)

- `GET /v1/events?page=&limit=&category=&q=` returns `{data, page: {page, limit, total, hasMore}}`.
- Server-side category and full-text (title/location LIKE) filter.
- `EventListPage` shows numbered nav with prev/next + truncation (`1 … 4 5 6 … 30`); changing filter resets to page 1.
- `limit` clamped to 1–100; out-of-range pages return empty `data` with correct `total` and `hasMore=false`.

**Style note:** scheme is page/limit, not the cursor-based scheme called for by `api/conventions.md §6`. Migrating to cursor pagination remains a future change; today's offset scheme is acceptable for ≤ few-hundred events.

### 1.4 Login UX (was ✅ in tracking-1 §5 but bare)

`/login` now displays all three seeded accounts as clickable chips that pre-fill the form; the currently-selected one gets a brand-coloured ring. Role tag colours: green (USER), amber (ORGANIZER), red (ADMIN).

### 1.5 Lifecycle rules

Three guards added on top of the basic CRUD:

| Rule | Where | Code |
|---|---|---|
| **No tickets while DRAFT.** Orders rejected if `event.status != 'PUBLISHED'`. | `OrderService.create` | `409 EVENT_NOT_PUBLISHED` |
| **Cannot revert to DRAFT once tickets exist.** | `AdminEventService.changeStatus` | `409 EVENT_HAS_TICKETS` |
| **COMPLETED events are deletable.** Cascade deletes tickets → order items → payments → orders → seats → event. Other statuses still refuse delete when tickets or active (non-cancelled, non-expired) orders exist. | `AdminEventService.delete` + `cascadeDeleteEvent` | `204` (success) or `409 EVENT_HAS_TICKETS` / `EVENT_HAS_ORDERS` |

The cascade is implemented in service code via repo `findByEventId` / `findByOrderId`; there is no DB-level `ON DELETE CASCADE` because the JPA entities use raw `Long` FKs (no `@ManyToOne` join columns). Worth revisiting when Flyway migrations land (ADR-0005).

### 1.6 UI copy cleanup

All schema-style labels removed from user-visible text — `EVENTS.title`, `EVENT_CATEGORIES`, `TICKET_TYPES`, `EVENT_SEATS`, `PAYMENTS.amount status=SUCCESS`, `JOIN EVENTS · ORDERS`, etc. Replaced with plain Vietnamese ("Tiêu đề", "Doanh thu 14 ngày", "Tỉ lệ thanh toán thành công"). Internal JS map keys like `EVENT_REMINDER` are untouched (identifiers, never rendered).

### 1.7 Data seeding

`DataSeeder` rewritten to use `ensureUser(...)`-style upserts instead of an all-or-nothing `users.count() == 0` guard, so admin/organizer accounts are seeded even on pre-existing databases. Three accounts on every boot:

- `demo@dede.test` (`USER`)
- `organizer@dede.test` (`ORGANIZER`)
- `admin@dede.test` (`ADMIN`)

---

## 2. Analytics dashboard diagrams (per `UI-UX/analytics-dashboard.svg`)

Implemented as **SVG-native React components** — no chart library, zero added bundle dependencies.

| Diagram | Component | Data source |
|---|---|---|
| Revenue line + area chart | `RevenueLineChart` | `revenueByDay[]` from analytics endpoint; auto Y-axis with `niceCeil` rounding; dashed gridlines; data-point dots with the latest highlighted; hover tooltip = `date · formatted VND`. |
| Category donut | `CategoryDonut` | `categoryBreakdown[]`; centred total in the donut hole; legend with per-row count + percentage; rotated `-90°` so segments start at 12 o'clock. |
| Payment funnel | `FunnelBar` rows | `paymentFunnel`; horizontal bars with success / pending / failed; refund pills below. |
| Operational & security signals | `SecuritySignals` | `securitySignals[]`; severity-coloured dot + bar; copy maps backend codes to friendly labels (Thanh toán thất bại, Khoá ghế hết hạn, Đơn huỷ, Đang chờ hoàn tiền, Vé bị vô hiệu). |
| Top events table | inline `<table>` | `topEvents[]` sorted by revenue. |
| KPI cards | `KpiCard` ×4 | Revenue, tickets sold, payment success rate, check-in rate. Accent colour switches to `warn` if payment success drops below 98%. |

Backend additions to support the new diagrams:
- `AnalyticsDtos.CategoryBreakdownRow { category, eventCount, ticketsSold, revenue }`
- `AnalyticsDtos.SecuritySignal { code, label, count, severity }`
- `AnalyticsService.categoryBreakdown()` and `securitySignals()`

The security-signals panel is wired to **real** counts from `payments` / `orders` / `tickets` repos. There is still no `AUDIT_LOGS` table (`tracking-1 §4`), so "rate limited" / "duplicate offline check-in" / "failed login burst" shown in the SVG cannot be reported faithfully; the panel deliberately exposes only signals we actually compute.

---

## 3. Tracking-1's "Iteration-2 candidates" — status check

From `tracking-1.md §13`:

| # | Candidate | Status this iteration |
|---|---|---|
| 1 | Flyway baseline (ADR-0005) | ❌ Still on `ddl-auto: update`. Schema additions this iteration: none net-new tables; only repo query methods. |
| 2 | Idempotency-Key filter + table (ADR-0006) | ❌ Not implemented. State-changing POSTs still treat replays as fresh requests. |
| 3 | Single-instance seat-lock sweeper (ADR-0010) | ❌ Not implemented. Lock-expired seats are still re-acquired lazily inside `OrderService.create`. |
| 4 | Real notification dispatcher (ADR-0004) | ❌ Notifications still created with `status=SENT, channel=IN_APP`. No worker, no `SELECT … FOR UPDATE SKIP LOCKED`. |
| 5 | Rate-limit token bucket | ❌ Not implemented. `X-RateLimit-*` headers still absent. |
| 6 | JUnit + MockMvc + Testcontainers | ❌ Not implemented. Manual curl smoke tests only. |
| 7 | TLS + ALB | ❌ Public URL still HTTP. |
| 8 | k6 smoke | ❌ Not run. |
| 9 | **Admin events CRUD + dashboard skeleton** | ✅ **Done** (this iteration). Goes beyond the original scope — includes section/ticket-type editor + analytics dashboard with three diagrams. |
| 10 | Mobile staff scanner (ADR-0009, `CHECK_INS`) | ❌ Not implemented. |

---

## 4. Architecture invariants (`architecture/system-architecture.md §7`) — re-check

Unchanged vs tracking-1 except where noted.

| # | Invariant | Status |
|---|---|---|
| 1 | DB is source of truth for seat status | ✅ |
| 2 | One transaction per logical unit of work | ✅ — extended to admin section CRUD (`@Transactional` per service method) and event cascade-delete (single transaction across tickets → orders → payments → seats → event). |
| 3 | Sweeper runs in exactly one instance | ❌ (unchanged) |
| 4 | `ORDER_ITEMS.event_seat_id` UNIQUE | ✅ |
| 5 | `TICKETS.qr_code` UNIQUE | ✅ |
| 6 | Idempotency-Key honored | ❌ (unchanged) |
| 7 | All external calls have timeouts | ⚠️ (still no real external calls) |
| 8 | No business logic in controllers | ✅ — new admin controllers stay as DTO ↔ service mappers; all guards (publish-no-seats, draft-no-tickets, delete cascade) live in `AdminEventService`. |

---

## 5. API surface — deltas

New since tracking-1:

| Endpoint | Method | Status |
|---|---|---|
| `/v1/events` | GET — now paginated with `page`, `limit`, `category`, `q` | ✅ |
| `/v1/admin/events` | GET, POST | ✅ |
| `/v1/admin/events/{id}` | GET, PUT, DELETE | ✅ |
| `/v1/admin/events/{id}/status` | POST | ✅ |
| `/v1/admin/events/{id}/sections` | POST | ✅ |
| `/v1/admin/events/{id}/sections/{name}` | PUT, DELETE | ✅ |
| `/v1/admin/analytics?days=N` | GET | ✅ |

Still ❌ from tracking-1:
- Refresh-token endpoint
- Check-in / scan endpoints
- Refund / cancellation endpoints
- Cursor pagination on the listing endpoints (offset/limit shipped instead)
- Idempotency-Key behaviour
- Rate-limit response headers

### 5.1 OpenAPI spec drift

The admin endpoints **are not in `docs/api/openapi.yaml`** yet. The shipped behaviour is documented in this tracking sheet and in code; reconciling the spec (probably an `api/admin/{paths,schemas}.yaml` pair referenced from `openapi.yaml`) is owed to the next iteration. Same goes for the pagination envelope shape on `/v1/events`.

---

## 6. Database schema — deltas

No new tables. Only new repository methods (no DDL impact):

- `EventRepository.findPublished(...)` (Pageable)
- `EventRepository.findAllForAdmin()`
- `EventSeatRepository.findByEventIdAndSection`, `countByEventId`, `countByEventIdAndStatus`, `countAllSold`, `countAll`
- `OrderRepository.sumPaidRevenue[Since|ForEvent]`, `revenueByDay`, `countByStatus`, `countByEventIdAndStatusNotIn`, `findByEventId`
- `PaymentRepository.countByStatus`, `findByOrderId`
- `TicketRepository.countByEventId(AndStatus)`, `countByStatus`, `findByEventId`

Schema gaps inherited from tracking-1 §4 remain (`ROLES`, `EVENT_CATEGORIES`, `VENUES/SECTIONS/SEATS`, `TICKET_TYPES`, `PAYMENT_RETRIES`, `CHECK_INS`, `AUDIT_LOGS`).

---

## 7. UI/UX inventory — deltas

| Mockup | Status this iteration |
|---|---|
| `admin-event-editor.svg` | ✅ Done — covers info section + ticket-types panel + materialize warning. Multi-step tab bar (1/2/3/4) shown in the SVG is collapsed into a single editor route. |
| `admin-venue-editor.svg` | ✅ Done — left section tree + right seat grid editor + stats. **Skipped:** CSV import, copy structure from another venue, "5 sự kiện đã dùng địa điểm" panel (no shared VENUES table exists yet). |
| `analytics-dashboard.svg` | ✅ Done — KPIs / revenue chart / payment funnel / top events / category donut / signals. **Skipped:** "Xuất CSV" button, date-range picker (replaced by 7/14/30/90 chips), AUDIT_LOGS-backed signals. |
| `staff-scanner.svg` | ❌ Still no mobile module. |

---

## 8. Security — deltas

| Control | Status |
|---|---|
| Admin/organizer routes behind `hasAnyRole(...)` | ✅ Verified: USER token → 403, ORGANIZER → 200, ADMIN → 200, anonymous → 401 |
| Input validation on admin DTOs (`@NotBlank`, `@NotNull`, `@Positive`, `@Size`) | ✅ Empty payload → `400 VALIDATION_FAILED` with per-field details |
| Authorization checks centralised in service layer | ✅ via `SecurityConfig` request matchers; no resource-level RBAC yet (any ADMIN/ORGANIZER can edit any event — fine for single-tenant phase) |
| Mass-assignment risk on admin update | ⚠️ — service overwrites all editable fields from `AdminEventUpsertRequest`; status changes restricted to the dedicated endpoint. OK. |
| Cascade delete leaks user data? | ⚠️ — when a COMPLETED event is deleted, tickets and orders for that event are also deleted. This is intentional for the demo lifecycle but should require a confirmation toggle once real users exist. |

Everything else in tracking-1 §9 is unchanged (no TLS, no rate limiting, no audit logs, no PII masking).

---

## 9. Operations — deltas

| Item | Status |
|---|---|
| Backend / frontend rebuilt and redeployed on `my-ec2` via `docker compose build && up -d` | ✅ |
| New seeded users present on existing DB (idempotent seeder) | ✅ |
| nginx proxy unchanged; new admin pages served by SPA fallback | ✅ |
| HTTPS, log shipping, metrics, backups, CI/CD | ❌ (unchanged) |

---

## 10. Smoke tests run this iteration

All against `http://localhost` inside the EC2 (= `http://13.212.19.227/` from the internet):

| # | Scenario | Result |
|---|---|---|
| 1 | Health, public events list, anonymous-blocked admin endpoints | 200 / 401 |
| 2 | Login as `admin@dede.test`, list admin events, create draft, publish-without-seats → 409, add sections, update price, publish, delete section | All as expected |
| 3 | Login as `organizer@dede.test` → admin endpoints 200 | ✅ |
| 4 | Login as `demo@dede.test` → admin endpoints 403 | ✅ |
| 5 | Analytics: KPIs, revenue-by-day points, top events, payment funnel, category breakdown, security signals all populated | ✅ |
| 6 | Pagination: page=1/2 of 5, category filter, search q, out-of-range page=999 (`data=[]` `hasMore=false`) | ✅ |
| 7 | Delete: empty draft (204), event with PENDING order (409), event with paid ticket (409), same event after marking COMPLETED (204 + cascade verified by ticket disappearing from `/v1/tickets`) | ✅ |
| 8 | DRAFT enforcement: ordering DRAFT event → 409 `EVENT_NOT_PUBLISHED`; revert-to-DRAFT after ticket issued → 409 `EVENT_HAS_TICKETS` | ✅ |
| 9 | Login page bundle contains all three demo accounts as picker chips | ✅ |
| 10 | Frontend bundle has zero remaining schema-style labels (grep on `EVENTS.title`, `TICKET_TYPES`, `JOIN EVENTS`, etc.) | ✅ |

Still no automated tests (JUnit / MockMvc / Vitest / Playwright). Manual curl + jq scripts only.

---

## 11. What is genuinely shippable today (additive to tracking-1 §12)

In addition to the customer flow already shippable in iteration 1, an admin or organizer can now:

1. Log in as `admin@dede.test` or `organizer@dede.test` (one-click chip on `/login`).
2. See the admin nav links plus a role badge in the header.
3. Browse all events at `/admin/events` filtered by status, with capacity / sold / revenue per row.
4. Click any row to land on the event editor — edit fields, change status, publish, or delete.
5. Open the venue editor for an event — add a section, rename it, change price, delete it (refused if any seats are SOLD or LOCKED).
6. Open `/admin/analytics` to see revenue chart, category donut, payment funnel, operational signals, and a top-events leaderboard, scoped to 7 / 14 / 30 / 90 days.
7. Confirm the DRAFT rule end-to-end: try to order on a DRAFT event from a logged-in customer → see the standard error envelope with code `EVENT_NOT_PUBLISHED`.
8. Mark a finished event as `COMPLETED` and delete it — its tickets, order items, payments, and seats are cleaned up in the same transaction.

---

## 12. Iteration-3 candidates (ranked by impact / effort)

Carrying forward what's still ❌ from tracking-1's list plus what this iteration uncovered.

1. **Reconcile OpenAPI spec** with the admin endpoints + paged `/v1/events` envelope. ~½ day.
2. **Flyway baseline** (ADR-0005) — even more urgent now that admin can write schema-shaped data. ~½ day.
3. **Idempotency-Key** (ADR-0006) for `POST /orders`, `/orders/{id}/pay`, `/v1/admin/events`, `/v1/admin/events/{id}/status`. ~1 day.
4. **Single-instance sweeper** (ADR-0010) so abandoned carts don't quietly hold seats. ~1 day.
5. **Real notification dispatcher** (ADR-0004) — `SELECT … FOR UPDATE SKIP LOCKED`, pluggable senders. ~1.5 days.
6. **Cursor pagination** on `/v1/events` per `api/conventions.md §6`; keep `page=` accepted as a deprecation alias for one release. ~½ day.
7. **Rate-limit token bucket** + `X-RateLimit-*` headers. ~1 day.
8. **JUnit + MockMvc + Testcontainers** scaffolding — at minimum cover the admin lifecycle guards and the DRAFT/COMPLETED rules. ~2 days.
9. **Audit logging** — write `AUDIT_LOGS` rows for every admin mutation; expose to the security-signals panel. ~1 day.
10. **TLS / ACM + ALB**, then tighten CORS allow-list. ~½ day.
11. **k6 booking-path smoke** against NFR §2.4. ~1 day.
12. **Mobile staff scanner** (ADR-0009 + `CHECK_INS` table). ~3+ days.
13. **Resource-level RBAC** — organizer can only edit events they created (`@PreAuthorize` + `eventAccess.canEdit`). Today every ADMIN/ORGANIZER can edit every event. ~1 day.
14. **CSV import for venues** + "copy structure from another venue" — both shown in the SVG, both deferred. ~1 day each.
