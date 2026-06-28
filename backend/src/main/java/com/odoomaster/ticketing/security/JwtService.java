package com.odoomaster.ticketing.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Issues and verifies stateless JWTs used for authentication.
 *
 * <p>Tokens are HMAC-SHA signed with a secret from {@code app.jwt.secret} (which must be ≥ 32
 * bytes / 256 bits) and expire after {@code app.jwt.ttl-minutes} (default 1440). The token
 * subject is the user id; custom claims carry the {@code email} and {@code roles}.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlMinutes;

    /**
     * @param secret HMAC signing secret; must be at least 32 bytes
     * @param ttlMinutes token lifetime in minutes
     * @throws IllegalStateException if the secret is shorter than 32 bytes
     */
    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.ttl-minutes:1440}") long ttlMinutes) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 bytes (256 bits).");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.ttlMinutes = ttlMinutes;
    }

    /**
     * Issue a signed JWT for an authenticated user.
     *
     * @param userId the user id (becomes the token subject)
     * @param email the user's email (an {@code email} claim)
     * @param roles role names (a {@code roles} claim)
     * @return the compact, signed JWT string
     */
    public String issue(Long userId, String email, Set<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claims(Map.of("email", email, "roles", List.copyOf(roles)))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttlMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /**
     * Verify a token's signature/expiry and return its claims.
     *
     * @param token the compact JWT string
     * @return the verified claims payload
     * @throws io.jsonwebtoken.JwtException if the token is invalid, tampered, or expired
     */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    /** @return the configured token lifetime in minutes */
    public long getTtlMinutes() {
        return ttlMinutes;
    }
}
