package com.odoomaster.ticketing.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
public class OrderDtos {

    public record CreateOrderRequest(
            @NotNull Long eventId,
            @NotEmpty List<Long> seatIds) {}

    public record PayRequest(
            @NotNull @Pattern(regexp = "MOMO|VNPAY|MOCK") String method) {}

    public record OrderItemView(Long id, Long eventSeatId, String rowLabel, String seatNumber, String section, BigDecimal price) {}

    public record OrderView(Long id, Long eventId, String eventTitle, String status, String paymentMethod,
                            BigDecimal totalAmount, Instant createdAt, Instant paidAt, List<OrderItemView> items) {}
}
