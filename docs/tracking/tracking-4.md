# Tracking Sheet — Iteration 4

> Date: 2026-05-20
> Scope: horizontal scale-out of the API tier (nginx LB + 3 backend replicas) and Redis durability hardening (AOF + persistent volume + protective eviction policy).
> Source of truth: same docs as iterations 1–3 (`architecture/system-architecture.md`, `architecture/load-balancing.md` (new), `api/conventions.md`, `adr/`, `coding-standards.md`).
> Baseline: see [`tracking-3.md`](./tracking-3.md). This sheet only covers deltas since that document.

---

## 1. What this iteration delivered

### 1.1 Load balancer + backend pool (was ❌ in tracking-3 §3 — single backend container)

| Component | Detail | Status |
|---|---|---|
| `lb` service (nginx:alpine) | New container, internal-only (no host port). `least_conn` upstream over `backend1/2/3:8080`, `max_fails=3 fail_timeout=10s`, `proxy_next_upstream error timeout http_502/503/504` (idempotent retries only — POSTs are not replayed). Custom `log_format lb_upstream` adds `$upstream_addr / $upstream_response_time` so distribution is observable. | ✅ Done |
| `backend1`, `backend2`, `backend3` | Identical Spring Boot containers declared via YAML anchor (`x-backend`) so env, healthcheck, and depends_on stay in lockstep. Backend port no longer exposed to the host. | ✅ Done |
| Backend healthcheck | TCP probe via bash builtin `echo > /dev/tcp/localhost/8080` — works on `eclipse-temurin:21-jre` without installing curl/wget. `start_period: 40s` covers Spring Boot warm-up. | ✅ Done |
| LB healthcheck | `GET /lb/health` served by nginx itself (returns `200 ok`). `depends_on: lb { condition: service_healthy }` from `frontend` so the SPA does not accept connections until at least one backend is healthy. | ✅ Done |
| `frontend/nginx.conf` | `/v1/` reverse proxy now targets `lb:8080` (was `backend:8080`). SPA assets untouched. | ✅ Done |
| `docs/architecture/load-balancing.md` | New companion doc to `system-architecture.md §5` with topology diagram, policy table, scaling notes, and known follow-ups. | ✅ Done |

### 1.2 Redis durability + concurrency posture (was ❌ in tracking-3 — `--save "" --appendonly no`)

| Setting | Was | Now | Rationale |
|---|---|---|---|
| `appendonly` | `no` | `yes` | AOF on; survives container restart. |
| `appendfsync` | n/a | `everysec` | ≤1s data-loss window on crash; negligible throughput cost. |
| RDB snapshots | disabled | `save 900 1` + `save 300 10` | Coarse hourly/15-min backup of the AOF state. |
| `maxmemory` | `256mb` | `512mb` | Headroom for cache + rate-limit + idempotency under N=3 replicas. |
| `maxmemory-policy` | `allkeys-lru` | `volatile-lru` | Only TTL-bearing keys are evictable. Today every cache write and every (future) rate-limit/idempotency entry is written with TTL — keys without TTL are protected. |
| AOF rewrite | n/a | `auto-aof-rewrite-percentage 100 / min-size 64mb` | Keeps AOF compact under steady traffic. |
| Volume | none | named `redis_data:/data` | AOF survives container recreate. |

ADR-0003 is unchanged: Redis is still strictly advisory; MySQL remains the source of truth. The hardening is purely about making Redis a less leaky cache, not promoting it to source-of-truth.

---

## 2. Smoke test on EC2 (2026-05-20)

Stack brought up fresh after `docker compose down && up -d --build`. All seven containers healthy: `mysql`, `redis`, `backend1/2/3`, `lb`, `frontend`.

| Check | Result |
|---|---|
| 6× `GET http://localhost/v1/health` through frontend → lb → pool | `HTTP 200` × 6, alternating JSON key order proves multi-JVM fanout |
| 30× `GET /v1/health`, count by `$upstream_addr` | **11 / 10 / 9** across the three backend IPs (172.19.0.4/5/6) — close-to-uniform under `least_conn` for cheap requests |
| `POST /v1/auth/login` (demo@dede.test / demo1234) | `HTTP 200`, JWT length 220 chars |
| 5× `GET /v1/orders` with bearer token | `HTTP 200` × 5; **2 / 1 / 2** distribution across replicas — confirms JWT validation is stateless and works on any replica |
| `redis-cli CONFIG GET appendonly / maxmemory-policy / maxmemory` | `yes`, `volatile-lru`, `536870912` (= 512 MB) ✅ |
| AOF on disk in named volume | `/var/lib/docker/volumes/.../redis_data/_data/appendonlydir` present ✅ |
| Per-backend `/proc/1/stat` starttimes | Three distinct values — three independent JVMs running ✅ |

---

## 3. Tracking-3's "Iteration-4 candidates" — status check

From `tracking-3.md §10`:

| # | Candidate | Status this iteration |
|---|---|---|
| 1 | Flyway baseline (ADR-0005) | ❌ Still on `ddl-auto: update`. |
| 2 | OpenAPI spec reconciliation | ❌ |
| 3 | Idempotency-Key (ADR-0006) | ❌ |
| 4 | DB advisory lock on sweeper (ADR-0010) | ⚠️ **Now urgent** — sweeper runs in every replica. Sweep is idempotent (safe) but wasteful. |
| 5 | Real notification dispatcher (ADR-0004) | ❌ |
| 6 | TLS / HTTPS | ❌ |
| 7 | Rate-limit token bucket | ❌ |
| 8 | MockMvc + Testcontainers | ❌ |
| 9 | k6 booking-path smoke | ❌ |
| 10 | Audit logging | ❌ |
| 11 | Cursor pagination | ❌ |
| 12 | Resource-level RBAC | ❌ |
| 13 | Mobile staff scanner | ❌ |
| 14 | Feedback — link to event | ❌ |
| 15 | CI/CD | ❌ |
| **NEW** | **Horizontal scale-out (LB + N replicas)** | ✅ **Done** (this iteration, §1.1) |
| **NEW** | **Redis durability** | ✅ **Done** (this iteration, §1.2) |

---

## 4. Architecture invariants — re-check

Changes vs tracking-3:

| # | Invariant | Status |
|---|---|---|
| 1 | DB is source of truth for seat status | ✅ |
| 2 | One transaction per logical unit of work | ✅ |
| 3 | Sweeper runs in exactly one instance | ❌ **Regressed in posture, safe in practice.** Sweep is now scheduled in 3 JVMs simultaneously. ADR-0010 calls for a DB advisory lock; not yet wired. The sweep operation (`UPDATE … WHERE status='LOCKED' AND locked_until < now`) is idempotent so duplicates are harmless, but they cost DB CPU. **Top iteration-5 priority.** |
| 4 | `ORDER_ITEMS.event_seat_id` UNIQUE stays | ✅ |
| 5 | `TICKETS.qr_code` UNIQUE stays | ✅ |
| 6 | Idempotency-Key honored | ❌ — now also relevant because LB retries on 502/503/504 (no `non_idempotent`, so POSTs are *not* replayed at the LB layer either; clients still need Idempotency-Key for explicit retries). |
| 7 | All external calls have timeouts | ✅ — LB→backend: `proxy_connect_timeout 2s`, `proxy_read_timeout 15s`. |
| 8 | No business logic in controllers | ✅ |

---

## 5. Operations — deltas

| Item | Status |
|---|---|
| 3-replica backend pool behind nginx LB | ✅ |
| Redis AOF + persistent volume | ✅ |
| Frontend → LB → backend pool routing verified | ✅ |
| Backend port no longer exposed on the host | ✅ |
| Backend healthcheck (`/dev/tcp`) | ✅ |
| LB healthcheck (`/lb/health`) | ✅ |
| HTTPS (port 443) | ❌ |
| CI/CD | ❌ |
| MySQL read replica (per `system-architecture.md §5`) | ❌ — still single primary; 3 × Hikari (20) = 60 connections, well under MySQL default `max_connections=151`. |

---

## 6. Iteration-5 candidates (carried forward + new)

| # | Candidate | Source | Est. |
|---|---|---|---|
| 1 | **Sweeper DB advisory lock** (ADR-0010) — required now that the API tier has 3 replicas. | ADR-0010, this iter §4 #3 | ½ day |
| 2 | Flyway baseline (ADR-0005) | ADR-0005 | ½ day |
| 3 | OpenAPI spec reconciliation | conventions | ½ day |
| 4 | Idempotency-Key (ADR-0006) | ADR-0006 | 1 day |
| 5 | TLS / HTTPS termination at the LB | security | ½ day |
| 6 | Rate-limit token bucket in Redis | NFR | 1 day |
| 7 | k6 booking-path smoke against the new pool | NFR | 1 day |
| 8 | Dev compose parity — add Redis + LB so devs can repro multi-instance issues locally | this iter §1 | ½ day |
| 9 | MockMvc + Testcontainers | test strategy | 2 days |
| 10 | Audit logging | threat model | 1 day |
| 11 | Cursor pagination | conventions | ½ day |
| 12 | Resource-level RBAC | security | 1 day |
| 13 | Real notification dispatcher | ADR-0004 | 1.5 days |
| 14 | Mobile staff scanner | ADR-0009 | 3+ days |
| 15 | CI/CD | ops | 1 day |
