package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.dto.EventDtos.*;
import com.odoomaster.ticketing.config.CacheConfig;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository events;
    private final EventSeatRepository seats;

    public EventService(EventRepository events, EventSeatRepository seats) {
        this.events = events;
        this.seats = seats;
    }

    @Cacheable(CacheConfig.EVENTS_LIST)
    public List<EventSummary> list() {
        return events.findAllByStatusOrderByStartTimeAsc("PUBLISHED").stream()
                .map(e -> {
                    var s = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(e.getId());
                    BigDecimal min = s.stream().map(EventSeat::getPrice).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
                    int avail = (int) s.stream().filter(x -> "AVAILABLE".equals(x.getStatus())).count();
                    return new EventSummary(e.getId(), e.getTitle(), e.getLocation(), e.getImageUrl(),
                            e.getCategory(), e.getOrganizer(),
                            e.getStartTime(), e.getEndTime(), e.getStatus(), min, avail, s.size());
                })
                .toList();
    }

    @Cacheable(value = CacheConfig.EVENT_DETAIL, key = "#id")
    public EventDetail detail(Long id) {
        Event e = events.findById(id)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        var s = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(e.getId());
        BigDecimal min = s.stream().map(EventSeat::getPrice).min(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal max = s.stream().map(EventSeat::getPrice).max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        int avail = (int) s.stream().filter(x -> "AVAILABLE".equals(x.getStatus())).count();
        return new EventDetail(e.getId(), e.getTitle(), e.getDescription(), e.getLocation(), e.getImageUrl(),
                e.getCategory(), e.getOrganizer(),
                e.getStartTime(), e.getEndTime(), e.getStatus(), min, max, avail, s.size());
    }

    @Cacheable(value = CacheConfig.EVENT_SEATS, key = "#eventId")
    public SeatMap seats(Long eventId) {
        if (!events.existsById(eventId)) {
            throw new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND);
        }
        var list = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(eventId).stream()
                .map(s -> new SeatItem(s.getId(), s.getRowLabel(), s.getSeatNumber(), s.getSection(), s.getPrice(), s.getStatus()))
                .toList();
        return new SeatMap(eventId, list);
    }
}
