package com.odoomaster.ticketing.notification;

import com.odoomaster.ticketing.shared.TicketsIssuedEvent;
import com.odoomaster.ticketing.notification.NotificationService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Observer that turns a {@link TicketsIssuedEvent} into an in-app notification.
 *
 * <p>Uses a synchronous {@link EventListener}: it runs in the publisher's thread and joins the
 * same transaction as {@code OrderService.pay()}, so notification creation has exactly the same
 * timing/atomicity as the previous direct call. If notifications later need to be sent only after
 * a successful commit (e.g. when delivery becomes asynchronous), switch to
 * {@code @TransactionalEventListener(phase = AFTER_COMMIT)}.
 */
@Component
public class NotificationEventListener {

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Create the "tickets issued" notification for the recipient.
     *
     * @param event the published tickets-issued event
     */
    @EventListener
    public void onTicketsIssued(TicketsIssuedEvent event) {
        String title = event.ticketCount() == 1
                ? "Vé của bạn đã được phát hành"
                : event.ticketCount() + " vé của bạn đã được phát hành";
        String content = (event.eventTitle() != null ? "Sự kiện: " + event.eventTitle() + "." : "")
                + " Đơn hàng #" + event.orderId() + " đã thanh toán thành công qua " + event.paymentMethod() + ".";
        notificationService.create(event.userId(), "TICKETS_ISSUED", title, content, "IN_APP", "/tickets");
    }
}
