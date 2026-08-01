package com.odoomaster.ticketing.ticketing;

import com.odoomaster.ticketing.ticketing.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.ticketing.TicketDtos.ScanResult;
import com.odoomaster.ticketing.ticketing.TicketDtos.TicketPage;
import com.odoomaster.ticketing.ticketing.TicketDtos.TicketView;
import com.odoomaster.ticketing.shared.security.CurrentUser;
import com.odoomaster.ticketing.ticketing.CheckInService;
import com.odoomaster.ticketing.ticketing.TicketService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for a user's tickets under {@code /v1/tickets}.
 */
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
    @PreAuthorize("hasAnyRole('SCANNER','ADMIN')")
    public ScanResult scan(@RequestBody ScanRequest req) {
        return checkInService.scan(current.require().userId(), req);
    }
}
