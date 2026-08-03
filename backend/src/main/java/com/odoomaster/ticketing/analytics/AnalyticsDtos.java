package com.odoomaster.ticketing.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
public class AnalyticsDtos {

    public record KpiSummary(
            BigDecimal totalRevenue,
            Long ticketsSold,
            Long totalSeats,
            Double capacityFillRate,
            Double paymentSuccessRate,
            Long checkinCount,
            Double checkinRate,
            Long totalEvents,
            Long publishedEvents) {}

    public record RevenuePoint(LocalDate date, BigDecimal revenue, Long orderCount) {}

    public record EventLeaderboardRow(
            Long eventId, String title, String category, String status,
            Long ticketsSold, BigDecimal revenue, Double checkinRate) {}

    public record PaymentFunnel(
            Long succeeded,
            Long pending,
            Long failed,
            Long refundPending,
            Long refunded) {}

    public record CategoryBreakdownRow(
            String category, Long eventCount, Long ticketsSold, BigDecimal revenue) {}

    public record SecuritySignal(
            String code, String label, Long count, String severity) {}

    public record AnalyticsReport(
            KpiSummary kpis,
            List<RevenuePoint> revenueByDay,
            List<EventLeaderboardRow> topEvents,
            PaymentFunnel paymentFunnel,
            List<CategoryBreakdownRow> categoryBreakdown,
            List<SecuritySignal> securitySignals) {}
}
