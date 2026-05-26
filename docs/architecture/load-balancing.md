# Load Balancing & Redis Durability

> Companion to `system-architecture.md` §5. This doc covers the prod-compose
> realization of the LB tier and the Redis configuration that pairs with it.

## Topology (prod)

```
Internet
   │
   ▼  :${FRONTEND_PORT}
┌──────────┐  /v1/*   ┌──────┐ /v1/*  ┌──────────┐
│ frontend │────────► │  lb  │──────► │ backend1 │
│  nginx   │          │ nginx│   ┌──► │ backend2 │
│ (SPA)    │          │      │   ├──► │ backend3 │
└──────────┘          └──────┘   │    └──────────┘
                         least_conn
                                 │
                   ┌─────────────┴───────────────┐
                   ▼                             ▼
                 mysql                         redis
            (source of truth)          (advisory cache + buckets)
```

- `frontend` (nginx serving the SPA) reverse-proxies `/v1/` to `lb:8080`.
- `lb` is a dedicated nginx that load-balances across three backend replicas using `least_conn`.
- `backend1/2/3` are identical Spring Boot containers sharing the same JVM heap config and env, declared via a YAML anchor (`x-backend`) so they stay in lockstep.

Only `frontend` exposes a host port. `lb` and `backend*` are reachable only inside the compose network.

## Load-balancing policy

| Setting                       | Value                                         | Why |
|------------------------------|-----------------------------------------------|-----|
| Algorithm                    | `least_conn`                                  | Request durations are uneven (e.g. `/v1/orders/{id}/pay` ≫ `/v1/health`). Least-conn smooths tail latency vs round-robin. |
| `max_fails` / `fail_timeout` | `3` / `10s`                                   | One slow GC pause shouldn't eject a replica; three consecutive failures should. |
| Connect timeout              | `2s`                                          | Matches the external-call connect timeout in `system-architecture.md` §7. |
| Read timeout                 | `15s`                                         | Absorbs cold-cache + payment-mock spikes; well below the LB's own client cutoff. |
| `proxy_next_upstream`        | `error timeout http_502 http_503 http_504`    | Idempotent retries only — `non_idempotent` is **not** set, so POSTs do not silently replay. Client-visible Idempotency-Key support is still a backend follow-up from ADR-0006. |
| Keepalive                    | `32` per upstream                             | Reuses TCP connections across many requests; cuts handshake cost during bursts. |

### Health endpoints

- Backend per-instance: TCP check via bash `/dev/tcp/localhost/8080` (no extra dependency in `eclipse-temurin:21-jre`).
- LB: `GET /lb/health` returns `200 ok` from nginx itself.
- The LB depends on `service_healthy` for all three backends, so it will not accept traffic until at least the first wave of replicas are up.

## Scaling

Three replicas is the Sprint-1 baseline aligned with NFR §2.4 (10k concurrent users). To scale wider:

1. Duplicate the anchor block in `docker-compose.yml` (`backend4: <<: *backend`) and add it to the `lb` upstream and `depends_on`.
2. Verify MySQL `max_connections` (default 151) is comfortable with `replicas × Hikari pool (20) + sweeper/notifier overhead`.
3. Watch Hikari saturation in logs before raising replica count further; the bottleneck is the DB pool, not the JVM.

## Redis durability & concurrency posture

ADR-0003 keeps Redis advisory, but losing it on every restart still hurts: rate-limit buckets reset, the events cache cold-starts, and any in-flight idempotency lookups miss. Prod-compose Redis now runs with:

- `--appendonly yes --appendfsync everysec` — AOF with ≤1s data-loss window on crash.
- `--save 900 1 --save 300 10` — coarse RDB snapshots as a backup.
- `--maxmemory 512mb --maxmemory-policy volatile-lru` — only TTL-bearing keys are evictable; non-expiring keys (none today) are protected. Rate-limit buckets and idempotency entries are explicitly written with TTLs.
- A persistent named volume `redis_data:/data` so AOF survives container recreate.
- `auto-aof-rewrite-percentage 100` + `min-size 64mb` to keep the AOF compact under steady traffic.

This is a config-only hardening. MySQL remains the source of truth per ADR-0003; a Redis flush is still a degradation, not an outage.

## Known follow-ups

- **Sweeper duplication.** `SeatLockSweeperJob.releaseExpiredLocks` is `@Scheduled` and now runs in every backend replica. ADR-0010 requires a single instance via DB advisory lock — the lock has not yet been added. Track separately; not blocking for this LB rollout (the sweep is idempotent — duplicate runs are safe but waste DB work).
- **Dev compose drift.** `docker-compose.dev.yml` does not include Redis or the LB. Dev still talks to a single backend through Vite, which is fine for local development but means devs can't exercise the multi-replica path locally.
