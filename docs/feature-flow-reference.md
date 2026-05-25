# Implemented Feature & Flow Reference

> Status: current implementation snapshot as of 2026-05-25. For endpoint-level request/response details, see [`api/openapi.yaml`](./api/openapi.yaml). For schema/database detail, see [`database-setup/schema-definition.md`](./database-setup/schema-definition.md).

This document summarizes the features that are implemented in the Spring Boot backend and React frontend. It is intended as the quick project-flow index; iteration tracking files remain historical notes.

---

## Roles and access

| Role | Implemented access |
|---|---|
| Anonymous | Browse home, event list, event detail, and live seat availability. Register or login. |
| `ROLE_USER` | Checkout, pay mock orders, view/cancel tickets, view ticket QR detail, manage profile, read notifications, submit feedback. |
| `ROLE_ORGANIZER` | All admin event, category, ticket-type, venue, feedback, and analytics routes. |
| `ROLE_ADMIN` | Organizer access plus staff ticket scan and audit-log access. |
| `ROLE_SCANNER` | Staff scan endpoint (`POST /v1/tickets/scan`). No dedicated scanner UI is currently present in the React app. |

Authentication is stateless JWT. The frontend stores the token in `localStorage`, loads `/v1/users/me` on boot, and gates protected routes with `RequireAuth` / `RequireRole`.

---

## Customer event and checkout flow

1. User browses `/` or `/events`.
2. Frontend calls `GET /v1/events` with `page`, `limit`, optional `category`, and optional `q`.
3. Home also calls `GET /v1/events/trending?limit=6`.
4. Event detail calls `GET /v1/events/{id}` and `GET /v1/events/{id}/seats`.
5. Seat map returns each seat with `AVAILABLE`, `LOCKED`, or `SOLD` and optional `lockedUntil`; the UI shows countdowns and polls the seat map every 20 seconds.
6. Authenticated user creates an order with `POST /v1/orders` using `eventId` and `seatIds`.
7. Backend locks the selected seats, creates a `PENDING_PAYMENT` order, and returns `201` with the order view.
8. Checkout pays with `POST /v1/orders/{id}/pay` using `MOMO`, `VNPAY`, or `MOCK`.
9. Successful payment marks the order paid, issues tickets with unique QR codes, records payment retry attempts when needed, and creates an in-app notification.
10. User lands on `/tickets` to view issued tickets.

Important rules:

- Orders can only be created for `PUBLISHED` events.
- Seat state in MySQL is the source of truth; Redis is advisory cache only.
- Expired locks are released by `SeatLockSweeperJob`.
- The sweeper is currently scheduled in every backend replica in the scaled compose topology; the operation is idempotent, but ADR-0010's DB advisory-lock guard is still a known follow-up.
- Idempotency-Key support is documented as an ADR but not implemented yet.

---

## Ticket ownership and gate flow

| Feature | Implemented behavior |
|---|---|
| My tickets | `GET /v1/tickets` returns a legacy bare array with no query string; with `page`, `limit`, or `status` it returns `{ data, page, counts }`. |
| Ticket detail | `GET /v1/tickets/{id}` returns owner-only ticket detail used by `/tickets/{id}`. |
| Cancellation | `DELETE /v1/tickets/{id}` cancels a caller-owned `VALID` ticket and releases the seat. A `USED` ticket returns `TICKET_ALREADY_USED`. |
| QR display | The React ticket detail page renders QR images using `api.qrserver.com` from the stored `qrCode`. |
| Staff scan | `POST /v1/tickets/scan` accepts `qrCode` and optional `deviceId`, requires `ROLE_SCANNER` or `ROLE_ADMIN`, writes `check_ins`, and prevents duplicate check-in with `CHECK_IN_ALREADY_DONE`. |
| Offline scanner | Database and ADR support exist, but there is no offline mobile scanner UI or offline sync endpoint in the current backend. |

---

## Admin and organizer flow

The React admin routes are:

- `/admin/events`
- `/admin/events/{id}`
- `/admin/events/{id}/venue`
- `/admin/analytics`
- `/admin/feedback`

Implemented admin capabilities:

| Area | Flow |
|---|---|
| Event list | `GET /v1/admin/events` returns status, capacity, sold seats, and revenue. |
| Event create/edit | `POST /v1/admin/events`, `GET /v1/admin/events/{id}`, and `PUT /v1/admin/events/{id}` manage title, description, location, image URL, organizer, categories, start/end time. |
| Lifecycle | `POST /v1/admin/events/{id}/status` changes event status. Publishing requires sellable seats. |
| Delete policy | `DELETE /v1/admin/events/{id}` rejects `PUBLISHED` events with `EVENT_PUBLISHED_NOT_DELETABLE`; `DRAFT`, `CANCELLED`, and `COMPLETED` cascade-delete associated event data. |
| Event sections | `POST /v1/admin/events/{id}/sections`, `PUT /v1/admin/events/{id}/sections/{section}`, and `DELETE /v1/admin/events/{id}/sections/{section}` add, rename/reprice, and delete event seat sections. Section deletion refuses LOCKED or SOLD seats. |
| Ticket types | `GET` / `POST /v1/admin/events/{eventId}/ticket-types` manage named ticket types with price, quantity, and sold count. |
| Categories | `GET` / `POST /v1/admin/categories` manage event categories. |
| Venue catalog | `GET` / `POST /v1/admin/venues`, `/v1/admin/venues/{id}/sections`, and `/v1/admin/venues/sections/{sectionId}/seats` manage reusable venue, section, and seat catalog rows. |
| Analytics | `GET /v1/admin/analytics?days=N` powers KPI cards, revenue-by-day, top events, payment funnel, category breakdown, and operational signals. |
| Audit | `GET /v1/admin/audit` exposes audit rows and is restricted to `ROLE_ADMIN`. Current audit writing is implemented for order create/pay actions. |

Resource-level ownership restrictions are partial: admin endpoints are role-gated, but organizer-specific ownership checks are not yet enforced.

---

## Feedback and notifications

| Flow | Implemented behavior |
|---|---|
| Submit feedback | Authenticated users submit `/feedback`, backed by `POST /v1/feedback`. Categories are `GENERAL`, `EVENT`, `PAYMENT`, `BUG_REPORT`, and `SUGGESTION`; rating is optional and ranges 1-5. |
| Admin triage | `/admin/feedback` calls `GET /v1/admin/feedback`, `/summary`, and `PATCH /{id}/status`; feedback status is `NEW`, `READ`, or `RESOLVED`. |
| Inbox | `/notifications` calls `GET /v1/notifications`, optional `type` filter, `GET /unread-count`, `POST /{id}/read`, and `POST /read-all`. |
| Dispatcher | Notifications are stored as in-app rows. A real asynchronous email/SMS/push dispatcher is still a follow-up. |

---

## Runtime and persistence

| Area | Current implementation |
|---|---|
| Backend | Java 21, Spring Boot 3.2, layered controller/service/repository/domain packages. |
| Frontend | React 18 + Vite SPA, with route screens under `frontend/src/pages` and API calls through `frontend/src/services/api.js`. |
| Database | MySQL 8 with Flyway migrations under `backend/src/main/resources/db/migration`. |
| Cache | Redis for advisory cache and durability settings in the scaled compose topology. |
| Load balancing | Production compose topology runs `backend1`, `backend2`, `backend3` behind nginx `lb` using `least_conn`; frontend nginx proxies `/v1/` to the load balancer. |
| Error shape | `GlobalExceptionHandler` emits the standard envelope described in [`api/conventions.md`](./api/conventions.md). Validation errors promote the first field message to the top-level message. |
| Tests | Current backend tests cover feedback service/controller smoke and seat-lock sweeper behavior. Broader MockMvc/Testcontainers coverage is still a backlog item. |

---

## Current frontend route map

| Route | Purpose |
|---|---|
| `/` | Home and trending events |
| `/events` | Public event listing |
| `/events/:id` | Event detail and seat selection |
| `/login`, `/register` | Authentication |
| `/checkout/:id` | Authenticated checkout/payment |
| `/profile` | Authenticated profile edit |
| `/tickets`, `/tickets/:id` | Authenticated ticket list and QR detail |
| `/notifications` | Authenticated notification inbox |
| `/feedback` | Authenticated feedback submission |
| `/admin/events`, `/admin/events/:id`, `/admin/events/:id/venue` | Admin/organizer event management |
| `/admin/analytics` | Admin/organizer analytics dashboard |
| `/admin/feedback` | Admin/organizer feedback report |
