# ADR-0007: JWT for authentication

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Tech lead + security reviewer

## Context

`docs/api/openapi.yaml` declares `bearerAuth` and the codebase has Spring Security on the path. We need to commit to a token format that fits a stateless monolith (ADR-0001), supports mobile + web + staff app, and is acceptable to a security review.

## Decision

Use **stateless JWT (JWS, HS256 in dev, RS256 in prod)** for API authentication. Two-token flow:

- **Access token** — short-lived (15 min), carries `sub` (userId), `roles`, `iat`, `exp`, `jti`. Sent as `Authorization: Bearer <token>`.
- **Refresh token** — long-lived (14 days), opaque random string (NOT a JWT), stored server-side in `REFRESH_TOKENS` table with `user_id`, `token_hash`, `expires_at`, `revoked_at`. Rotated on every use.

Verification lives in `security/JwtAuthenticationFilter`. Authorization (RBAC) uses Spring's `@PreAuthorize` annotations on service methods, reading `ROLES` (already in the schema).

## Consequences

**Easier:** API pods are stateless; no session affinity needed at the load balancer; mobile and web share the same scheme.
**Harder:** revocation is non-trivial for access tokens — they remain valid until `exp`. We mitigate with a short access-token TTL and server-side refresh-token revocation.
**Accepted:** a leaked access token is valid for up to 15 minutes. The refresh token (which is the higher-value secret) is server-side revocable.

## Key management

| Env | Algorithm | Where the key lives |
|---|---|---|
| dev | HS256 | `application-dev.yml` (gitignored) |
| test | HS256 | CI secret manager |
| staging / prod | RS256 | Cloud KMS / secrets manager; rotated quarterly |

JWKS endpoint exposed at `/v1/.well-known/jwks.json` in non-dev envs to enable key rotation without redeploys.

## Alternatives considered

- **Server-side sessions (Spring Session + Redis).** Workable, but Redis becomes a hard dependency for every authenticated request — at odds with ADR-0003.
- **OAuth 2.0 with an external IdP (Auth0, Cognito).** Reasonable for production at scale; over-engineered for the capstone deliverable. Can be adopted later by switching the issuer.
- **Long-lived JWTs without refresh.** Rejected: no revocation story.

## Implementation rules

- Never put PII (email, full name, phone) in the JWT payload. Only `sub`, `roles`, `iat`, `exp`, `jti`.
- Refresh tokens are stored as **hashes** (bcrypt or SHA-256 with pepper), never plaintext.
- Token rotation: every successful refresh issues a new refresh token and revokes the old one (detect replay).
- Clock skew tolerance: 60 seconds.
- See `security/threat-model.md` for the full token-related threat analysis.
