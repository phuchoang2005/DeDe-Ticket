package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.analytics.AnalyticsDtos.AnalyticsReport;
import com.odoomaster.ticketing.analytics.AnalyticsDtos.CategoryBreakdownRow;
import com.odoomaster.ticketing.analytics.AnalyticsDtos.EventLeaderboardRow;
import com.odoomaster.ticketing.analytics.AnalyticsDtos.SecuritySignal;
import com.odoomaster.ticketing.analytics.AnalyticsService;
import com.odoomaster.ticketing.catalog.EventCatalog;
import com.odoomaster.ticketing.catalog.EventCatalog.EventStats;
import com.odoomaster.ticketing.sales.SalesReporting;
import com.odoomaster.ticketing.ticketing.TicketingReporting;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Composition test for the Sprint 3 rewrite of {@link AnalyticsService}: it now assembles the report
 * purely from the published {@link EventCatalog} / {@link SalesReporting} / {@link TicketingReporting}
 * APIs. Verifies each figure is sourced from the right API and the leaderboard/category aggregation.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalyticsServiceTest {

    @Mock EventCatalog events;
    @Mock SalesReporting sales;
    @Mock TicketingReporting ticketing;

    AnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(events, sales, ticketing);

        when(events.listForReporting()).thenReturn(List.of(
                new EventStats(1L, "Concert A", "PUBLISHED", Set.of("Music")),
                new EventStats(2L, "Talk B", "PUBLISHED", Set.of("Talk"))));
        when(events.countAllSeats()).thenReturn(100L);
        when(events.countSoldSeats()).thenReturn(15L);
        when(events.countEvents()).thenReturn(2L);
        when(events.countEventsByStatus("PUBLISHED")).thenReturn(2L);

        when(sales.totalPaidRevenue()).thenReturn(new BigDecimal("3000"));
        when(sales.revenueByDay(any())).thenReturn(List.of());
        when(sales.paidRevenueForEvent(1L)).thenReturn(new BigDecimal("1000"));
        when(sales.paidRevenueForEvent(2L)).thenReturn(new BigDecimal("2000"));
        when(sales.countPaymentsByStatus("SUCCEEDED")).thenReturn(9L);
        when(sales.countPaymentsByStatus("PENDING")).thenReturn(2L);
        when(sales.countPaymentsByStatus("FAILED")).thenReturn(1L);
        when(sales.countOrdersByStatus(any())).thenReturn(0L);

        when(ticketing.totalTickets()).thenReturn(15L);
        when(ticketing.countTicketsForEvent(1L)).thenReturn(10L);
        when(ticketing.countTicketsForEvent(2L)).thenReturn(5L);
        when(ticketing.countTicketsForEventByStatus(1L, "USED")).thenReturn(4L);
        when(ticketing.countTicketsForEventByStatus(2L, "USED")).thenReturn(1L);
        when(ticketing.countTicketsByStatus("USED")).thenReturn(5L);
        when(ticketing.countTicketsByStatus("CANCELLED")).thenReturn(0L);
    }

    @Test
    void report_kpis_sourceEachFigureFromTheRightApi() {
        var kpis = service.report(14).kpis();

        assertThat(kpis.totalRevenue()).isEqualByComparingTo("3000"); // SalesReporting
        assertThat(kpis.ticketsSold()).isEqualTo(15L);                // TicketingReporting
        assertThat(kpis.totalSeats()).isEqualTo(100L);                // EventCatalog
        assertThat(kpis.capacityFillRate()).isEqualTo(0.15);          // 15 / 100
        assertThat(kpis.paymentSuccessRate()).isEqualTo(0.9);         // 9 / (9+1)
        assertThat(kpis.publishedEvents()).isEqualTo(2L);
    }

    @Test
    void report_topEvents_orderedByRevenueDesc() {
        List<EventLeaderboardRow> top = service.report(14).topEvents();

        assertThat(top).extracting(EventLeaderboardRow::eventId).containsExactly(2L, 1L);
        assertThat(top.get(0).revenue()).isEqualByComparingTo("2000");
        assertThat(top.get(0).category()).isEqualTo("Talk");
    }

    @Test
    void report_categoryBreakdown_groupsPerCategory() {
        List<CategoryBreakdownRow> rows = service.report(14).categoryBreakdown();

        assertThat(rows).extracting(CategoryBreakdownRow::category)
                .containsExactlyInAnyOrder("Music", "Talk");
        assertThat(rows).allSatisfy(r -> assertThat(r.eventCount()).isEqualTo(1L));
    }

    @Test
    void report_securitySignals_flagFailedPaymentsAsWarn() {
        AnalyticsReport report = service.report(14);

        SecuritySignal paymentFailed = report.securitySignals().stream()
                .filter(s -> "PAYMENT_FAILED".equals(s.code())).findFirst().orElseThrow();
        assertThat(paymentFailed.count()).isEqualTo(1L);
        assertThat(paymentFailed.severity()).isEqualTo("warn");
    }
}
