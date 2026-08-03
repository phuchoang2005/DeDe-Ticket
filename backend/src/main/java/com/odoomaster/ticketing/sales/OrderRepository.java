package com.odoomaster.ticketing.sales;

import com.odoomaster.ticketing.sales.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Spring Data JPA repository for the Order aggregate.
 */
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = 'PAID'")
    BigDecimal sumPaidRevenue();

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = 'PAID' AND o.paidAt >= :from")
    BigDecimal sumPaidRevenueSince(Instant from);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status = 'PAID' AND o.eventId = :eventId")
    BigDecimal sumPaidRevenueForEvent(Long eventId);

    @Query("SELECT FUNCTION('DATE', o.paidAt) AS d, " +
            "COALESCE(SUM(o.totalAmount), 0) AS revenue, " +
            "COUNT(o) AS cnt " +
            "FROM Order o " +
            "WHERE o.status = 'PAID' AND o.paidAt >= :from " +
            "GROUP BY FUNCTION('DATE', o.paidAt) " +
            "ORDER BY d ASC")
    List<Object[]> revenueByDay(Instant from);

    long countByStatus(String status);

    long countByEventIdAndStatusNotIn(Long eventId, java.util.Collection<String> excludedStatuses);

    List<Order> findByEventId(Long eventId);
}
