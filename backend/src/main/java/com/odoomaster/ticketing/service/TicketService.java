package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.domain.Ticket;
import com.odoomaster.ticketing.dto.TicketDtos.TicketView;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TicketService {

    private final TicketRepository tickets;
    private final EventRepository events;
    private final EventSeatRepository seats;

    public TicketService(TicketRepository tickets, EventRepository events, EventSeatRepository seats) {
        this.tickets = tickets;
        this.events = events;
        this.seats = seats;
    }

    public List<TicketView> listMine(Long userId) {
        return tickets.findByUserIdOrderByIssuedAtDesc(userId).stream().map(this::view).toList();
    }

    public TicketView getMine(Long userId, Long ticketId) {
        Ticket t = tickets.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> new AppException("TICKET_NOT_FOUND", "Ticket not found.", HttpStatus.NOT_FOUND));
        return view(t);
    }

    private TicketView view(Ticket t) {
        Event ev = events.findById(t.getEventId()).orElse(null);
        EventSeat s = seats.findById(t.getEventSeatId()).orElse(null);
        return new TicketView(t.getId(), t.getQrCode(), t.getStatus(),
                t.getEventId(),
                ev != null ? ev.getTitle() : null,
                ev != null ? ev.getLocation() : null,
                ev != null ? ev.getStartTime() : null,
                s != null ? s.getRowLabel() : null,
                s != null ? s.getSeatNumber() : null,
                s != null ? s.getSection() : null,
                s != null ? s.getPrice() : null,
                t.getIssuedAt());
    }
}
