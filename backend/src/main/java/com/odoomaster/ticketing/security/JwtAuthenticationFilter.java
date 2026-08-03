package com.odoomaster.ticketing.security;

import com.odoomaster.ticketing.shared.security.AuthPrincipal;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Per-request filter that authenticates a {@code Authorization: Bearer <jwt>} header.
 *
 * <p>On a valid token it builds an {@link AuthPrincipal} and {@code ROLE_*} authorities and
 * populates the Spring Security context; on any parse/verify failure it clears the context and
 * lets the request proceed unauthenticated (route rules then decide access). Runs once per
 * request ({@link OncePerRequestFilter}).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwt;

    public JwtAuthenticationFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    /**
     * Extract and verify the bearer token, then set the authentication on the security context.
     *
     * @param req the incoming request
     * @param res the response
     * @param chain the remaining filter chain
     */
    @Override
    @SuppressWarnings("unchecked")
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims c = jwt.parse(token);
                Long userId = Long.valueOf(c.getSubject());
                String email = c.get("email", String.class);

                Set<String> roleNames = new HashSet<>();
                Object rolesClaim = c.get("roles");
                if (rolesClaim instanceof List<?> list) {
                    for (Object o : list) if (o != null) roleNames.add(o.toString());
                } else {
                    String singleRole = c.get("role", String.class);
                    if (singleRole != null) roleNames.add(singleRole);
                }

                AuthPrincipal principal = new AuthPrincipal(userId, email, Set.copyOf(roleNames));
                List<GrantedAuthority> authorities = new ArrayList<>();
                for (String r : roleNames) authorities.add(new SimpleGrantedAuthority("ROLE_" + r));

                var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(req, res);
    }
}
