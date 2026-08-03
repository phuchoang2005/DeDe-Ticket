/**
 * Catalog: events, categories, ticket types, venues/seats/sections and the seat-inventory
 * state machine — the read model behind the storefront and the write model behind admin CRUD.
 *
 * <p>Owns {@code Event}, {@code EventCategory}, {@code TicketType}, {@code EventSeat},
 * {@code Venue}/{@code Seat}/{@code Section} (all in {@code …internal}), the event/seat caches
 * ({@code CacheConfig}) and the {@code SeatLockSweeperJob}.
 *
 * <p>Publishes {@code EventCatalog} (event lookup / on-sale checks / reporting aggregates) and
 * {@code SeatInventory} (the {@code AVAILABLE→LOCKED→SOLD} machine, lock TTL and event-cache
 * eviction). As the base of the sales chain it depends only on {@code shared}; the delete-event
 * cascade is fan-out via the {@code shared:EventDeletedEvent} contract rather than a compile-time
 * dependency on {@code sales}/{@code ticketing}.
 */
@ApplicationModule(
        displayName = "Catalog",
        allowedDependencies = {"shared"})
package com.odoomaster.ticketing.catalog;

import org.springframework.modulith.ApplicationModule;
