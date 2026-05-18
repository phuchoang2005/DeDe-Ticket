package com.odoomaster.ticketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class AdminDtos {

    public record AdminEventRow(
            Long id, String title, String location, String category, String organizer,
            String status, Instant startTime, Instant endTime, Instant createdAt,
            Integer totalSeats, Integer availableSeats, Integer soldSeats,
            BigDecimal revenue) {}

    public record AdminEventDetail(
            Long id, String title, String description, String location, String imageUrl,
            String category, String organizer,
            Instant startTime, Instant endTime, String status,
            Integer totalSeats, Integer availableSeats, Integer soldSeats,
            BigDecimal revenue,
            List<SectionSummary> sections) {}

    public record SectionSummary(
            String name, BigDecimal price, Integer rowCount, Integer seatCount,
            Integer availableCount, Integer soldCount) {}

    public record AdminEventUpsertRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 4000) String description,
            @Size(max = 255) String location,
            @Size(max = 32) String category,
            @Size(max = 255) String organizer,
            @Size(max = 500) String imageUrl,
            @NotNull Instant startTime,
            @NotNull Instant endTime) {}

    public record StatusChangeRequest(@NotBlank String status) {}

    public record SectionUpsertRequest(
            @NotBlank @Size(max = 32) String name,
            @NotNull @Positive BigDecimal price,
            @NotNull @Positive Integer rows,
            @NotNull @Positive Integer seatsPerRow) {}

    public record SectionUpdateRequest(
            @NotBlank @Size(max = 32) String name,
            @NotNull @Positive BigDecimal price) {}
}
