package com.odoomaster.ticketing.catalog.internal;

import com.odoomaster.ticketing.catalog.internal.Event;
import com.odoomaster.ticketing.catalog.EventCatalog;
import com.odoomaster.ticketing.catalog.internal.EventRepository;
import com.odoomaster.ticketing.catalog.internal.EventSeatRepository;
import com.odoomaster.ticketing.shared.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Catalog-owned implementation of {@link EventCatalog}. Reads the {@code Event} aggregate and maps
 * it to the published {@link EventSummary}/{@link EventStats} projections so callers never touch the
 * entity, and exposes the event/seat count aggregates {@code analytics} needs.
 */
@Service
@Transactional(readOnly = true)
public class EventCatalogImpl implements EventCatalog {

    private final EventRepository events;
    private final EventSeatRepository seats;

    public EventCatalogImpl(EventRepository events, EventSeatRepository seats) {
        this.events = events;
        this.seats = seats;
    }

    @Override
    public EventSummary requireOnSale(Long eventId) {
        Event event = events.findById(eventId)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        if (!"PUBLISHED".equals(event.getStatus())) {
            throw new AppException("EVENT_NOT_PUBLISHED",
                    "Event is not currently on sale.", HttpStatus.CONFLICT);
        }
        return toSummary(event);
    }

    @Override
    public Optional<EventSummary> find(Long eventId) {
        return events.findById(eventId).map(EventCatalogImpl::toSummary);
    }

    @Override
    public List<EventStats> listForReporting() {
        return events.findAllForAdmin().stream().map(EventCatalogImpl::toStats).toList();
    }

    @Override
    public long countEvents() {
        return events.count();
    }

    @Override
    public long countEventsByStatus(String status) {
        return events.countByStatus(status);
    }

    @Override
    public long countAllSeats() {
        return seats.countAll();
    }

    @Override
    public long countSoldSeats() {
        return seats.countAllSold();
    }

    private static EventSummary toSummary(Event e) {
        return new EventSummary(e.getId(), e.getTitle(), e.getLocation(),
                e.getStartTime(), e.getEndTime(), e.getStatus());
    }

    private static EventStats toStats(Event e) {
        return new EventStats(e.getId(), e.getTitle(), e.getStatus(), e.getCategoryNames());
    }
}
