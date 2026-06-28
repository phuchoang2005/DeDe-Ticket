package com.odoomaster.ticketing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
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
}
