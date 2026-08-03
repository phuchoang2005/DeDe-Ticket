/**
 * Sales: orders, payments and the mock payment-gateway retry loop.
 *
 * <p>Owns {@code Order}, {@code OrderItem}, {@code Payment}, {@code PaymentRetry} (in
 * {@code …internal}), the concurrency-critical {@code OrderService} (single-transaction
 * lock→sell→issue flow) and {@code PaymentRetryService}.
 *
 * <p>Publishes {@code SalesReporting} (revenue/order aggregates for {@code analytics}). Depends on
 * {@code catalog} ({@code EventCatalog}/{@code SeatInventory}) and {@code ticketing}
 * ({@code TicketIssuance}) — both invoked inside {@code OrderService.pay()}'s one transaction so
 * ACID/seat-lock semantics are unchanged — plus {@code shared}; purges its rows on the
 * {@code shared:EventDeletedEvent} cascade.
 */
@ApplicationModule(
        displayName = "Sales",
        allowedDependencies = {"catalog", "ticketing", "shared"})
package com.odoomaster.ticketing.sales;

import org.springframework.modulith.ApplicationModule;
