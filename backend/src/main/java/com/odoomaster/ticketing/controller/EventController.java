package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.EventDtos.*;
import com.odoomaster.ticketing.service.EventService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/events")
public class EventController {

    private final EventService events;

    public EventController(EventService events) {
        this.events = events;
    }

    @GetMapping
    public List<EventSummary> list() {
        return events.list();
    }

    @GetMapping("/{id}")
    public EventDetail detail(@PathVariable Long id) {
        return events.detail(id);
    }

    @GetMapping("/{id}/seats")
    public SeatMap seats(@PathVariable Long id) {
        return events.seats(id);
    }
}
