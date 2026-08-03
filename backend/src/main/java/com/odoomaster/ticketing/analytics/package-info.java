/**
 * Analytics: admin dashboards and cross-capability reporting.
 *
 * <p>Owns {@code AnalyticsService} — it composes figures from other modules' reporting APIs and
 * holds no persistent state of its own.
 *
 * <p>Publishes no cross-module API. Depends on {@code catalog} ({@code EventCatalog}),
 * {@code sales} ({@code SalesReporting} — revenue is composed here, not in {@code catalog}) and
 * {@code ticketing} ({@code TicketingReporting}), plus {@code shared}.
 */
@ApplicationModule(
        displayName = "Analytics",
        allowedDependencies = {"catalog", "sales", "ticketing", "shared"})
package com.odoomaster.ticketing.analytics;

import org.springframework.modulith.ApplicationModule;
