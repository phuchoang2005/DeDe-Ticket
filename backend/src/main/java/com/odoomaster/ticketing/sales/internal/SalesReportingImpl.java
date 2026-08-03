package com.odoomaster.ticketing.sales.internal;

import com.odoomaster.ticketing.sales.OrderRepository;
import com.odoomaster.ticketing.sales.PaymentRepository;
import com.odoomaster.ticketing.sales.SalesReporting;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

/**
 * sales-owned implementation of {@link SalesReporting}. Wraps the order/payment repositories and maps
 * the raw {@code revenueByDay} tuples into the published {@link DailyRevenue} projection so callers
 * never touch the entities.
 */
@Service
@Transactional(readOnly = true)
public class SalesReportingImpl implements SalesReporting {

    private final OrderRepository orders;
    private final PaymentRepository payments;

    public SalesReportingImpl(OrderRepository orders, PaymentRepository payments) {
        this.orders = orders;
        this.payments = payments;
    }

    @Override
    public BigDecimal totalPaidRevenue() {
        return orders.sumPaidRevenue();
    }

    @Override
    public BigDecimal paidRevenueForEvent(Long eventId) {
        return orders.sumPaidRevenueForEvent(eventId);
    }

    @Override
    public List<DailyRevenue> revenueByDay(Instant from) {
        return orders.revenueByDay(from).stream()
                .map(r -> new DailyRevenue(
                        toLocalDate(r[0]),
                        r[1] == null ? BigDecimal.ZERO : new BigDecimal(r[1].toString()),
                        ((Number) r[2]).longValue()))
                .toList();
    }

    @Override
    public long countOrdersByStatus(String status) {
        return orders.countByStatus(status);
    }

    @Override
    public long countPaymentsByStatus(String status) {
        return payments.countByStatus(status);
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate ld) return ld;
        if (value instanceof Date d) return d.toLocalDate();
        if (value instanceof java.util.Date d) return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        return LocalDate.parse(value.toString());
    }
}
