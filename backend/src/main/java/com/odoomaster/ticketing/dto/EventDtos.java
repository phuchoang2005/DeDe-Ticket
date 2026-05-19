package com.odoomaster.ticketing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class EventDtos {

    public record EventSummary(
            Long id, String title, String location, String imageUrl,
            String category, String organizer,
            Instant startTime, Instant endTime, String status,
            BigDecimal priceFrom, Integer availableSeats, Integer totalSeats) {}

    public record EventPage(List<EventSummary> data, PageMeta page) {}

    public record PageMeta(int page, int limit, long total, boolean hasMore) {}

    public record EventDetail(
            Long id, String title, String description, String location, String imageUrl,
            String category, String organizer,
            Instant startTime, Instant endTime, String status,
            BigDecimal priceFrom, BigDecimal priceTo, Integer availableSeats, Integer totalSeats) {}

    public record SeatItem(Long id, String rowLabel, String seatNumber, String section,
                           BigDecimal price, String status, Instant lockedUntil) {}

    public record SeatMap(Long eventId, List<SeatItem> seats) {}
}
