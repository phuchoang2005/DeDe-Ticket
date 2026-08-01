package com.odoomaster.ticketing.catalog.internal;

import com.odoomaster.ticketing.catalog.Event;
import com.odoomaster.ticketing.catalog.EventCatalog;
import com.odoomaster.ticketing.catalog.EventRepository;
import com.odoomaster.ticketing.shared.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Catalog-owned implementation of {@link EventCatalog}. Reads the {@code Event} aggregate and maps
 * it to the published {@link EventSummary} projection so callers never touch the entity.
 */
@Service
@Transactional(readOnly = true)
public class EventCatalogImpl implements EventCatalog {

    private final EventRepository events;

    public EventCatalogImpl(EventRepository events) {
        this.events = events;
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

    private static EventSummary toSummary(Event e) {
        return new EventSummary(e.getId(), e.getTitle(), e.getLocation(),
                e.getStartTime(), e.getEndTime(), e.getStatus());
    }
}
