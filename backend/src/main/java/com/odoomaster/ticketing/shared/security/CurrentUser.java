package com.odoomaster.ticketing.shared.security;

import com.odoomaster.ticketing.shared.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Helper for reading the authenticated {@link AuthPrincipal} from the security context.
 */
@Component
public class CurrentUser {

    /**
     * @return the current authenticated principal
     * @throws AppException with {@code UNAUTHENTICATED} (401) if no user is authenticated
     */
    public AuthPrincipal require() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal p)) {
            throw new AppException("UNAUTHENTICATED", "Authentication required.", HttpStatus.UNAUTHORIZED);
        }
        return p;
    }
}
