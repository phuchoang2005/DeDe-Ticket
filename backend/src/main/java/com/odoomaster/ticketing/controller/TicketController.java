package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.dto.TicketDtos.ScanResult;
import com.odoomaster.ticketing.dto.TicketDtos.TicketView;
import com.odoomaster.ticketing.security.CurrentUser;
import com.odoomaster.ticketing.service.CheckInService;
import com.odoomaster.ticketing.service.TicketService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/tickets")
public class TicketController {

    private final TicketService service;
    private final CheckInService checkInService;
    private final CurrentUser current;

    public TicketController(TicketService service, CheckInService checkInService, CurrentUser current) {
        this.service = service;
        this.checkInService = checkInService;
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

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('SCANNER','ADMIN')")
    public ScanResult scan(@RequestBody ScanRequest req) {
        return checkInService.scan(current.require().userId(), req);
    }
}
