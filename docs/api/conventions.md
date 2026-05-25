# API Conventions

> Status: implementation snapshot — updated 2026-05-25. Applies to every implemented endpoint in `openapi.yaml` and any new endpoint added after this date.
> Owner: backend team. Reviewers must reject PRs that deviate without an ADR.

This document specifies the cross-cutting contract that sits *above* per-endpoint definitions: error shape, idempotency, pagination, rate-limit headers, naming, dates. The OpenAPI spec is the source of truth for endpoints; this document is the source of truth for **how** endpoints behave.

---

## 1. Versioning

- Base path: `/v1`. Breaking changes ship as `/v2`, not as new fields on `/v1`.
- A change is **breaking** if any existing client written against the spec could fail after the change. Adding optional response fields is non-breaking. Removing or renaming fields, tightening enums, or changing field types is breaking.

---

## 2. Request format

- Content type: `application/json; charset=utf-8` for all POST/PUT/PATCH bodies.
- All JSON keys are `camelCase`. Database columns stay `snake_case`; the mapping happens in the DTO layer.
- All timestamps are ISO-8601 with timezone: `2026-05-14T03:21:00+07:00` or `2026-05-13T20:21:00Z`. Never epoch seconds, never date-only strings for datetimes.
- All money amounts are integer minor units (VND has no minor unit — use the integer; pass `currency: "VND"` separately if the field is multi-currency).
- All IDs in URLs and bodies are positive integers serialized as JSON numbers.

### Required headers on every request

| Header | Required? | Notes |
|---|---|---|
| `Authorization: Bearer <jwt>` | Auth-required endpoints only | See ADR-0007. |
| `Content-Type: application/json` | Bodies present | |
| `Accept: application/json` | Optional | Default. |
| `X-Request-Id` | Optional | Client-supplied trace id. If absent, server generates one. Echoed in every response. |
| `Idempotency-Key` | Not implemented yet. | ADR-0006 is accepted, but the backend currently does not enforce or replay idempotency keys. |

---

## 3. Standard error envelope

Every non-2xx response (except 401 / 429 which may be plain) returns:

```json
{
  "error": {
    "code": "SEAT_TAKEN",
    "message": "Seat 1A-12 is no longer available.",
    "details": [
      { "field": "seatIds[0]", "reason": "LOCKED_BY_OTHER" }
    ],
    "traceId": "01HF7ZQ4N0P9M2K3X6V8Y2W1B"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `code` | yes | SCREAMING_SNAKE_CASE. Stable identifier — clients dispatch on this. Catalogue below. |
| `message` | yes | Human-readable English; not localized. Client must NOT depend on the text. |
| `details` | optional | Array; per-field reasons for validation errors. |
| `traceId` | yes | Mirrors `X-Request-Id` response header. Used in support tickets. |

### HTTP status mapping

| Status | Used when | Common codes |
|---|---|---|
| `400 Bad Request` | Client request malformed | `VALIDATION_FAILED`, `MISSING_REQUIRED_FIELD`, `IDEMPOTENCY_KEY_REQUIRED` |
| `401 Unauthorized` | Token missing / invalid / expired | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_INVALID` |
| `403 Forbidden` | Authenticated but lacks permission | `FORBIDDEN`, `RESOURCE_FORBIDDEN` |
| `404 Not Found` | Resource doesn't exist (or user can't see it) | `RESOURCE_NOT_FOUND` |
| `409 Conflict` | Concurrency / state conflict | `SEAT_TAKEN`, `ORDER_STATE_INVALID`, `IDEMPOTENCY_KEY_REUSE` |
| `422 Unprocessable Entity` | Body parsed, semantics invalid | `SEMANTIC_ERROR` |
| `429 Too Many Requests` | Rate limit | `RATE_LIMITED`. Include `Retry-After`. |
| `402 Payment Required` | Payment-specific failures | `PAYMENT_FAILED`, `PAYMENT_FAILED_AFTER_RETRIES`, `PAID_BUT_REFUND_PENDING` (with 202 in the success-but-degraded case) |
| `500 Internal Server Error` | Server bug, unhandled | `INTERNAL_ERROR`. Never leak stack traces. |
| `503 Service Unavailable` | Dependency down, retryable | `DEPENDENCY_UNAVAILABLE`. Include `Retry-After`. |

### Error code catalogue (Sprint 1)

Maintain alphabetical. Add new codes as constants in `web/ErrorCodes.java`; never inline strings.

```
AUTH_REQUIRED
CHECK_IN_ALREADY_DONE
DEPENDENCY_UNAVAILABLE
DUPLICATE_OFFLINE_CHECKIN
EVENT_NOT_PUBLISHED
EVENT_PUBLISHED_NOT_DELETABLE
FORBIDDEN
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_KEY_REUSE
INSUFFICIENT_ROLE
INTERNAL_ERROR
MISSING_REQUIRED_FIELD
ORDER_STATE_INVALID
PAID_BUT_REFUND_PENDING
PAYMENT_FAILED
PAYMENT_FAILED_AFTER_RETRIES
RATE_LIMITED
RESOURCE_FORBIDDEN
RESOURCE_NOT_FOUND
SEAT_TAKEN
SEMANTIC_ERROR
TICKET_ALREADY_USED
TICKET_NOT_FOUND
TOKEN_EXPIRED
TOKEN_INVALID
UNAUTHENTICATED
VALIDATION_FAILED
```

---

## 4. Success responses

Current controllers return DTOs directly rather than a universal success envelope. Collection endpoints use one of these implemented shapes:

```json
[
  { "id": 42, "title": "..." }
]
```

```json
{
  "data": [ {...}, {...} ],
  "page": { "page": 1, "limit": 12, "total": 34, "hasMore": true }
}
```

`GET /v1/tickets` is intentionally dual-shape for back-compat: no query string returns a bare array, while `page`, `limit`, or `status` returns `{ data, page, counts }`.

---

## 5. Idempotency

See ADR-0006 for the intended decision. This section is not implemented yet and should not be treated as current behavior.

### Client behavior

- Generate a fresh UUID v4 per *logical* operation.
- Reuse the same key on every retry of that operation (network failure, timeout, 5xx).
- Do **not** reuse a key across logically different operations.

### Server behavior

- On first request: process normally, persist the response under the key for 24h.
- On retry with the same key + same body: return the persisted response verbatim, including the original status code.
- On retry with the same key + different body: respond `422 IDEMPOTENCY_KEY_REUSE`.
- If the original request is still in flight: respond `409 IDEMPOTENCY_KEY_IN_FLIGHT` (client should wait + retry).
- Missing key on a required endpoint: `400 IDEMPOTENCY_KEY_REQUIRED`.

### What counts as "same body"

SHA-256 of canonical JSON (sorted keys, no whitespace). The hash is stored in `IDEMPOTENCY_KEYS.request_hash`.

---

## 6. Pagination

Current implemented pagination is page-based.

### Request

```
GET /v1/events?page=2&limit=12&q=workshop
```

| Param | Required | Notes |
|---|---|---|
| `page` | optional | 1-based for most public/admin list endpoints; `GET /v1/admin/audit` uses Spring's 0-based page index. |
| `limit` | optional | Endpoint-specific default (`12` for events, `10` for tickets, `20` for feedback). |
| `status`, `category`, `q`, `type` | optional | Endpoint-specific filters. |

### Response

```json
{
  "data": [...],
  "page": {
    "page": 1,
    "limit": 12,
    "total": 42,
    "hasMore": true
  }
}
```

Cursor pagination remains a future improvement.

---

## 7. Rate limiting

Rate limiting is planned but not implemented in the Spring Boot app yet. The target two-tier model remains:

| Tier | Where | Default budget |
|---|---|---|
| IP | Edge proxy | burst 30 / sustained 10 rps |
| User | API (after JWT validation) | burst 10 / sustained 3 rps on write paths |

### Planned headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 6
X-RateLimit-Reset: 1715655660
```

### When rate-limited

```
HTTP/1.1 429 Too Many Requests
Retry-After: 12
Content-Type: application/json

{ "error": { "code": "RATE_LIMITED", "message": "...", "traceId": "..." } }
```

`Retry-After` is integer seconds. Clients must respect it.

---

## 8. Auth + RBAC

- `Authorization: Bearer <jwt>`. Token shape and key strategy: ADR-0007.
- Endpoint-level role requirements declared in `openapi.yaml` via `security` blocks and documented per-path.
- Implemented roles use Spring Security authority names such as `ROLE_USER`, `ROLE_ORGANIZER`, `ROLE_ADMIN`, and `ROLE_SCANNER`.
- Admin endpoints under `/v1/admin/**` require `ROLE_ADMIN` or `ROLE_ORGANIZER`, except `/v1/admin/audit`, which requires `ROLE_ADMIN`.
- Resource-level organizer ownership checks are not fully implemented yet.

---

## 9. Concurrency conventions

### Optimistic locking (booking flow)

A `409 SEAT_TAKEN` is **not** retried server-side. The client must re-fetch the seat map. The response body includes which seats failed:

```json
{
  "error": {
    "code": "SEAT_TAKEN",
    "message": "One or more selected seats are no longer available.",
    "details": [
      { "seatId": 1234, "reason": "LOCKED_BY_OTHER" },
      { "seatId": 1235, "reason": "BOOKED" }
    ],
    "traceId": "..."
  }
}
```

### ETags

Out of scope for Sprint 1. Add when caching layers need them.

---

## 10. Filtering, sorting, search

- Filters: `?status=PUBLISHED&category=Music&from=2026-05-01&to=2026-05-31`.
- Search: `?q=<query>` — server-side LIKE / FULLTEXT, scope documented per-endpoint.
- Sort: `?sort=startTime,-createdAt`. Prefix `-` for descending. Whitelist of sortable fields enforced server-side.

---

## 10a. Event lifecycle & deletion rules

Events move through `DRAFT → PUBLISHED → (CANCELLED|COMPLETED)`. The
admin delete endpoint (`DELETE /v1/admin/events/{id}`) enforces:

| Current status | Delete allowed? | Notes |
|---|---|---|
| DRAFT       | ✅ | Cascade removes seats, ticket types, audit traces. |
| CANCELLED   | ✅ | Cascade as above; any historical orders/tickets also purged. |
| COMPLETED   | ✅ | Cascade as above; intended for end-of-life cleanup. |
| PUBLISHED   | ❌ → 409 `EVENT_PUBLISHED_NOT_DELETABLE` | Must first transition the event to CANCELLED or COMPLETED. |

The PUBLISHED guard exists because deleting an actively-listed event
would yank tickets out from under customers without any visible
state change first. Transition to CANCELLED (which notifies holders)
or COMPLETED (post-event cleanup), then delete.

---

## 11. Health, readiness, info

| Path | Purpose | Auth |
|---|---|---|
| `GET /v1/health` | Application liveness | none |

Actuator endpoints and `/v1/info` are not part of the current implemented contract.

---

## 12. Deprecation

When a field or endpoint is being phased out:

- Response header `Deprecation: true`.
- Response header `Sunset: <RFC 3339 datetime>` indicating earliest removal.
- Add to the OpenAPI spec: `deprecated: true` + `x-sunset-date`.
- Announcement in the release notes referencing the new endpoint.

---

## 13. Examples

Every endpoint in OpenAPI must include at least one `examples:` block with a realistic request and response. Reviewers reject endpoints without examples.

---

## 14. Open questions (resolve before Sprint 1 freeze)

- [ ] Currency: confirm VND-only for Sprint 1 or design multi-currency now.
- [ ] Webhooks (organizer events, payment provider callbacks): inbound signature scheme — HMAC-SHA256?
- [ ] File uploads (event banners): direct-to-S3 with signed URLs vs. proxy through API?
