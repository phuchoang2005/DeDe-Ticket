package com.odoomaster.ticketing.analytics;

import com.odoomaster.ticketing.analytics.AnalyticsDtos.*;
import com.odoomaster.ticketing.catalog.EventCatalog;
import com.odoomaster.ticketing.catalog.EventCatalog.EventStats;
import com.odoomaster.ticketing.sales.SalesReporting;
import com.odoomaster.ticketing.sales.SalesReporting.DailyRevenue;
import com.odoomaster.ticketing.ticketing.TicketingReporting;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Builds the admin analytics report — revenue trends, payment funnel, category breakdown,
 * top events, and operational/security signals over a configurable window.
 *
 * <p>Reads exclusively through published module APIs — catalog's {@link EventCatalog} (events + seat
 * aggregates), sales' {@link SalesReporting} (revenue, order/payment counts), and ticketing's
 * {@link TicketingReporting} (ticket counts) — so this module never touches another module's entities
 * or repositories.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final EventCatalog events;
    private final SalesReporting sales;
    private final TicketingReporting ticketing;

    public AnalyticsService(EventCatalog events, SalesReporting sales, TicketingReporting ticketing) {
        this.events = events;
        this.sales = sales;
        this.ticketing = ticketing;
    }

    public AnalyticsReport report(int days) {
        if (days <= 0) days = 14;
        Instant from = Instant.now().minus(days, ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS);
        return new AnalyticsReport(
                kpis(),
                revenueByDay(from, days),
                topEvents(8),
                paymentFunnel(),
                categoryBreakdown(),
                securitySignals());
    }

    private List<CategoryBreakdownRow> categoryBreakdown() {
        List<EventStats> all = events.listForReporting();
        Map<String, long[]> buckets = new LinkedHashMap<>();
        Map<String, BigDecimal> rev = new HashMap<>();
        for (EventStats e : all) {
            Set<String> names = e.categoryNames();
            if (names.isEmpty()) names = Set.of("Khác");
            long sold = ticketing.countTicketsForEvent(e.id());
            BigDecimal r = sales.paidRevenueForEvent(e.id());
            for (String cat : names) {
                buckets.computeIfAbsent(cat, k -> new long[]{0L, 0L});
                buckets.get(cat)[0] += 1;
                buckets.get(cat)[1] += sold;
                rev.merge(cat, r, BigDecimal::add);
            }
        }
        return buckets.entrySet().stream()
                .map(en -> new CategoryBreakdownRow(en.getKey(), en.getValue()[0], en.getValue()[1],
                        rev.getOrDefault(en.getKey(), BigDecimal.ZERO)))
                .sorted(Comparator.comparing(CategoryBreakdownRow::eventCount).reversed())
                .toList();
    }

    private List<SecuritySignal> securitySignals() {
        long paymentFailed = sales.countPaymentsByStatus("FAILED");
        long ordersExpired = sales.countOrdersByStatus("EXPIRED");
        long ordersCancelled = sales.countOrdersByStatus("CANCELLED");
        long refundPending = sales.countOrdersByStatus("REFUND_PENDING");
        long ticketsCancelled = ticketing.countTicketsByStatus("CANCELLED");
        return List.of(
                new SecuritySignal("PAYMENT_FAILED", "Thanh toán thất bại", paymentFailed,
                        paymentFailed > 0 ? "warn" : "ok"),
                new SecuritySignal("SEAT_LOCK_EXPIRED", "Khoá ghế hết hạn", ordersExpired,
                        ordersExpired > 50 ? "warn" : "ok"),
                new SecuritySignal("ORDER_CANCELLED", "Đơn huỷ", ordersCancelled,
                        ordersCancelled > 20 ? "warn" : "ok"),
                new SecuritySignal("REFUND_PENDING", "Đang chờ hoàn tiền", refundPending,
                        refundPending > 0 ? "danger" : "ok"),
                new SecuritySignal("TICKET_INVALIDATED", "Vé bị vô hiệu", ticketsCancelled,
                        ticketsCancelled > 0 ? "danger" : "ok"));
    }

    private KpiSummary kpis() {
        BigDecimal revenue = sales.totalPaidRevenue();
        long ticketsSold = ticketing.totalTickets();
        long totalSeats = events.countAllSeats();
        long soldSeats = events.countSoldSeats();
        double fillRate = totalSeats == 0 ? 0 : (double) soldSeats / totalSeats;

        long success = sales.countPaymentsByStatus("SUCCEEDED");
        long failed = sales.countPaymentsByStatus("FAILED");
        long paymentTotal = success + failed;
        double successRate = paymentTotal == 0 ? 1.0 : (double) success / paymentTotal;

        long checkin = ticketing.countTicketsByStatus("USED");
        double checkinRate = ticketsSold == 0 ? 0 : (double) checkin / ticketsSold;

        long totalEvents = events.countEvents();
        long published = events.countEventsByStatus("PUBLISHED");

        return new KpiSummary(revenue, ticketsSold, totalSeats,
                round(fillRate, 4), round(successRate, 4),
                checkin, round(checkinRate, 4),
                totalEvents, published);
    }

    private List<RevenuePoint> revenueByDay(Instant from, int days) {
        Map<LocalDate, RevenuePoint> bucket = new LinkedHashMap<>();
        LocalDate startDay = from.atZone(ZoneOffset.UTC).toLocalDate();
        for (int i = 0; i < days; i++) {
            LocalDate d = startDay.plusDays(i);
            bucket.put(d, new RevenuePoint(d, BigDecimal.ZERO, 0L));
        }
        for (DailyRevenue r : sales.revenueByDay(from)) {
            bucket.put(r.date(), new RevenuePoint(r.date(), r.revenue(), r.orderCount()));
        }
        return new ArrayList<>(bucket.values());
    }

    private List<EventLeaderboardRow> topEvents(int limit) {
        List<EventStats> all = events.listForReporting();
        List<EventLeaderboardRow> rows = new ArrayList<>();
        for (EventStats e : all) {
            long sold = ticketing.countTicketsForEvent(e.id());
            BigDecimal rev = sales.paidRevenueForEvent(e.id());
            long used = ticketing.countTicketsForEventByStatus(e.id(), "USED");
            double rate = sold == 0 ? 0 : (double) used / sold;
            String catLabel = String.join(", ", new TreeSet<>(e.categoryNames()));
            rows.add(new EventLeaderboardRow(
                    e.id(), e.title(), catLabel, e.status(),
                    sold, rev, round(rate, 4)));
        }
        rows.sort(Comparator.comparing(EventLeaderboardRow::revenue).reversed());
        return rows.stream().limit(limit).toList();
    }

    private PaymentFunnel paymentFunnel() {
        return new PaymentFunnel(
                sales.countPaymentsByStatus("SUCCEEDED"),
                sales.countPaymentsByStatus("PENDING"),
                sales.countPaymentsByStatus("FAILED"),
                sales.countOrdersByStatus("REFUND_PENDING"),
                sales.countOrdersByStatus("REFUNDED"));
    }

    private static double round(double v, int scale) {
        return BigDecimal.valueOf(v).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }
}
