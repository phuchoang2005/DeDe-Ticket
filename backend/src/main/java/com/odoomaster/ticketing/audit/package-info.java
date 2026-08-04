/**
 * Audit: the {@code @Auditable} audit trail.
 *
 * <p>Owns {@code AuditLog} and its repository (in {@code …internal}), the {@code AuditAspect} that
 * writes a row for every {@code shared:@Auditable} service call, and {@code AdminAuditController}.
 *
 * <p>Publishes no cross-module API. The aspect matches {@code @Auditable} purely via AOP, so audit
 * carries no compile-time dependency on the modules it observes — only on {@code shared}.
 */
@ApplicationModule(
        displayName = "Audit",
        allowedDependencies = {"shared"})
package com.odoomaster.ticketing.audit;

import org.springframework.modulith.ApplicationModule;
