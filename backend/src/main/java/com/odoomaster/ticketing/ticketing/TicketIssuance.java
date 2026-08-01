package com.odoomaster.ticketing.ticketing;

import java.util.List;

/**
 * Published ticketing API for issuing QR tickets on a paid order.
 *
 * <p>{@code sales}' {@code OrderService} calls this instead of building and saving {@code Ticket}
 * entities itself, so ticket persistence and QR-code generation stay private to the ticketing
 * module. Invoked inside the ordering transaction, so issuance is atomic with the sale.
 */
public interface TicketIssuance {

    /**
     * Issue one {@code VALID} QR ticket per line of a paid order.
     *
     * @param order the buyer, event, and per-line seat references
     * @return the number of tickets issued
     */
    int issueForOrder(TicketOrder order);

    /** The paid order to issue tickets for. */
    record TicketOrder(Long userId, Long eventId, List<TicketLine> lines) {}

    /** One order line: the order item and the seat it holds. */
    record TicketLine(Long orderItemId, Long eventSeatId) {}
}
