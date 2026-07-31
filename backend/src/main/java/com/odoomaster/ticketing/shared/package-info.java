/**
 * Shared kernel: cross-cutting types every capability module may depend on.
 *
 * <p>Owns the API error contract ({@code ApiErrorEnvelope}, {@code GlobalExceptionHandler},
 * {@code AppException}), request tracing ({@code TraceIdFilter}), the authenticated-caller types
 * ({@code AuthPrincipal}, {@code CurrentUser}), the {@code @Auditable} marker, and the published
 * inter-module event contracts ({@code TicketsIssuedEvent}, {@code EventDeletedEvent}).
 *
 * <p>Declared an <strong>open</strong> module (via {@link org.springframework.modulith.ApplicationModule#OPEN_TOKEN}
 * — the Spring Modulith 1.1 idiom; superseded by {@code type = Type.OPEN} in 1.2+) so all of its
 * (nested) types are part of its published API and any module may use them without a named
 * interface. As the base of the dependency graph, this module must not depend on any capability
 * module.
 */
@ApplicationModule(
        displayName = "Shared Kernel",
        allowedDependencies = ApplicationModule.OPEN_TOKEN)
package com.odoomaster.ticketing.shared;

import org.springframework.modulith.ApplicationModule;
