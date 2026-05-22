package com.odoomaster.ticketing.security;

import java.util.Set;

public record AuthPrincipal(Long userId, String email, Set<String> roles) {

    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }
}
