/**
 * IAM: identity, authentication and authorization.
 *
 * <p>Owns {@code User}, {@code Role} (in {@code …internal}), the auth flow ({@code AuthService},
 * {@code JwtService}, {@code JwtAuthenticationFilter}) and the global {@code SecurityConfig}.
 *
 * <p>Publishes {@code UserDirectory} (user lookup for {@code feedback}/{@code notification}).
 * As an infrastructure module it depends only on {@code shared}.
 */
@ApplicationModule(
        displayName = "IAM",
        allowedDependencies = {"shared"})
package com.odoomaster.ticketing.iam;

import org.springframework.modulith.ApplicationModule;
