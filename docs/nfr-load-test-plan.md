# Non-Functional Requirements & Load-Test Plan

> Status: DRAFT — required reading before any performance claim is made.
> Owner: tech lead + QA.
> Companion docs: [`architecture/system-architecture.md`](architecture/system-architecture.md), [`design-supplement.md`](design-is/design-supplement.md), `GE-REQUIREMENT.md`.

This document turns the qualitative NFRs in `GE-REQUIREMENT.md` into measurable targets and a concrete test plan. If the system fails any of these checks, it does not meet the project requirements — regardless of feature completeness.

---

## 1. NFR targets

| ID | Target | Measure | Source |
|---|---|---|---|
| NFR-1 | 10 000 concurrent users during golden hour | concurrent vUsers in k6 | GE-REQUIREMENT §2.4 |
| NFR-2 | 50 000 tickets per event sellable within 60 min | end-to-end booking throughput | GE-REQUIREMENT §2.4 |
| NFR-3 | p95 < 2 000 ms on all user-facing endpoints during golden hour | k6 metric `http_req_duration{type:user}` p95 | GE-REQUIREMENT §2.4 |
| NFR-4 | p99 < 5 000 ms on the same scope | same | inferred |
| NFR-5 | Availability ≥ 99.5 % monthly | `(1 - downtime_minutes / 43200)` | GE-REQUIREMENT §2.4 |
| NFR-6 | Zero double-bookings under load | `COUNT(*) FROM ORDER_ITEMS GROUP BY event_seat_id HAVING COUNT(*) > 1` after each test | derived from schema invariants |
| NFR-7 | Zero duplicate QR codes | `COUNT(*) FROM TICKETS GROUP BY qr_code HAVING COUNT(*) > 1` after each test | schema |
| NFR-8 | Payment retry success ≥ 95 % on transient failures | `SUCCESS / (SUCCESS + FAILED-with-retries-available)` from PAYMENT_RETRIES | derived |
| NFR-9 | Offline scanner: ≥ 1 000 scans without network in 30 min, full sync in < 60 s when online | mobile harness counts + clock | GE-REQUIREMENT §2.5 |
| NFR-10 | Rate-limit effectiveness: bot scenario sees < 1 % of seats locked | simulated bot in test #5 | inferred from §5 of design-supplement |

NFR-6 and NFR-7 are **correctness** invariants, not performance — but they are checked at the end of every load test, because the most common way they break is under contention.

---

## 2. Test environment

Load tests run against **staging**, not prod, not dev.

| Component | Spec | Notes |
|---|---|---|
| API pods | ≥ 4 × (2 vCPU, 4 GB) | Same image and config as prod |
| MySQL | 8 vCPU / 32 GB / SSD | Single primary; replica optional |
| Redis | 2 vCPU / 4 GB | Same version as prod |
| Sweeper | 1 × (1 vCPU, 2 GB) | Per ADR-0010 |
| Notification dispatcher | 2 × (1 vCPU, 2 GB) | |
| Load generator | ≥ 2 × (4 vCPU, 8 GB), separate AZ from API | k6 cloud or self-hosted |

**Payment gateway**: a deterministic stub (configurable success / failure rate) running in the same network as staging, never the real provider. The stub records every call so we can assert idempotency on retries.

**Test data**: pre-seeded event with 50 000 `EVENT_SEATS`, 20 000 dummy customer accounts, 5 ticket types, mixed sections. Seeding lives in `docs/database-setup/` and runs in < 5 minutes.

---

## 3. Test scenarios

### Scenario A — Browse-only (baseline)

| | |
|---|---|
| **Goal** | Establish a healthy read baseline before any contention. |
| **Profile** | 2 000 vUsers, ramp 0 → 2 000 over 2 min, sustain 10 min. |
| **Behavior** | List events → view event detail → view seat map. No locks, no orders. |
| **Pass** | p95 < 800 ms; error rate < 0.1 %. |

### Scenario B — Steady-state booking

| | |
|---|---|
| **Goal** | Verify the booking funnel works at modest load. |
| **Profile** | 1 000 vUsers, 15 min, each user attempts one booking. |
| **Behavior** | Login → list → seat map → lock 2 seats → create order → pay (stub returns success) → fetch tickets. |
| **Pass** | p95 < 2 000 ms on every endpoint; ≥ 95 % bookings succeed end-to-end; NFR-6, NFR-7 hold. |

### Scenario C — Golden hour (the headline test)

| | |
|---|---|
| **Goal** | Prove NFR-1, NFR-2, NFR-3 simultaneously. |
| **Profile** | Ramp 0 → 10 000 vUsers in 60 seconds, sustain 60 minutes. |
| **Behavior** | All 10 000 attempt to book seats on the same event with 50 000 seats. 70 % buy 1 seat, 25 % buy 2 seats, 5 % buy 4 seats. Payment stub: 90 % success on first attempt, 8 % transient (retry succeeds), 2 % terminal. |
| **Pass** | Within 60 minutes: ≥ 95 % of seats become `BOOKED`; p95 < 2 000 ms on user-facing endpoints; NFR-6 and NFR-7 hold (zero duplicates); no 5xx > 0.5 % of any endpoint. |
| **Sub-checks** | Sweeper backlog never > 1 000 rows; Redis hit rate > 90 % on seat-availability fast-path; payment retry success ≥ 95 %. |

### Scenario D — Payment-burst soak

| | |
|---|---|
| **Goal** | Stress the compensation flow (ADR-0006, §3 of design-supplement). |
| **Profile** | 500 concurrent payments, payment stub failure rate 30 %. Run 30 min. |
| **Behavior** | Submit pay → handle retries → assert idempotency. |
| **Pass** | No "charged but no ticket" cases at the end (or every such case has a `REFUND_PENDING` / `REFUNDED` row). |

### Scenario E — Bot-attack simulation

| | |
|---|---|
| **Goal** | Verify rate limit + HMAC challenge keep bots from cornering inventory. |
| **Profile** | 500 "bot" vUsers (10 IPs × 50 sessions each) hitting `/seats/lock` without the prior listing call; 5 000 "human" vUsers using the proper flow. |
| **Behavior** | Bots fire blind locks; humans go through listing → lock. |
| **Pass** | Bots lock < 1 % of seats; humans see no degradation in p95. |

### Scenario F — Offline check-in surge

| | |
|---|---|
| **Goal** | Verify NFR-9 on mobile sync. |
| **Profile** | 10 scanner devices, pre-fetch a 5 000-ticket event, simulate 30 min of offline scanning, then reconnect. |
| **Behavior** | 1 000 scans per device with 1 in 20 a duplicate (intentional fraud signal). |
| **Pass** | Full sync < 60 s; every duplicate produces one `AUDIT_LOGS` row; no ticket flips from `USED` back to `VALID`. |

---

## 4. Tooling

**Load tool**: [k6](https://k6.io) — JavaScript scenarios, native p95/p99 metrics, supports per-endpoint thresholds, runs in cloud or self-hosted. Scripts live in `tests/load/`.

**Mobile harness**: Detox or Maestro running a scripted scanner; deterministic offline mode via airplane-mode toggle.

**Observability during tests**:

| Signal | Source |
|---|---|
| Request rate, latency p50/p95/p99 | k6 + Prometheus scraping API |
| DB query latency, lock waits | MySQL Performance Schema |
| Redis ops/sec, hit rate | Redis INFO |
| API pod CPU / memory / GC | container metrics |
| Sweeper backlog | custom Prom gauge from sweeper |

---

## 5. Pass / fail decision

A test run **passes** only if **all** of the following are true:

1. All scenario-specific pass criteria met.
2. NFR-6 and NFR-7 invariants (zero duplicates) hold post-run.
3. No 5xx error class exceeds 0.5 % of requests on any endpoint.
4. No `ORDERS` left in `PENDING` with paid `PAYMENTS` (no orphaned charges).
5. No `EVENT_SEATS` left `LOCKED` more than 1 hour past `locked_until` (sweeper kept up).

A failure on any item is a release blocker.

---

## 6. Cadence

- **Per PR**: scenario A only, on a small staging slice. Runtime budget: 5 minutes.
- **Pre-release**: scenarios A + B + C. Runtime: ~90 minutes.
- **Major release / quarterly**: full suite A–F.

---

## 7. k6 sketch (illustrative)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    golden_hour: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10000 },
        { duration: '60m', target: 10000 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{group:user}': ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.005'],
  },
};

export default function () {
  const idem = crypto.randomUUID();
  const token = login();
  const seats = pickSeats(token);
  const lock = http.post(`${BASE}/v1/events/${EVENT_ID}/seats/lock`,
    JSON.stringify({ seatIds: seats }),
    { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': idem } });
  check(lock, { 'locked or fairly rejected': r => [200, 409].includes(r.status) });
  if (lock.status !== 200) return;
  // ... create order, pay, fetch tickets ...
  sleep(Math.random() * 3);
}
```

Real scripts live in `tests/load/` once the framework is wired.

---

## 8. Reporting

Every load-test run produces:

- A summary markdown in `tests/load/reports/<date>-<scenario>.md` with verdict + headline numbers + chart links.
- Raw k6 JSON archived in object storage for 90 days.
- A line in the release-notes pre-flight checklist.

---

## 9. Open questions

- [ ] Final hardware sizing for staging — current numbers are illustrative.
- [ ] Where do load-test reports live long-term (Confluence? repo? S3)?
- [ ] Synthetic monitor (always-on probe) for NFR-5 availability — Pingdom / Uptime Kuma?
