package com.odoomaster.ticketing.ticketing.internal;

import com.odoomaster.ticketing.shared.EventDeletedEvent;
import com.odoomaster.ticketing.ticketing.internal.CheckInRepository;
import com.odoomaster.ticketing.ticketing.internal.Ticket;
import com.odoomaster.ticketing.ticketing.internal.TicketRepository;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Purges ticketing rows for a deleted event: the check-ins for its tickets, then the tickets. Observes
 * the catalog's {@link EventDeletedEvent} synchronously so this runs inside the delete transaction
 * (the whole cascade stays atomic), keeping the {@code Ticket}/{@code CheckIn} entities private to the
 * module. Check-ins are removed first to satisfy the {@code check_ins.ticket_id → tickets.id} FK — the
 * old catalog-side cascade deleted only tickets, so deleting an event with checked-in tickets would
 * have failed; this listener also purges those check-ins.
 */
@Component
public class TicketingEventCleanupListener {

    private final TicketRepository tickets;
    private final CheckInRepository checkIns;

    public TicketingEventCleanupListener(TicketRepository tickets, CheckInRepository checkIns) {
        this.tickets = tickets;
        this.checkIns = checkIns;
    }

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onEventDeleted(EventDeletedEvent event) {
        List<Ticket> issued = tickets.findByEventId(event.eventId());
        if (issued.isEmpty()) return;
        List<Long> ticketIds = issued.stream().map(Ticket::getId).toList();
        checkIns.deleteByTicketIdIn(ticketIds);
        tickets.deleteAll(issued);
    }
}
