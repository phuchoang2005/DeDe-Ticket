# Tracking Sheet — Iteration 5

> Date: 2026-05-25
> Scope: a clutch of UX & admin-policy fixes requested off the demo
> branch — trending events on the home page, owner-driven ticket
> cancellation, mobile-friendly pagination, a delete-rule revision for
> the admin event tool, Vietnamese validation messaging for the auth
> flow, and server-side pagination for the My Tickets screen.
> Baseline: [`tracking-4.md`](./tracking-4.md). This sheet only covers
> deltas since that document.

---

## 1. What this iteration delivered

| # | Feature | Branch | Doc touched | Status |
|---|---|---|---|---|
| 1 | Trending events on home page (sort by total capacity DESC, then start time ASC, PUBLISHED + future only) | `feature/event-browse` | `docs/api/events/paths.yaml` | ✅ |
| 2 | Owner can cancel their own ticket; seat goes back to AVAILABLE; USED tickets are rejected | `feature/checkout-cancel-and-feedback-btn` | `docs/api/tickets/paths.yaml`, `docs/api/conventions.md` (error codes) | ✅ |
| 3 | Pagination prev/next pinned to the outer edges on mobile, numbered list kept on tablet+ | `feature/event-list-pagination` | n/a (UI only) | ✅ |
| 4 | Admin event delete now refuses **only** `PUBLISHED` events; `DRAFT` / `CANCELLED` / `COMPLETED` cascade-delete freely | `feature/admin-event-delete-and-cleanup` | `docs/api/conventions.md` (§10a lifecycle table + error code) | ✅ |
| 5 | Vietnamese validation messages on register/login DTOs; `GlobalExceptionHandler` promotes the first field reason to `error.message`; custom-validity message on the register password input | `feature/auth-login` | n/a (auth paths unchanged) | ✅ |
| 6 | Server-side pagination + per-status counts on `GET /v1/tickets`; legacy bare-array shape preserved for back-compat | `feature/event-list-pagination` (reused) | `docs/api/tickets/paths.yaml` | ✅ |

### 1.1 New endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/v1/events/trending` | none | `?limit=` (max 20, default 6). PUBLISHED + future events ranked by total seat capacity DESC then start time ASC. |
| `DELETE` | `/v1/tickets/{id}` | bearer (owner) | 204 on success; 409 `TICKET_ALREADY_USED` if the ticket has been checked in. Releases the underlying `event_seats` row back to `AVAILABLE`. |

### 1.2 Behaviour changes

| Endpoint | Was | Now |
|---|---|---|
| `GET /v1/tickets` | Bare `TicketView[]` only | If `page`, `limit`, or `status` is supplied → `{ data, page, counts }` envelope. Otherwise unchanged (back-compat). |
| `DELETE /v1/admin/events/{id}` | Rejected non-`COMPLETED` events with tickets or active orders (`EVENT_HAS_TICKETS` / `EVENT_HAS_ORDERS`) | Rejects only `PUBLISHED` with `EVENT_PUBLISHED_NOT_DELETABLE` (409). All other statuses cascade-delete unconditionally. |
| `POST /v1/auth/{register,login}` validation | English Jakarta defaults (`size must be between 6 and 100`) | Vietnamese messages; first field reason copied into top-level `error.message`. |

### 1.3 New error codes (catalogued in `conventions.md` §3)

- `EVENT_PUBLISHED_NOT_DELETABLE`
- `TICKET_ALREADY_USED`
- `TICKET_NOT_FOUND`

---

## 2. Smoke test on EC2 (2026-05-25)

`docker compose build backend1 backend2 backend3 frontend` then
`docker compose up -d --no-deps --force-recreate ...`. All seven
containers healthy after ~60 s.

| Check | Result |
|---|---|
| `GET /v1/health` through frontend → lb → pool | `HTTP 200`, `{"status":"UP"}` |
| `GET /v1/events/trending?limit=3` | First two events ordered by totalSeats `220` → `134` ✓ |
| `POST /v1/auth/register` with `"password":"abc"` | `400 VALIDATION_FAILED`, `error.message = "Mật khẩu phải có từ 6 đến 100 ký tự."` ✓ |
| `GET /v1/tickets?page=1&limit=2` (demo user) | Paged envelope with `data[2]`, `page`, `counts:{all:140,VALID,USED,CANCELLED}` ✓ |
| `GET /v1/tickets` (no params, demo user) | Bare array, `len=140` — back-compat ✓ |
| `DELETE /v1/admin/events/77` (admin, status=PUBLISHED) | `HTTP 409`, `code=EVENT_PUBLISHED_NOT_DELETABLE` ✓ |
| Frontend `/` + first `/assets/*.js` | both `HTTP 200` ✓ |

UI verification (mobile pagination edge layout, ticket-delete button, Vietnamese registration error in the form) was not driven through a headless browser — manual click-through is recommended for visual sign-off on the touched pages: `/`, `/events`, `/tickets`, `/admin/events`, `/register`.

---

## 3. Tracking-4's "Iteration-5 candidates" — status check

This iteration was unscheduled UX work and did **not** advance the
infra/quality backlog from `tracking-3.md §10` / `tracking-4.md §3`.
That list still stands; items 1 (Flyway baseline — partially landed in
iteration 4's normalization) and 4 (sweeper advisory lock — flagged as
urgent now we run N=3 replicas) remain the next highest-priority
candidates.

---

## 4. Known follow-ups

- `GET /v1/tickets` returns a dual-shape body (`Object` return type on
  the controller) to preserve back-compat. Worth collapsing to a single
  paged shape once we confirm no external client depends on the bare
  array.
- The `Clock` bean added to `CacheConfig` for the trending query is a
  generic platform concern — consider moving to a dedicated
  `TimeConfig` once a second consumer appears.
- Admin event delete is now permissive for `COMPLETED` events with
  issued tickets (the old `EVENT_HAS_TICKETS` guard was removed by
  design). Audit logging on cascade deletes would be a worthwhile
  follow-up if compliance asks.
