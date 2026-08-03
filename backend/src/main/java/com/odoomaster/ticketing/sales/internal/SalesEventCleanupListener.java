package com.odoomaster.ticketing.sales.internal;

import com.odoomaster.ticketing.sales.Order;
import com.odoomaster.ticketing.sales.OrderItemRepository;
import com.odoomaster.ticketing.sales.OrderRepository;
import com.odoomaster.ticketing.sales.PaymentRepository;
import com.odoomaster.ticketing.shared.event.EventDeletedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Purges sales rows for a deleted event: its order items, payments, and orders. Observes the
 * catalog's {@link EventDeletedEvent} synchronously so this runs inside the delete transaction (the
 * whole cascade stays atomic), keeping sales' {@code Order}/{@code Payment} entities private to the
 * module — catalog no longer reaches into them to cascade a delete.
 */
@Component
public class SalesEventCleanupListener {

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;

    public SalesEventCleanupListener(OrderRepository orders, OrderItemRepository orderItems,
                                     PaymentRepository payments) {
        this.orders = orders;
        this.orderItems = orderItems;
        this.payments = payments;
    }

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onEventDeleted(EventDeletedEvent event) {
        for (Order o : orders.findByEventId(event.eventId())) {
            orderItems.deleteAll(orderItems.findByOrderId(o.getId()));
            payments.deleteAll(payments.findByOrderId(o.getId()));
            orders.delete(o);
        }
    }
}
