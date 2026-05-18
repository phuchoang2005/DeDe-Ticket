package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.dto.AnalyticsDtos.*;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.OrderRepository;
import com.odoomaster.ticketing.repository.PaymentRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final EventRepository events;
    private final EventSeatRepository seats;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final TicketRepository tickets;

    public AnalyticsService(EventRepository events, EventSeatRepository seats,
                            OrderRepository orders, PaymentRepository payments,
                            TicketRepository tickets) {
        this.events = events;
        this.seats = seats;
        this.orders = orders;
        this.payments = payments;
        this.tickets = tickets;
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
        List<Event> all = events.findAllForAdmin();
        Map<String, long[]> buckets = new LinkedHashMap<>();
        Map<String, BigDecimal> rev = new HashMap<>();
        for (Event e : all) {
            String cat = e.getCategory() == null ? "Khác" : e.getCategory();
            buckets.computeIfAbsent(cat, k -> new long[]{0L, 0L});
            buckets.get(cat)[0] += 1;
            buckets.get(cat)[1] += tickets.countByEventId(e.getId());
            rev.merge(cat, orders.sumPaidRevenueForEvent(e.getId()), BigDecimal::add);
        }
        return buckets.entrySet().stream()
                .map(en -> new CategoryBreakdownRow(en.getKey(), en.getValue()[0], en.getValue()[1],
                        rev.getOrDefault(en.getKey(), BigDecimal.ZERO)))
                .sorted(Comparator.comparing(CategoryBreakdownRow::eventCount).reversed())
                .toList();
    }

    private List<SecuritySignal> securitySignals() {
        long paymentFailed = payments.countByStatus("FAILED");
        long ordersExpired = orders.countByStatus("EXPIRED");
        long ordersCancelled = orders.countByStatus("CANCELLED");
        long refundPending = orders.countByStatus("REFUND_PENDING");
        long ticketsCancelled = tickets.countByStatus("CANCELLED");
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
        BigDecimal revenue = orders.sumPaidRevenue();
        long ticketsSold = tickets.count();
        long totalSeats = seats.countAll();
        long soldSeats = seats.countAllSold();
        double fillRate = totalSeats == 0 ? 0 : (double) soldSeats / totalSeats;

        long success = payments.countByStatus("SUCCEEDED");
        long failed = payments.countByStatus("FAILED");
        long paymentTotal = success + failed;
        double successRate = paymentTotal == 0 ? 1.0 : (double) success / paymentTotal;

        long checkin = tickets.countByStatus("USED");
        double checkinRate = ticketsSold == 0 ? 0 : (double) checkin / ticketsSold;

        long totalEvents = events.count();
        long published = events.findAllByStatusOrderByStartTimeAsc("PUBLISHED").size();

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
        List<Object[]> rows = orders.revenueByDay(from);
        for (Object[] r : rows) {
            LocalDate d = toLocalDate(r[0]);
            BigDecimal rev = r[1] == null ? BigDecimal.ZERO : new BigDecimal(r[1].toString());
            Long cnt = ((Number) r[2]).longValue();
            bucket.put(d, new RevenuePoint(d, rev, cnt));
        }
        return new ArrayList<>(bucket.values());
    }

    private List<EventLeaderboardRow> topEvents(int limit) {
        List<Event> all = events.findAllForAdmin();
        List<EventLeaderboardRow> rows = new ArrayList<>();
        for (Event e : all) {
            long sold = tickets.countByEventId(e.getId());
            BigDecimal rev = orders.sumPaidRevenueForEvent(e.getId());
            long used = tickets.countByEventIdAndStatus(e.getId(), "USED");
            double rate = sold == 0 ? 0 : (double) used / sold;
            rows.add(new EventLeaderboardRow(
                    e.getId(), e.getTitle(), e.getCategory(), e.getStatus(),
                    sold, rev, round(rate, 4)));
        }
        rows.sort(Comparator.comparing(EventLeaderboardRow::revenue).reversed());
        return rows.stream().limit(limit).toList();
    }

    private PaymentFunnel paymentFunnel() {
        return new PaymentFunnel(
                payments.countByStatus("SUCCEEDED"),
                payments.countByStatus("PENDING"),
                payments.countByStatus("FAILED"),
                orders.countByStatus("REFUND_PENDING"),
                orders.countByStatus("REFUNDED"));
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate ld) return ld;
        if (value instanceof Date d) return d.toLocalDate();
        if (value instanceof java.util.Date d) return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        return LocalDate.parse(value.toString());
    }

    private static double round(double v, int scale) {
        return BigDecimal.valueOf(v).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }
}
