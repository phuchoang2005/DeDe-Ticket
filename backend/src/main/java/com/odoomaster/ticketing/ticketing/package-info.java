/**
 * Ticketing: issued tickets and gate check-in.
 *
 * <p>Owns {@code Ticket} and {@code CheckIn} (in {@code …internal}), the {@code TicketService}
 * (QR issuance / retrieval) and {@code CheckInService} (gate validation).
 *
 * <p>Publishes {@code TicketIssuance} (issue tickets for a paid order — called by {@code sales}
 * inside the single pay transaction) and {@code TicketingReporting} (check-in aggregates for
 * {@code analytics}). Depends on {@code catalog} (event/seat lookups) and {@code shared}; purges
 * its rows on the {@code shared:EventDeletedEvent} cascade.
 */
@ApplicationModule(
        displayName = "Ticketing",
        allowedDependencies = {"catalog", "shared"})
package com.odoomaster.ticketing.ticketing;

import org.springframework.modulith.ApplicationModule;
