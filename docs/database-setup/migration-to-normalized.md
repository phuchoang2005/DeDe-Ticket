# Migration Plan: As-Built → Normalized Schema

> Status: DRAFT — sequencing plan for closing the gap between the live schema (Hibernate `ddl-auto: update`, 9 tables) and the normalized design in [`schema-definition.md`](./schema-definition.md) (19 tables).
> Companion: [ADR-0005 (Flyway)](../adr/0005-flyway-for-migrations.md), [`migration-strategy.md`](./migration-strategy.md).
> Live snapshot: 2026-05-21 — 9 tables: `users, events, event_seats, orders, order_items, payments, tickets, notifications, feedbacks`.

This doc is the playbook for *evolving* the running schema to the design schema, one slice at a time, without breaking the deployed app. Every slice is a Flyway forward migration (`V<ts>__*.sql`) plus matching entity edits. There is no rollback — per ADR-0005, reversal = a new forward migration.

---

## 1. Gap summary

| Domain | Live (as-built) | Design target | Slice |
|---|---|---|---|
| Auth roles | `users.role VARCHAR(20)` (single) | `ROLES`, `USER_ROLES` (M:N) | A |
| Event categories | `events.category VARCHAR(32)` (single) | `EVENT_CATEGORIES`, `EVENT_CATEGORY_MAP` (M:N) | B |
| Seat catalog | `event_seats` flat (`section, row_label, seat_number` denormalized per event) | `VENUES → SECTIONS → SEATS`, `event_seats.seat_id` FK | C |
| Ticket pricing | `event_seats.price` per-row | `TICKET_TYPES` + `order_items.ticket_type_id` | D |
| Payment retries | `payments` only | `PAYMENTS` + `PAYMENT_RETRIES` | E |
| Check-in | not built | `CHECK_INS` | F |
| Audit | not built | `AUDIT_LOGS` | G |
| Feedback | `feedbacks` (live, not in original design) | keep as-is, document in design | H |

Other deltas to fix inside surviving tables:
- `events.created_by` (FK to users) — currently missing.
- `tickets` has `event_id`, `user_id`, `event_seat_id`, `issued_at` not in design — keep (better than design); document.
- `notifications` has `channel`, `title`, `link_url`, `read_at` not in design — keep; document.
- `orders.event_id` — keep (better than design); document.
- No FK constraints in live DB (Hibernate didn't emit them). Every slice's migration adds the FKs it owns.

---

## 2. Sequencing rationale

Ordering rules:
1. **Additive slices first** (E, F, G, H) — net-new tables, no behavior change, no entity rewrites. Ship and verify in isolation.
2. **Categories before catalog** — B introduces lookup tables; C and D depend on lookup-table patterns being settled.
3. **Auth before any controller refactors** — A changes the JWT shape and every `@PreAuthorize`. Land it before B/C/D so subsequent PRs aren't tangled with role logic.
4. **Pricing last among breaking slices** — D depends on C (seats normalized first), and pricing touches order math.

Recommended order: **E → F → G → H → A → B → C → D**.

Each slice is one PR, one Flyway `V*.sql`, one passing smoke run, one merge to `demo` → eventual roll-up to `main`.

---

## 3. Slice E — `PAYMENT_RETRIES`

**Status:** additive. No data backfill needed.

### Migration
File: `V20260522_100000__add_payment_retries.sql`
```sql
CREATE TABLE payment_retries (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id      BIGINT NOT NULL,
  status          VARCHAR(20) NOT NULL,
  attempt_no      INT NOT NULL,
  error_code      VARCHAR(64) NULL,
  attempted_at    DATETIME(6) NOT NULL,
  CONSTRAINT fk_retry_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  INDEX idx_retry_payment (payment_id)
) ENGINE=InnoDB;
```

### Entity
- New `domain/PaymentRetry.java` (`@Entity`, `@Table("payment_retries")`).
- New `repository/PaymentRetryRepository.java`.
- `PaymentService.markFailed(...)` — emit one row per retry attempt instead of only mutating `payments.status`.

### Smoke impact
None — no public endpoint added. Verify via admin payment-detail view (slice H or later).

---

## 4. Slice F — `CHECK_INS` (scanner flow)

**Status:** additive + new feature surface.

### Migration
File: `V20260522_110000__add_check_ins.sql`
```sql
CREATE TABLE check_ins (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id        BIGINT NOT NULL,
  checked_in_by    BIGINT NOT NULL,
  checked_in_at    DATETIME(6) NOT NULL,
  status           VARCHAR(20) NOT NULL,
  device_id        VARCHAR(64) NULL,
  CONSTRAINT uk_check_ins_ticket UNIQUE (ticket_id),
  CONSTRAINT fk_checkin_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  CONSTRAINT fk_checkin_user FOREIGN KEY (checked_in_by) REFERENCES users(id),
  INDEX idx_checkin_at (checked_in_at)
) ENGINE=InnoDB;
```

`uk_check_ins_ticket` is the anti-double-scan invariant (per ADR-0009).

### Entity + service
- `domain/CheckIn.java`.
- `service/CheckInService.scan(qr)`:
  1. Look up `tickets` by `qr_code` (unique).
  2. Reject if `tickets.status != VALID`.
  3. Insert into `check_ins`; UK violation → return `ALREADY_USED`.
  4. Update `tickets.status = USED`.
- Endpoint `POST /v1/tickets/scan` — `SCANNER`/`ADMIN` role.

### Smoke additions
- `POST /v1/tickets/scan` happy path → 200.
- Duplicate scan → 409 `ALREADY_USED`.
- Non-existent QR → 404 `TICKET_NOT_FOUND`.

---

## 5. Slice G — `AUDIT_LOGS`

**Status:** additive + AOP wiring.

### Migration
File: `V20260522_120000__add_audit_logs.sql`
```sql
CREATE TABLE audit_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NULL,
  action      VARCHAR(64) NOT NULL,
  entity      VARCHAR(64) NOT NULL,
  entity_id   BIGINT NULL,
  metadata    JSON NULL,
  trace_id    VARCHAR(64) NULL,
  created_at  DATETIME(6) NOT NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
```

### Entity + AOP
- `domain/AuditLog.java`.
- `audit/Auditable` annotation + `audit/AuditAspect` (`@Around`) — records action on `@Auditable`-marked service methods. `trace_id` from MDC (per `api/conventions.md`).
- Don't audit reads. Don't audit `users.password_hash`, JWTs, or QR codes (per `coding-standards.md`).

### Smoke additions
- After creating an order, query `/v1/admin/audit?entity=orders` (new endpoint) — should see one `ORDER_CREATED` row.

---

## 6. Slice H — Document `feedbacks`

**Status:** docs only.

- Add `FEEDBACKS` to `schema-definition.md` ERD.
- No migration; table already exists.

---

## 7. Slice A — `ROLES` / `USER_ROLES` (BREAKING)

**Status:** breaking — touches JWT shape and every `@PreAuthorize`. Land in one PR.

### Migration (two-phase: online add, then cutover)

Phase 1 — add tables, backfill:
File: `V20260523_100000__add_roles_userroles.sql`
```sql
CREATE TABLE roles (
  id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(32) NOT NULL,
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

INSERT INTO roles (name) VALUES ('USER'), ('ADMIN'), ('ORGANIZER'), ('SCANNER');

-- backfill
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = u.role;
```

Phase 2 — drop legacy column (separate PR, after Phase 1 deploys and bakes):
File: `V20260530_100000__drop_users_role_column.sql`
```sql
ALTER TABLE users DROP COLUMN role;
```

### Entity diff
```java
// Before
@Entity public class User { @Column String role; }

// After
@Entity public class User {
    @ManyToMany(fetch = LAZY)
    @JoinTable(name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;
}
```

### Auth-layer changes
- `AuthService.login` — JWT `role` claim → `roles: ["USER","SCANNER"]` array.
- `security/JwtAuthFilter` — read `roles` claim, build `GrantedAuthority` set with `ROLE_` prefix.
- `SecurityConfig` — every `hasRole('ADMIN')` stays semantically valid; verify with the smoke RBAC test.
- Frontend `services/authService.js` — store `roles[]` instead of `role`. Components that check `user.role === 'ADMIN'` switch to `user.roles.includes('ADMIN')`.

### Smoke impact
- Login response shape changes (`user.role: "USER"` → `user.roles: ["USER"]`). Update existing smoke assertions.
- All authed endpoint behavior unchanged.

---

## 8. Slice B — `EVENT_CATEGORIES` / `EVENT_CATEGORY_MAP` (BREAKING)

**Status:** breaking — changes browse/filter API shape.

### Migration
File: `V20260524_100000__add_event_categories.sql`
```sql
CREATE TABLE event_categories (
  id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_category_name (name)
) ENGINE=InnoDB;

CREATE TABLE event_category_map (
  event_id    BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  PRIMARY KEY (event_id, category_id),
  CONSTRAINT fk_ecm_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_ecm_category FOREIGN KEY (category_id) REFERENCES event_categories(id)
) ENGINE=InnoDB;

-- backfill from denormalized column
INSERT INTO event_categories (name)
SELECT DISTINCT category FROM events WHERE category IS NOT NULL;

INSERT INTO event_category_map (event_id, category_id)
SELECT e.id, c.id FROM events e
JOIN event_categories c ON c.name = e.category
WHERE e.category IS NOT NULL;
```

Phase 2: `ALTER TABLE events DROP COLUMN category;` — separate PR.

### Entity diff
`Event.category String` → `Event.categories Set<EventCategory>` via `@ManyToMany`.

### API impact
- `GET /v1/events?category=Music` — repository query now joins `event_category_map`.
- Response: `event.category` (string) → `event.categories` (array of `{id, name}`). Frontend `EventCard` and filters must accept array.
- Admin event-edit screen needs multi-select.

### Smoke impact
- Update browse-filter assertion.
- Add: create category via admin, attach to event, filter by it.

---

## 9. Slice C — `VENUES` / `SECTIONS` / `SEATS` (BREAKING, riskiest)

**Status:** breaking — touches every seat read/write path including the sweeper and seat-lock optimistic-locking flow (ADR-0002).

3,769 live seat rows must be migrated without invalidating any in-flight order. **Schedule during a maintenance window** — or run as a two-phase shadow read until cutover.

### Migration outline
File: `V20260525_100000__add_venue_section_seat.sql`

```sql
CREATE TABLE venues (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  UNIQUE KEY uk_venue_name (name)
) ENGINE=InnoDB;

CREATE TABLE sections (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  venue_id  BIGINT NOT NULL,
  name      VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_section_venue_name (venue_id, name),
  CONSTRAINT fk_section_venue FOREIGN KEY (venue_id) REFERENCES venues(id)
) ENGINE=InnoDB;

CREATE TABLE seats (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  section_id   BIGINT NOT NULL,
  row_label    VARCHAR(8) NOT NULL,
  seat_number  VARCHAR(8) NOT NULL,
  UNIQUE KEY uk_seat_section_row_num (section_id, row_label, seat_number),
  CONSTRAINT fk_seat_section FOREIGN KEY (section_id) REFERENCES sections(id)
) ENGINE=InnoDB;

ALTER TABLE event_seats
  ADD COLUMN seat_id BIGINT NULL AFTER event_id,
  ADD CONSTRAINT fk_event_seats_seat FOREIGN KEY (seat_id) REFERENCES seats(id);
```

### Backfill (one-shot, transactional in a Spring `CommandLineRunner` gated by a flag)

```sql
-- 1. venues — one per distinct event.location
INSERT INTO venues (name) SELECT DISTINCT location FROM events WHERE location IS NOT NULL;

-- 2. sections — one per (venue, section) used by any event_seat
INSERT INTO sections (venue_id, name)
SELECT DISTINCT v.id, es.section
FROM event_seats es JOIN events e ON e.id = es.event_id
                    JOIN venues v ON v.name = e.location;

-- 3. seats — one per (section, row, seat)
INSERT INTO seats (section_id, row_label, seat_number)
SELECT DISTINCT s.id, es.row_label, es.seat_number
FROM event_seats es JOIN events e ON e.id = es.event_id
                    JOIN venues v ON v.name = e.location
                    JOIN sections s ON s.venue_id = v.id AND s.name = es.section;

-- 4. backfill event_seats.seat_id
UPDATE event_seats es
JOIN events e   ON e.id = es.event_id
JOIN venues v   ON v.name = e.location
JOIN sections s ON s.venue_id = v.id AND s.name = es.section
JOIN seats st   ON st.section_id = s.id AND st.row_label = es.row_label AND st.seat_number = es.seat_number
SET es.seat_id = st.id;

-- 5. make NOT NULL after verification
ALTER TABLE event_seats MODIFY seat_id BIGINT NOT NULL;
```

### Invariants to preserve
- `event_seats` UK `(event_id, section, row_label, seat_number)` becomes redundant once `(event_id, seat_id)` is UK. Keep both during transition.
- `ORDER_ITEMS.event_seat_id` UK constraint must remain intact (per `CLAUDE.md` invariant 4).
- Sweeper's `WHERE status='AVAILABLE' AND version=:v` clause stays — `version` column unaffected.

### Entity diff
- `EventSeat.section/rowLabel/seatNumber` columns → optional read-through (kept for backward compat one release) but populated from `seat_id` relation.
- New `Venue`, `Section`, `Seat` entities + repos.
- `SeatViewProjection` in `EventRepository` — query selects `seat.row_label, seat.seat_number, section.name AS section` to keep API response shape stable.

### Smoke impact
- `GET /v1/events/{id}/seats` response shape stays identical (we project the same fields).
- Order creation flow unchanged.
- New endpoints: `GET /v1/admin/venues`, `POST /v1/admin/venues`, `POST /v1/admin/venues/{id}/sections`, `POST /v1/admin/sections/{id}/seats`.

### Risks
- Live data has events with the same `location` string but no shared seats — backfill conflates them into one venue. Pre-check: any two events sharing a `location` AND `section` name should *intend* to share seats. Inspect with `SELECT e.location, es.section, COUNT(DISTINCT e.id) FROM event_seats es JOIN events e ON e.id=es.event_id GROUP BY 1,2 HAVING COUNT(DISTINCT e.id) > 1;` before migrating.

---

## 10. Slice D — `TICKET_TYPES` (BREAKING, depends on C)

**Status:** breaking. Splits `event_seats.price` into a typed price catalog.

### Migration
File: `V20260526_100000__add_ticket_types.sql`
```sql
CREATE TABLE ticket_types (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id        BIGINT NOT NULL,
  name            VARCHAR(64) NOT NULL,
  price           DECIMAL(12,0) NOT NULL,
  quantity        INT NOT NULL,
  sold_quantity   INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_tickettype_event_name (event_id, name),
  CONSTRAINT fk_tt_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB;

ALTER TABLE event_seats   ADD COLUMN ticket_type_id BIGINT NULL,
                          ADD CONSTRAINT fk_es_tt FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id);

ALTER TABLE order_items   ADD COLUMN ticket_type_id BIGINT NULL,
                          ADD CONSTRAINT fk_oi_tt FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id);
```

### Backfill
- For each event, group `event_seats` by `(section, price)`. Each group → one `ticket_type` row (`name = section`, `price = price`, `quantity = COUNT`).
- Populate `event_seats.ticket_type_id` and `order_items.ticket_type_id` from the new rows.

### Entity diff
- New `TicketType` entity + repo.
- `EventSeat.price` becomes derived (`@Transient` from `ticketType.price`) — keep column populated for one release, drop in phase 2.
- `OrderItem.price` stays (snapshot at purchase time).

### Smoke impact
- `POST /v1/orders` request body unchanged (still seat-id-based). Internally, derive `ticket_type_id` from chosen seat.
- Admin event-create needs a new "ticket types" sub-form.

---

## 11. Cross-cutting concerns

### Flyway adoption (pre-requisite for all slices)
- ADR-0005 commits to Flyway but it is **not yet wired** (`pom.xml` has no `flyway-core`). Slice 0 (call it E-pre) is to add the dependency, set `spring.flyway.enabled=true`, baseline the live schema via `V20260521_000000__baseline.sql` (= `mysqldump --no-data` of current live), and switch prod to `ddl-auto: validate`.
- Without this step, the V files above won't execute.

### Profile changes
- `application-prod.yml` → `ddl-auto: validate`, Flyway `migrate-on-start: true`.
- `application-dev.yml` → keep `ddl-auto: update` for now; flip to `validate` once team is comfortable writing SQL.

### Data backfill safety
- Wrap every backfill in `START TRANSACTION` / `COMMIT`.
- Verify counts before/after each backfill step. Example for slice C:
  ```sql
  SELECT COUNT(*) FROM event_seats WHERE seat_id IS NULL; -- must be 0 before MODIFY NOT NULL
  ```
- Keep legacy columns through one release (Phase 1 adds, Phase 2 drops). Each "drop column" is a separate PR after verification in staging.

### Smoke-test maintenance
- The current smoke script in [iteration progress doc] hits 27 assertions. Each breaking slice (A, B, C, D) needs its assertions updated in the same PR, plus added assertions for new behavior.
- Keep a `tests/smoke/main.sh` in the repo so it lives with the code, not in scratch.

### Rollback story
Forward-only (ADR-0005). For each breaking slice, the rollback migration is pre-written and reviewed at the same time as the forward one — even if it's `(undo)` only:
- `V20260530_100001__undo_drop_users_role.sql` — re-adds `users.role` and backfills from `user_roles` (kept in tree, not auto-applied; runs only on incident).

---

## 12. Open questions

1. **Idempotency-Key** — ADR-0006 promises cached replay; current smoke confirms `POST /v1/orders` replay returns 409 SEAT_TAKEN (the seat is already booked, not an idempotency hit). Need a separate slice (call it I) to implement `idempotency_keys` table + filter. Not part of the doc → live gap, but blocking on production readiness.
2. **`events.created_by`** — design has it, live doesn't. Add as part of slice B (small) or its own slice? Recommend: bundle with B.
3. **Multi-role JWT** — slice A allows users to hold multiple roles. UI today assumes a single role; need product input on whether the demo accounts should overlap (e.g., admin also organizer).
4. **Seat catalog reuse** — slice C assumes events at the same location share a venue. Need product input on whether two events at "SVĐ Hàng Đẫy" reuse seats or have independent inventories.
5. **Audit log retention** — slice G doesn't define TTL. 90 days? Forever? Soft-archive to a separate table?

---

## 13. Suggested commit order

```
demo branch:
  feat(db): wire Flyway + baseline live schema          # E-pre
  feat(payments): add payment_retries table             # E
  feat(checkin): add check_ins table + scan endpoint    # F
  feat(audit): add audit_logs + AOP aspect              # G
  docs(schema): document feedbacks in ERD               # H
  feat(auth): roles/user_roles tables + JWT array       # A
  refactor(events): event_categories M:N                # B
  refactor(seats): venue/section/seat normalization     # C
  refactor(pricing): ticket_types table                 # D
```

Each commit = one PR = one Flyway script (or a pair, Phase 1 + Phase 2 if the slice drops legacy columns). `main` only advances after the slice's smoke run is green on `demo`.
