package com.odoomaster.ticketing.security;

import java.util.Set;

/**
 * The authenticated caller, stored as the security context principal by {@link JwtAuthenticationFilter}.
 *
 * @param userId the authenticated user's id
 * @param email the user's email
 * @param roles the user's role names (without the {@code ROLE_} prefix)
 */
public record AuthPrincipal(Long userId, String email, Set<String> roles) {

    /**
     * @param role a role name to check
     * @return {@code true} if the principal holds that role
     */
    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }
}
