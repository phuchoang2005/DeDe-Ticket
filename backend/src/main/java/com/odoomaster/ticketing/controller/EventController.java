package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.EventDtos.*;
import com.odoomaster.ticketing.service.EventService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/events")
public class EventController {

    private final EventService events;

    public EventController(EventService events) {
        this.events = events;
    }

    @GetMapping
    public EventPage list(@RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "12") int limit,
                          @RequestParam(required = false) String category,
                          @RequestParam(required = false) String q) {
        return events.listPaged(page, limit, category, q);
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
