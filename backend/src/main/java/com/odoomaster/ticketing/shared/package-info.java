/**
 * Shared kernel: cross-cutting types every capability module may depend on.
 *
 * <p>Owns the API error contract ({@code ApiErrorEnvelope}, {@code GlobalExceptionHandler},
 * {@code AppException}), request tracing ({@code TraceIdFilter}), the authenticated-caller types
 * ({@code AuthPrincipal}, {@code CurrentUser}), the {@code @Auditable} marker, and the published
 * inter-module event contracts ({@code TicketsIssuedEvent}, {@code EventDeletedEvent}).
 *
 * <p>All of these live <strong>directly in this base package</strong> (its unnamed named
 * interface), so the whole kernel is exposed API and any module reaches it with a plain
 * {@code allowedDependencies = "shared"} — no named interface required. This is the Modulith&nbsp;1.1
 * idiom for an "open" shared kernel; open modules and {@code type = Type.OPEN} only arrived in 1.2.
 * As the base of the dependency graph the kernel must not depend on any capability module;
 * {@code OPEN_TOKEN} here only declares its <em>outgoing</em> dependencies unconstrained, and it
 * references none.
 */
@ApplicationModule(
        displayName = "Shared Kernel",
        allowedDependencies = ApplicationModule.OPEN_TOKEN)
package com.odoomaster.ticketing.shared;

import org.springframework.modulith.ApplicationModule;
