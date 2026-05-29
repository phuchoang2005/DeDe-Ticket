package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.TicketDtos.ScanHistoryView;
import com.odoomaster.ticketing.dto.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.dto.TicketDtos.ScanResult;
import com.odoomaster.ticketing.dto.TicketDtos.TicketPage;
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
    public Object list(@org.springframework.web.bind.annotation.RequestParam(required = false) Integer page,
                       @org.springframework.web.bind.annotation.RequestParam(required = false) Integer limit,
                       @org.springframework.web.bind.annotation.RequestParam(required = false) String status) {
        Long userId = current.require().userId();
        if (page == null && limit == null && status == null) {
            return service.listMine(userId);
        }
        return service.listMinePaged(userId,
                page == null ? 1 : page,
                limit == null ? 10 : limit,
                status);
    }

    @GetMapping("/{id}")
    public TicketView get(@PathVariable Long id) {
        return service.getMine(current.require().userId(), id);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.cancelMine(current.require().userId(), id);
    }

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('SCANNER','ADMIN','ORGANIZER')")
    public ScanResult scan(@RequestBody ScanRequest req) {
        return checkInService.scan(current.require().userId(), req);
    }

    @GetMapping("/scans")
    @PreAuthorize("hasAnyRole('SCANNER','ADMIN','ORGANIZER')")
    public List<ScanHistoryView> scans(@RequestParam(required = false) Integer limit) {
        var principal = current.require();
        // ADMIN/ORGANIZER see every scanner's history; a plain SCANNER is scoped
        // to their own check-ins.
        boolean fullAccess = principal.hasRole("ADMIN") || principal.hasRole("ORGANIZER");
        Long scannerScope = fullAccess ? null : principal.userId();
        return checkInService.history(scannerScope, limit == null ? 100 : limit);
    }
}
