package com.odoomaster.ticketing.ticketing;

import com.odoomaster.ticketing.ticketing.CheckIn;
import com.odoomaster.ticketing.catalog.Event;
import com.odoomaster.ticketing.catalog.EventSeat;
import com.odoomaster.ticketing.ticketing.Ticket;
import com.odoomaster.ticketing.ticketing.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.ticketing.TicketDtos.ScanResult;
import com.odoomaster.ticketing.shared.exception.AppException;
import com.odoomaster.ticketing.ticketing.CheckInRepository;
import com.odoomaster.ticketing.catalog.EventRepository;
import com.odoomaster.ticketing.catalog.EventSeatRepository;
import com.odoomaster.ticketing.ticketing.TicketRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gate check-in service: validates a ticket's QR code and records a single, idempotent
 * check-in, transitioning the ticket to {@code USED}.
 */
@Service
public class CheckInService {

    private final TicketRepository tickets;
    private final CheckInRepository checkIns;
    private final EventRepository events;
    private final EventSeatRepository seats;

    public CheckInService(TicketRepository tickets, CheckInRepository checkIns,
                          EventRepository events, EventSeatRepository seats) {
        this.tickets = tickets;
        this.checkIns = checkIns;
        this.events = events;
        this.seats = seats;
    }

    @Transactional
    public ScanResult scan(Long scannerUserId, ScanRequest req) {
        if (req == null || req.qrCode() == null || req.qrCode().isBlank()) {
            throw new AppException("VALIDATION_FAILED", "qrCode is required.", HttpStatus.BAD_REQUEST);
        }
        Ticket t = tickets.findByQrCode(req.qrCode())
                .orElseThrow(() -> new AppException("TICKET_NOT_FOUND", "Ticket not found.", HttpStatus.NOT_FOUND));

        if ("USED".equals(t.getStatus()) || checkIns.existsByTicketId(t.getId())) {
            throw new AppException("ALREADY_USED", "Ticket already checked in.", HttpStatus.CONFLICT);
        }
        if (!"VALID".equals(t.getStatus())) {
            throw new AppException("TICKET_NOT_VALID", "Ticket not in VALID state.", HttpStatus.CONFLICT);
        }

        CheckIn ci = CheckIn.builder()
                .ticketId(t.getId())
                .checkedInBy(scannerUserId)
                .status("OK")
                .deviceId(req.deviceId())
                .build();
        try {
            checkIns.save(ci);
        } catch (DataIntegrityViolationException dup) {
            throw new AppException("ALREADY_USED", "Ticket already checked in.", HttpStatus.CONFLICT);
        }

        t.setStatus("USED");
        tickets.save(t);

        Event ev = events.findById(t.getEventId()).orElse(null);
        EventSeat s = seats.findById(t.getEventSeatId()).orElse(null);
        return new ScanResult(
                "OK",
                t.getId(),
                t.getEventId(),
                ev != null ? ev.getTitle() : null,
                s != null ? s.getRowLabel() : null,
                s != null ? s.getSeatNumber() : null,
                s != null ? s.getSection() : null,
                ci.getCheckedInAt());
    }
}
