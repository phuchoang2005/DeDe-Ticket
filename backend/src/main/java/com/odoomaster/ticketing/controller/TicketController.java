package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.TicketDtos.TicketView;
import com.odoomaster.ticketing.security.CurrentUser;
import com.odoomaster.ticketing.service.TicketService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/tickets")
public class TicketController {

    private final TicketService service;
    private final CurrentUser current;

    public TicketController(TicketService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }

    @GetMapping
    public List<TicketView> list() {
        return service.listMine(current.require().userId());
    }

    @GetMapping("/{id}")
    public TicketView get(@PathVariable Long id) {
        return service.getMine(current.require().userId(), id);
    }
}
