package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.catalog.Event;
import com.odoomaster.ticketing.catalog.EventCatalog;
import com.odoomaster.ticketing.catalog.EventCatalog.EventSummary;
import com.odoomaster.ticketing.catalog.EventRepository;
import com.odoomaster.ticketing.catalog.EventSeatRepository;
import com.odoomaster.ticketing.catalog.internal.EventCatalogImpl;
import com.odoomaster.ticketing.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Reliability tests for {@link EventCatalogImpl} — the "event on sale" guard that moved out of
 * {@code OrderService} in Sprint 2, plus the {@link EventSummary} projection consumers now read.
 */
@ExtendWith(MockitoExtension.class)
class EventCatalogReliabilityTest {

    @Mock EventRepository events;
    @Mock EventSeatRepository seats;

    EventCatalog catalog;

    @BeforeEach
    void setUp() {
        catalog = new EventCatalogImpl(events, seats);
    }

    @Test
    void requireOnSale_givenPublishedEvent_returnsSummary() {
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));

        EventSummary summary = catalog.requireOnSale(1L);

        assertThat(summary.id()).isEqualTo(1L);
        assertThat(summary.title()).isEqualTo("Concert");
        assertThat(summary.location()).isEqualTo("Main Hall");
        assertThat(summary.status()).isEqualTo("PUBLISHED");
    }

    @Test
    void requireOnSale_givenMissingEvent_throwsNotFound() {
        when(events.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalog.requireOnSale(1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Event not found")
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "CANCELLED", "ARCHIVED"})
    void requireOnSale_givenEventNotPublished_rejectsSale(String status) {
        when(events.findById(1L)).thenReturn(Optional.of(event(status)));

        assertThatThrownBy(() -> catalog.requireOnSale(1L))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not currently on sale")
                .extracting("status").isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void find_givenExistingEvent_returnsSummary() {
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));

        assertThat(catalog.find(1L)).get()
                .extracting(EventSummary::title).isEqualTo("Concert");
    }

    @Test
    void find_givenMissingEvent_returnsEmpty() {
        when(events.findById(9L)).thenReturn(Optional.empty());

        assertThat(catalog.find(9L)).isEmpty();
    }

    private static Event event(String status) {
        Event e = new Event();
        e.setId(1L);
        e.setTitle("Concert");
        e.setLocation("Main Hall");
        e.setStartTime(Instant.now().plusSeconds(3600));
        e.setEndTime(Instant.now().plusSeconds(7200));
        e.setStatus(status);
        return e;
    }
}
