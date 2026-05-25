# Design Supplement — flows missing from the draw.io diagrams

> **Status:** Required reading before implementation. The existing `ActivityDiagramQLDA.drawio.xml` and `SequenceDiagramQLDA.drawio.xml` cover the user-facing happy paths (register, login, profile, basic booking, payment retry loop, QR generation, check-in). The flows below close the gaps identified in the audit against `GE-REQUIREMENT.md` and `docs/engineering/database/schema-definition.md`, and **must be reflected in code** even if they are added to the drawio files later.
>
> **Conventions used in this document**
> - **Optimistic lock** ⇒ `EVENT_SEATS.version`. Every UPDATE includes `WHERE version = :expected`; affected-rows = 0 ⇒ retry.
> - **Idempotency key** ⇒ client-generated UUID stored against the operation (order, payment attempt). Server is required to return the cached result on replay.
> - **Schema source of truth** ⇒ `docs/engineering/database/init_schema.py` and `schema-definition.md`. Field names below are exact column names.

---

## 1. Seat-lock acquisition with optimistic locking (golden-hour safe)

**Why it matters:** PO target = 10 000 concurrent. The schema gives us `EVENT_SEATS.status`, `locked_by`, `locked_until`, and `version`. The current diagrams use `lockSeats(...)` but do not show the race-loser path. Without this, two users will both think they got the same seat.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Booking API
    participant Cache as Redis (seat cache)
    participant DB as MySQL (EVENT_SEATS)

    User->>API: POST /events/{id}/seats/lock { seatIds, idempotencyKey }
    API->>Cache: GET seats:{eventId} availability snapshot
    Cache-->>API: snapshot (may be stale, used only to fail-fast)
    alt any seatId not AVAILABLE in snapshot
        API-->>User: 409 SEAT_TAKEN (fast path, no DB hit)
    else snapshot OK
        loop for each seatId
            API->>DB: UPDATE EVENT_SEATS SET status='LOCKED',<br/>locked_by=:uid, locked_until=NOW()+15m,<br/>version=version+1<br/>WHERE id=:seatId AND status='AVAILABLE' AND version=:v
            DB-->>API: affectedRows (0 or 1)
            alt affectedRows = 0
                API->>DB: rollback all locks already taken in this request
                API-->>User: 409 SEAT_TAKEN (race-loser)
                Note over API: DO NOT retry server-side<br/>(client must re-pick on a fresh seat map)
            end
        end
        API->>Cache: invalidate seats:{eventId}
        API-->>User: 200 { lockId, expiresAt=locked_until }
    end
```

**Implementation rules**
- The `WHERE status='AVAILABLE' AND version=:v` clause is non-negotiable; do not lock seats via application-level mutexes.
- Lock all seats inside **one transaction**. If any seat fails the version check, ROLLBACK — never leave partially-locked carts.
- `idempotencyKey` is stored in an `ORDERS`-adjacent table (or Redis with 1h TTL); a replay returns the original `{lockId, expiresAt}` instead of re-locking.
- The fast-path Redis snapshot is **advisory only** — the DB UPDATE is the source of truth. Skipping the snapshot is acceptable; skipping the version check is not.

---

## 2. Seat-lock expiry sweeper (async)

**Why it matters:** `locked_until` is a timestamp, not a trigger. Without a sweeper, abandoned carts permanently hold seats and the system oversells / under-sells.

```mermaid
flowchart LR
    Start([Every 10s]) --> Q[SELECT id, event_id, locked_by FROM EVENT_SEATS<br/>WHERE status='LOCKED' AND locked_until < NOW()<br/>LIMIT 500]
    Q --> Any{rows?}
    Any -- no --> Start
    Any -- yes --> Tx[BEGIN]
    Tx --> Upd[UPDATE EVENT_SEATS<br/>SET status='AVAILABLE', locked_by=NULL,<br/>locked_until=NULL, version=version+1<br/>WHERE id IN (...)<br/>AND status='LOCKED'<br/>AND locked_until < NOW()]
    Upd --> Commit[COMMIT]
    Commit --> Inval[Invalidate Redis seats:{event_id}]
    Inval --> Notify[Insert NOTIFICATIONS rows<br/>type='SEAT_RELEASED' for affected locked_by users]
    Notify --> Audit[Insert AUDIT_LOGS<br/>action='SEAT_LOCK_EXPIRED']
    Audit --> Start
```

**Implementation rules**
- Single-instance job (use a DB advisory lock or a leader-election token) — do **not** run the sweeper on every API pod.
- Cap each pass with `LIMIT 500` so a backlog never blows out one transaction.
- Re-check `status='LOCKED' AND locked_until < NOW()` inside the UPDATE — a user might have just paid and bumped status to BOOKED between the SELECT and UPDATE.

---

## 3. Order → Payment → Ticket with compensation ("charged but no ticket")

**Why it matters:** Risk §2.8 of `GE-REQUIREMENT.md` calls this out by name. The current sequence diagram has a retry loop on payment but no rollback if payment succeeds and ticket generation fails. **This is the single highest-risk gap.**

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Orders API
    participant DB as MySQL
    participant PG as Payment Gateway (mock)
    participant Q as Refund Queue
    participant Notif as Notification dispatcher

    User->>API: POST /orders/{id}/pay { idempotencyKey, provider }
    API->>DB: BEGIN
    API->>DB: SELECT ... FROM ORDERS WHERE id=:id FOR UPDATE
    Note over API,DB: must be status='PENDING'<br/>else return current state

    API->>DB: INSERT PAYMENTS (order_id, provider, status='PENDING', retry_count=0)
    API->>DB: COMMIT

    loop attempt in 1..MAX_ATTEMPTS (cap 3)
        API->>PG: charge(amount, idempotencyKey+attempt)
        PG-->>API: SUCCESS | FAILED | TIMEOUT
        API->>DB: INSERT PAYMENT_RETRIES (payment_id, status, attempted_at)
        API->>DB: UPDATE PAYMENTS SET retry_count=retry_count+1
        alt SUCCESS
            API->>DB: UPDATE PAYMENTS SET status='SUCCESS', transaction_id=:tx
        else FAILED (non-retryable, e.g. insufficient_funds)
            API->>DB: UPDATE PAYMENTS SET status='FAILED'
            API->>DB: UPDATE ORDERS SET status='FAILED'
            API->>DB: release EVENT_SEATS locks held by this order
            API-->>User: 402 PAYMENT_FAILED
            Note over API: terminal
        else TIMEOUT or transient
            Note over API: continue loop with backoff
        end
    end

    alt PAYMENTS.status != SUCCESS after MAX_ATTEMPTS
        API->>DB: UPDATE ORDERS SET status='FAILED'
        API->>DB: release seats
        API-->>User: 402 PAYMENT_FAILED_AFTER_RETRIES
    else PAYMENTS.status = SUCCESS
        API->>DB: BEGIN
        API->>DB: UPDATE ORDERS SET status='PAID'
        API->>DB: UPDATE EVENT_SEATS SET status='BOOKED' (only those still LOCKED by this user)
        API->>DB: INSERT TICKETS (order_item_id, qr_code=UUID, status='VALID') for each item
        API->>DB: COMMIT
        alt commit OK
            API->>Notif: emit TICKETS_ISSUED
            API-->>User: 200 { tickets }
        else commit FAILS (rare — DB outage, constraint violation)
            API->>Q: enqueue { paymentId, orderId, reason } for refund
            API->>DB: UPDATE ORDERS SET status='REFUND_PENDING'
            API-->>User: 202 PAID_BUT_REFUND_PENDING
            Q-->>PG: refund(transaction_id)
            PG-->>Q: REFUNDED
            Q->>DB: UPDATE ORDERS SET status='REFUNDED'
            Q->>Notif: emit REFUND_ISSUED
        end
    end
```

**Implementation rules**
- One `idempotencyKey` per `POST /orders/{id}/pay` request. The gateway's idempotency key is `idempotencyKey + attempt#` so each retry is a distinct charge attempt on the gateway side but the *user-side* idempotency still prevents double-billing on client retry.
- `MAX_ATTEMPTS` and per-attempt backoff are config, not magic numbers. Suggested defaults: 3 attempts, 1s → 3s → 9s backoff.
- The "PAID but ticket-issue commit failed" branch is the **only** path that needs the refund queue. In normal operation it should never fire — but the schema (`ORDERS.status` enum, `PAYMENT_RETRIES`) gives us everything needed to recover safely.
- Add a state `REFUND_PENDING` and `REFUNDED` to the `ORDERS.status` enum (current schema has only `PENDING/PAID/FAILED/CANCELLED` — see schema migration note at bottom).

---

## 4. Offline check-in + sync

**Why it matters:** PO §2.4 + §2.5 explicitly require the mobile staff app to operate offline. Current diagrams show only the online happy path.

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant App as Mobile App
    participant Local as Local SQLite
    participant API as Check-in API
    participant DB as MySQL

    Note over App: On event start, staff pre-downloads<br/>TICKETS for this event into Local<br/>(qr_code, status, order_item_id)

    Staff->>App: scan QR
    App->>Local: SELECT * WHERE qr_code=:scanned
    alt found AND status='VALID'
        App->>Local: UPDATE status='USED'<br/>INSERT pending_checkin row
        App-->>Staff: ✅ Hợp lệ
    else found AND status='USED'
        App-->>Staff: ⚠️ Đã quét trước đó
    else not found
        App-->>Staff: ❌ QR không hợp lệ
    end

    loop background, when online
        App->>API: POST /tickets/sync-offline { pending_checkins[] }
        API->>DB: BEGIN
        loop for each pending row
            API->>DB: INSERT INTO CHECK_INS (ticket_id, checked_in_by, checked_in_at, status)<br/>ON DUPLICATE KEY UPDATE checked_in_at=LEAST(checked_in_at, VALUES(checked_in_at))
            API->>DB: UPDATE TICKETS SET status='USED' WHERE id=:tid AND status='VALID'
            alt UPDATE affected 0 rows AND CHECK_INS already had a row
                API->>DB: INSERT AUDIT_LOGS action='DUPLICATE_OFFLINE_CHECKIN'
                Note over API: server keeps the earliest scan;<br/>flag duplicate for fraud review
            end
        end
        API->>DB: COMMIT
        API-->>App: per-row results
        App->>Local: clear synced rows; surface conflicts to staff
    end
```

**Implementation rules**
- `CHECK_INS.ticket_id` is `UNIQUE` — that's our de-dup primitive. Use `ON DUPLICATE KEY` (or `INSERT ... ON CONFLICT` semantics in the JPA layer) to keep the earliest scan.
- Mobile app must pre-fetch ticket data before going offline. Refresh window = event start − 2h.
- Conflicts (same QR scanned offline by two devices) are not errors — they're fraud signals. Always log to `AUDIT_LOGS` and surface in the analytics dashboard.

---

## 5. Rate-limiting & bot-attack mitigation

**Why it matters:** PO Risks §2.7, §2.8 ("Bot attacks during ticket openings"). Diagrams do not reference any rate-limit primitive.

```mermaid
flowchart TB
    Req[Incoming request] --> Edge[CDN / reverse proxy<br/>per-IP token bucket<br/>burst 30 / sustained 10 rps]
    Edge -- 429 --> Reject1([Reject])
    Edge --> AuthGate{Requires auth?}
    AuthGate -- no --> Public[Public read endpoints<br/>cacheable]
    AuthGate -- yes --> JWT[Verify JWT]
    JWT -- invalid --> Reject2([401])
    JWT --> UserBucket[Per-user-id token bucket<br/>burst 10 / sustained 3 rps<br/>for write paths]
    UserBucket -- 429 --> Reject3([Reject])
    UserBucket --> Captcha{First seat-lock<br/>in last 60s?}
    Captcha -- yes --> Pass[Pass to API]
    Captcha -- no --> CaptchaCheck{HMAC challenge<br/>token valid?}
    CaptchaCheck -- yes --> Pass
    CaptchaCheck -- no --> Issue[Issue challenge<br/>client must solve]
    Pass --> API[(Booking API)]
```

**Implementation rules**
- Two-tier bucket: edge by IP (cheap) + user bucket inside the app (after JWT validation).
- A signed, short-lived HMAC challenge token is mandatory before `POST /events/{id}/seats/lock`. Token is issued by the events listing endpoint; bots that hit the lock endpoint directly without first calling the listing endpoint will be missing the token.
- All 429 responses include `Retry-After`. Failures emit `AUDIT_LOGS` rows with `action='RATE_LIMITED'` so analytics can spot patterns.

---

## 6. Organizer event creation (admin scope)

**Why it matters:** PO §2.5 requires "Event creation and management" but no diagram covers it.

```mermaid
flowchart TB
    Login[Login as ORGANIZER role] --> NewEvent[Create EVENTS row<br/>status='DRAFT', created_by=me]
    NewEvent --> CatPick[Pick categories<br/>insert EVENT_CATEGORY_MAP rows]
    CatPick --> VenuePick{Existing venue?}
    VenuePick -- yes --> SectionMap[Confirm SECTIONS layout]
    VenuePick -- no --> NewVenue[Create VENUES + SECTIONS + SEATS<br/>bulk insert]
    NewVenue --> SectionMap
    SectionMap --> SnapSeats[Snapshot SEATS → EVENT_SEATS<br/>all status='AVAILABLE', version=0]
    SnapSeats --> TicketTypes[Create TICKET_TYPES<br/>name, price, quantity per section]
    TicketTypes --> Review[Preview seating + pricing]
    Review --> Publish{Publish?}
    Publish -- yes --> SetStatus[UPDATE EVENTS SET status='PUBLISHED']
    Publish -- no --> SaveDraft[remain DRAFT]
    SetStatus --> Audit[INSERT AUDIT_LOGS action='EVENT_PUBLISHED']
    SaveDraft --> Audit
```

**Implementation rules**
- `EVENT_SEATS` is materialized at event-creation time (not lazily on first lock). This is what guarantees deterministic capacity and lets the sweeper run a cheap query.
- `EVENTS.status` enum needed: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`. The current schema column is `string`; tighten via app-side validation or a `CHECK` constraint.
- Only `PUBLISHED` events show in the public listing.

---

## 7. Events browsing (public)

**Why it matters:** No diagram covers it; UI mockups don't show filters.

```mermaid
sequenceDiagram
    actor User
    participant Web
    participant API
    participant Cache as Redis
    participant DB

    User->>Web: open /events?category=&from=&to=&q=
    Web->>API: GET /events?...
    API->>Cache: GET events:{filterHash}
    alt cache hit
        Cache-->>API: list
    else miss
        API->>DB: SELECT e.*, COUNT(es.id) as total_seats,<br/>SUM(es.status='AVAILABLE') as available<br/>FROM EVENTS e<br/>LEFT JOIN EVENT_CATEGORY_MAP m ON m.event_id=e.id<br/>LEFT JOIN EVENT_SEATS es ON es.event_id=e.id<br/>WHERE e.status='PUBLISHED'<br/>AND (m.category_id=:cat OR :cat IS NULL)<br/>AND e.start_time BETWEEN :from AND :to<br/>GROUP BY e.id<br/>ORDER BY e.start_time ASC<br/>LIMIT 24 OFFSET :page
        DB-->>API: rows
        API->>Cache: SET events:{filterHash} TTL 30s
    end
    API-->>Web: { events, facets }
    Web-->>User: render
```

**Implementation rules**
- 30s cache TTL on listing — keeps the listing endpoint cheap during golden hour without surfacing stale data for too long.
- The `available` column drives the "Còn X chỗ" badge in the UI. Computed at query time from `EVENT_SEATS`, not stored — this avoids the desync risk of a denormalized counter.

---

## 8. Notification dispatch (async, fan-out)

**Why it matters:** `NOTIFICATIONS` table exists; only the post-payment email is currently modeled. Other lifecycle events (seat released, refund, check-in reminder) are needed.

```mermaid
flowchart LR
    subgraph Producers
        P1[Payment success] -->|emit TICKETS_ISSUED| Bus
        P2[Sweeper releases lock] -->|emit SEAT_RELEASED| Bus
        P3[Refund queue] -->|emit REFUND_ISSUED| Bus
        P4[T-2h cron] -->|emit EVENT_REMINDER| Bus
    end
    Bus[(Notification bus / table-driven)]
    Bus --> Insert[INSERT NOTIFICATIONS<br/>user_id, type, content, status='PENDING', sent_at=NULL]
    Insert --> Worker[Dispatcher worker<br/>polls status='PENDING' LIMIT 100]
    Worker --> Route{type → channel}
    Route -->|email| SMTP
    Route -->|sms| SMS
    Route -->|push| FCM
    SMTP & SMS & FCM --> Mark[UPDATE NOTIFICATIONS<br/>SET status='SENT', sent_at=NOW()<br/>or status='FAILED' on error]
```

**Implementation rules**
- `NOTIFICATIONS` is the queue — no separate message broker required for Sprint 1.
- `type` enum: `OTP`, `TICKETS_ISSUED`, `SEAT_RELEASED`, `REFUND_ISSUED`, `EVENT_REMINDER`, `CHECKIN_CONFIRMATION`.
- Workers must use `SELECT ... FOR UPDATE SKIP LOCKED` (MySQL 8 supports it) when picking up rows so multiple workers can run safely.

---

## 9. Analytics aggregation

**Why it matters:** PO §2.5 requires sales/revenue reporting. Schema lists ORDERS, PAYMENTS, PAYMENT_RETRIES, CHECK_INS, AUDIT_LOGS as the foundation.

```mermaid
flowchart TB
    subgraph Live (read-on-demand, cached 60s)
        L1[Revenue today: SUM PAYMENTS.amount WHERE status=SUCCESS AND DATE created_at=today]
        L2[Tickets sold: COUNT TICKETS WHERE status IN VALID,USED]
        L3[Check-in rate: COUNT CHECK_INS / COUNT TICKETS per event_id]
        L4[Payment retry rate: AVG retry_count per PAYMENTS]
    end
    subgraph Rolled-up (nightly job)
        R1[Per-event sales by ticket type]
        R2[Per-category revenue]
        R3[Bot/fraud signals from AUDIT_LOGS action IN RATE_LIMITED, DUPLICATE_OFFLINE_CHECKIN]
    end
    Live --> Dash[Analytics dashboard]
    Rolled --> Dash
```

**Implementation rules**
- Live KPIs are SQL aggregations with 60s cache. No data-warehouse, no ETL — schema is small enough to query directly.
- Nightly job writes to a small `REPORT_DAILY` table (not in the current schema — add when needed; do not block Sprint 1 on it).

---

## Schema deltas implied by these flows

The schema is mostly ready, but to support the flows above, these small additions / tightenings are recommended:

| Table | Change | Reason |
|---|---|---|
| `ORDERS.status` | Extend enum: add `REFUND_PENDING`, `REFUNDED` | Compensation flow §3 |
| `EVENTS.status` | Tighten to enum: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` | Organizer flow §6 |
| `NOTIFICATIONS.status` | Tighten to enum: `PENDING`, `SENT`, `FAILED` | Dispatcher §8 |
| `NOTIFICATIONS.type` | Document enum values (see §8) | Dispatcher §8 |
| New table `IDEMPOTENCY_KEYS` (optional) | `key VARCHAR(64) PK, response JSON, expires_at` | Idempotent POST endpoints |

None of these are blocking — the system can ship Sprint 1 with the schema as-is and add the enums in a Sprint-2 migration. The flows above are the implementation contract.
