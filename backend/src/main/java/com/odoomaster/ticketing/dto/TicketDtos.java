package com.odoomaster.ticketing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class TicketDtos {

    public record TicketView(
            Long id, String qrCode, String status,
            Long eventId, String eventTitle, String eventLocation,
            Instant eventStartTime,
            String rowLabel, String seatNumber, String section,
            BigDecimal price, Instant issuedAt) {}

    public record TicketPageMeta(int page, int limit, long total, boolean hasMore) {}

    public record TicketPage(
            List<TicketView> data,
            TicketPageMeta page,
            Map<String, Long> counts) {}

    public record ScanRequest(String qrCode, String deviceId) {}

    public record ScanResult(String status, Long ticketId, Long eventId,
                             String eventTitle, String rowLabel, String seatNumber,
                             String section, Instant checkedInAt) {}

    // One row of check-in history: who scanned which ticket, on what device, when.
    public record ScanHistoryView(
            Long id, Long ticketId, Instant checkedInAt, String status, String deviceId,
            Long eventId, String eventTitle,
            String section, String rowLabel, String seatNumber,
            Long scannedById, String scannedByName, String scannedByEmail) {}
}
