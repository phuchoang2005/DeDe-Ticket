package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.domain.Ticket;
import com.odoomaster.ticketing.dto.TicketDtos.TicketPage;
import com.odoomaster.ticketing.dto.TicketDtos.TicketPageMeta;
import com.odoomaster.ticketing.dto.TicketDtos.TicketView;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Read/cancel service for a user's purchased tickets, including QR ticket detail.
 */
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

    private static final Set<String> TICKET_STATUSES = Set.of("VALID", "USED", "CANCELLED");

    public TicketPage listMinePaged(Long userId, int page, int limit, String status) {
        int safePage = Math.max(1, page);
        int safeLimit = Math.min(50, Math.max(1, limit));
        PageRequest pr = PageRequest.of(safePage - 1, safeLimit);
        Page<com.odoomaster.ticketing.domain.Ticket> result;
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            result = tickets.findByUserIdOrderByIssuedAtDesc(userId, pr);
        } else {
            String s = status.toUpperCase();
            if (!TICKET_STATUSES.contains(s)) {
                throw new AppException("VALIDATION_FAILED",
                        "status must be one of " + TICKET_STATUSES + " or omitted.",
                        HttpStatus.BAD_REQUEST);
            }
            result = tickets.findByUserIdAndStatusOrderByIssuedAtDesc(userId, s, pr);
        }
        List<TicketView> data = result.getContent().stream().map(this::view).toList();
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("all", tickets.countByUserId(userId));
        for (String s : TICKET_STATUSES) {
            counts.put(s, tickets.countByUserIdAndStatus(userId, s));
        }
        return new TicketPage(data,
                new TicketPageMeta(safePage, safeLimit, result.getTotalElements(), result.hasNext()),
                counts);
    }

    public TicketView getMine(Long userId, Long ticketId) {
        Ticket t = tickets.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> new AppException("TICKET_NOT_FOUND", "Ticket not found.", HttpStatus.NOT_FOUND));
        return view(t);
    }

    @Transactional
    public void cancelMine(Long userId, Long ticketId) {
        Ticket t = tickets.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> new AppException("TICKET_NOT_FOUND", "Ticket not found.", HttpStatus.NOT_FOUND));
        if ("USED".equals(t.getStatus())) {
            throw new AppException("TICKET_ALREADY_USED",
                    "Cannot delete a ticket that has already been checked in.",
                    HttpStatus.CONFLICT);
        }
        if ("CANCELLED".equals(t.getStatus())) {
            return;
        }
        t.setStatus("CANCELLED");
        tickets.save(t);
        seats.findById(t.getEventSeatId()).ifPresent(s -> {
            if ("SOLD".equals(s.getStatus())) {
                s.setStatus("AVAILABLE");
                s.setLockedBy(null);
                s.setLockedUntil(null);
                seats.save(s);
            }
        });
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
