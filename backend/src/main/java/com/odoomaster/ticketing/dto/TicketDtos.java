package com.odoomaster.ticketing.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class TicketDtos {

    public record TicketView(
            Long id, String qrCode, String status,
            Long eventId, String eventTitle, String eventLocation,
            Instant eventStartTime,
            String rowLabel, String seatNumber, String section,
            BigDecimal price, Instant issuedAt) {}

    public record ScanRequest(String qrCode, String deviceId) {}

    public record ScanResult(String status, Long ticketId, Long eventId,
                             String eventTitle, String rowLabel, String seatNumber,
                             String section, Instant checkedInAt) {}
}
