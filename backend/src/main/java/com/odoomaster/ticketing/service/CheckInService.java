package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.CheckIn;
import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.domain.Ticket;
import com.odoomaster.ticketing.dto.TicketDtos.ScanHistoryView;
import com.odoomaster.ticketing.dto.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.dto.TicketDtos.ScanResult;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.CheckInRepository;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    // scannerId == null means full access (ADMIN/ORGANIZER); a non-null value
    // scopes the history to that scanner's own check-ins.
    @Transactional(readOnly = true)
    public List<ScanHistoryView> history(Long scannerId, int limit) {
        int capped = Math.min(Math.max(limit, 1), 500);
        return checkIns.findHistory(scannerId, PageRequest.of(0, capped)).stream()
                .map(r -> new ScanHistoryView(
                        r.getId(), r.getTicketId(), r.getCheckedInAt(), r.getStatus(), r.getDeviceId(),
                        r.getEventId(), r.getEventTitle(),
                        r.getSection(), r.getRowLabel(), r.getSeatNumber(),
                        r.getScannedById(), r.getScannedByName(), r.getScannedByEmail()))
                .toList();
    }
}
