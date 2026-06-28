package com.odoomaster.ticketing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
public class EventDtos {

    public record CategoryRef(Long id, String name) {}

    public record EventSummary(
            Long id, String title, String location, String imageUrl,
            List<CategoryRef> categories, String organizer,
            Instant startTime, Instant endTime, String status,
            BigDecimal priceFrom, Integer availableSeats, Integer totalSeats) {}

    public record EventPage(List<EventSummary> data, PageMeta page) {}

    public record PageMeta(int page, int limit, long total, boolean hasMore) {}

    public record EventDetail(
            Long id, String title, String description, String location, String imageUrl,
            List<CategoryRef> categories, String organizer,
            Instant startTime, Instant endTime, String status,
            BigDecimal priceFrom, BigDecimal priceTo, Integer availableSeats, Integer totalSeats) {}

    public record SeatItem(Long id, String rowLabel, String seatNumber, String section,
                           BigDecimal price, String status, Instant lockedUntil) {}

    public record SeatMap(Long eventId, List<SeatItem> seats) {}
}
