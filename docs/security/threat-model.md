# Threat Model

> Status: DRAFT — initial baseline. Revisit at each release.
> Owner: tech lead + security reviewer.
> Scope: Dề Dê ticketing platform, all surfaces (web, mobile, API, background workers).
> Methodology: STRIDE per surface + OWASP Top 10 (2021) checklist.

This document captures the threats we have considered and the mitigations we have chosen. New features must update this doc — security review approval depends on it.

---

## 1. Assets we are protecting

| Asset | Sensitivity | Notes |
|---|---|---|
| Customer PII | Medium-High | Email, phone, full name in `USERS`. Subject to local data-protection norms. |
| Password hashes | High | bcrypt cost ≥ 12. Never logged. |
| Payment tokens / transaction IDs | High | Stored in `PAYMENTS.transaction_id`. PCI scope avoided by tokenizing through MoMo/VNPay — no raw PANs. |
| Ticket QR codes | High | `TICKETS.qr_code` — if leaked, can be used at the gate. UNIQUE constraint + check-in dedup limit blast radius. |
| Admin / Organizer credentials | Very High | Compromise → mass ticket fraud. MFA required (Sprint 2). |
| Refresh tokens | High | Stored hashed in `REFRESH_TOKENS`. Rotation on every use. |
| Audit logs | Medium | Required for fraud forensics; tampering is a threat. Append-only at the app layer. |
| Mobile staff app local DB | Medium | Contains ticket manifest. SQLCipher-encrypted (ADR-0009). |

---

## 2. Threat actors

| Actor | Motivation | Capability | Notes |
|---|---|---|---|
| **Scalper / bot operator** | Buy inventory faster than humans, resell at markup | Scripts, headless browsers, multiple IPs | Primary threat during golden hour. |
| **Casual fraud** | Reuse a screenshotted QR at the gate | Manual, single-event | Mitigated by `CHECK_INS.ticket_id UNIQUE` + staff scanner. |
| **Hostile staff** | Re-sell scanned tickets, alter check-ins | Authenticated scanner role | Audit logs + offline conflict surfacing. |
| **Hostile organizer** | Create fake events, scrape other organizers' data | Authenticated organizer role | RBAC scoping, manual moderation. |
| **Opportunistic external attacker** | Credential stuffing, SQLi, basic OWASP | Public internet, no insider info | Standard defenses below. |
| **Targeted external attacker** | Disrupt golden hour for a specific event | Sophistication varies | DDoS at edge; we don't mitigate nation-state. |
| **Insider (engineer / DBA)** | Curiosity, data exfil | Has read access to prod by definition | Least privilege; audit DB access; out of scope for Sprint 1 enforcement, in scope for monitoring. |

---

## 3. STRIDE per surface

### 3.1 Public API (HTTP)

| Threat | Vector | Mitigation |
|---|---|---|
| **S**poofing | Forged JWT | RS256 in prod, JWKS rotation, short access-token TTL (ADR-0007). |
| **T**ampering | Modified request bodies | TLS-only, JSON Schema validation, idempotency body-hash check. |
| **R**epudiation | "I didn't make that order" | AUDIT_LOGS on every state-changing call with `user_id`, `action`, `entity`, `metadata`. |
| **I**nfo disclosure | Verbose errors, IDOR | Standard error envelope hides internals; RBAC on every resource-scoped query. |
| **D**oS | Floods, expensive queries | Edge rate-limit, per-user rate-limit, query timeouts, paged responses only. |
| **E**oP | Role escalation via mass-assignment | DTO whitelist; `roles` field never settable by clients. |

### 3.2 Booking flow specifically

| Threat | Vector | Mitigation |
|---|---|---|
| Bot grabs all seats | Direct `/seats/lock` calls without UI flow | HMAC challenge token from the listing endpoint required (design-supplement §5). |
| Double-book | Race between two clients | Optimistic lock (ADR-0002) + `ORDER_ITEMS.event_seat_id UNIQUE`. |
| Charged but no ticket | Commit failure post-payment | Compensation flow + refund queue (design-supplement §3). |
| Replay of order POST | Retried client request | `Idempotency-Key` mandatory (ADR-0006). |
| Negative-price abuse | Manipulated `price` field | Server computes price from `TICKET_TYPES`, never trusts client. |

### 3.3 Auth surface

| Threat | Mitigation |
|---|---|
| Credential stuffing | Per-user + per-IP rate limit on `/auth/login`. Account lockout after 10 failures in 15 min. CAPTCHA after 3. |
| Password leak | bcrypt cost ≥ 12, peppered, hashes never returned via API. Have-I-Been-Pwned check on registration (Sprint 2). |
| Refresh token theft | Rotation on every use + replay detection (revokes all of a user's refresh tokens on replay). |
| Session fixation | New JWT issued on each login; refresh tokens are random opaque strings, not JWTs (so no algorithm confusion). |
| JWT `alg=none` | Server rejects any token whose header doesn't match the configured algorithm. |
| Account takeover via email change | Email-change requires re-authentication + confirmation email to old address. |

### 3.4 Payment surface

| Threat | Mitigation |
|---|---|
| Double-charge on retry | Idempotency key combined with attempt counter on gateway side. |
| Charged but order not updated | Compensation flow, refund queue, REFUND_PENDING state. |
| Callback spoofing | Gateway webhooks require HMAC-SHA256 signature verification with provider's secret; IP allow-list as defense in depth. |
| Amount tampering | Server-side recomputation of order total before charging. |
| PAN exposure | Never touched — we redirect to provider's hosted page. PCI scope: SAQ-A. |

### 3.5 QR / check-in surface

| Threat | Mitigation |
|---|---|
| Forged QR | `qr_code` is a UUID v4 — unguessable. Optional HMAC signing (Sprint 2) for defense in depth. |
| Replayed QR at the gate | `CHECK_INS.ticket_id UNIQUE` enforces single check-in. |
| Repudiation of a check-in by staff | Each scan records `CHECK_INS.checked_in_by` (account) + `device_id`; reviewable via `GET /v1/tickets/scans` (SCANNER/ADMIN/ORGANIZER). Note: only successful check-ins are logged — failed attempts need the planned `scan_attempts` table. |
| Lost / stolen scanner phone | Local SQLite is SQLCipher-encrypted; remote-wipe via MDM (Sprint 2). |
| Offline duplicate scan across devices | Server keeps earliest scan; later scan logged as `DUPLICATE_OFFLINE_CHECKIN`. |
| Scanner pre-fetch leaks ticket manifest | Pre-fetch contains only `qr_code`, `ticket_id`, `order_item_id`, `status` — no PII. |

### 3.6 Background workers

| Threat | Mitigation |
|---|---|
| Multiple sweepers race the user | Single-instance via DB advisory lock (ADR-0010). |
| Notification spam (workers stuck in retry loop) | Failure backoff + `status='FAILED'` after N retries. |
| Refund queue replay | Idempotent on `payment.transaction_id`. |

---

## 4. OWASP Top 10 (2021) checklist

| ID | Risk | Status | Notes |
|---|---|---|---|
| A01 | Broken Access Control | ✅ mitigated | Spring Security `@PreAuthorize`, resource-level checks in services. INV-test required for each role. |
| A02 | Cryptographic Failures | ✅ mitigated | TLS 1.2+ only, bcrypt for passwords, JWT signing keys in KMS in prod. |
| A03 | Injection | ✅ mitigated | JPA parameterized queries; never string-concat SQL; Bean Validation on inputs. |
| A04 | Insecure Design | ⚠️ partial | This doc + design-supplement cover the major flows; gaps revisited at each release. |
| A05 | Security Misconfiguration | ⚠️ partial | Spring profiles separate dev / prod. CSP headers + HSTS pending (Sprint 2). |
| A06 | Vulnerable Components | ⚠️ partial | Dependabot enabled; CVE scan in CI. SBOM generation pending. |
| A07 | ID & Auth Failures | ✅ mitigated | See §3.3. |
| A08 | Software & Data Integrity | ⚠️ partial | Container image signing pending. Backups exist; restore drill not yet rehearsed. |
| A09 | Logging & Monitoring Failures | ⚠️ partial | AUDIT_LOGS table in place; centralized log aggregation + SIEM rules pending. |
| A10 | Server-Side Request Forgery | ✅ mitigated | No user-controlled URL fetches in the system. Image upload (if added) must go through allow-list. |

---

## 5. Mitigations cross-reference

Every mitigation maps to a place in the code or infrastructure. If it has no owner, it does not exist.

| Mitigation | Where it lives |
|---|---|
| JWT validation | `security/JwtAuthenticationFilter` |
| RBAC | Spring `@PreAuthorize` on services |
| Rate limit (IP) | Edge proxy (nginx / Cloudflare) |
| Rate limit (user) | `security/RateLimitFilter` + Redis |
| HMAC challenge token | issued by `EventsController.list`, verified in `SeatsController.lock` |
| Idempotency | `web/IdempotencyKeyFilter` + `IDEMPOTENCY_KEYS` table |
| Audit logging | `audit/AuditLogService` invoked from services |
| Bcrypt password hashing | `auth/PasswordEncoderConfig` |
| Payment webhook signature | `payments/WebhookSignatureVerifier` |
| SQLCipher mobile DB | mobile app build config |
| Sweeper advisory lock | `jobs/SeatLockSweeper.acquireLock()` |

---

## 6. Detection & response

| Signal | Source | Action |
|---|---|---|
| Spike in `AUDIT_LOGS action='RATE_LIMITED'` | analytics | Tighten edge rules; alert ops. |
| Multiple `DUPLICATE_OFFLINE_CHECKIN` per event | analytics | Manual fraud review queue. |
| Refresh-token replay | auth service | Force-revoke all user refresh tokens, notify user via email. |
| Spike in `PAYMENT_FAILED_AFTER_RETRIES` | analytics | Page payment-gateway oncall. |
| 5xx > 1 % sustained | infra metrics | Page API oncall. |
| Sweeper backlog > 1000 | sweeper Prom gauge | Page infra oncall. |

---

## 7. Known accepted risks

- **Refresh-token revocation does not invalidate the still-valid access token (≤ 15 min window).** Accepted — short TTL bounds the exposure.
- **`AUDIT_LOGS` is append-only at the app layer but not enforced at the DB layer.** Accepted for Sprint 1; row-level immutability via DB triggers in Sprint 2.
- **No MFA for Sprint 1.** Accepted for customers; required for organizers and admins by Sprint 2.
- **No DDoS protection beyond edge rate-limit.** Accepted; we rely on the CDN provider's baseline.

Any new accepted risk requires an explicit line item in this section.

---

## 8. Open questions

- [ ] PII residency requirements for Vietnamese users — confirm with legal.
- [ ] Right-to-be-forgotten flow: how do we handle user deletion when `ORDERS` retention is required for tax records?
- [ ] Penetration test schedule before public launch.
