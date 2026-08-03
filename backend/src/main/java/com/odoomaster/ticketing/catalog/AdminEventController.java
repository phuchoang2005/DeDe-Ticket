package com.odoomaster.ticketing.catalog;

import com.odoomaster.ticketing.catalog.AdminDtos.*;
import com.odoomaster.ticketing.catalog.AdminEventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for admin/organizer event CRUD and lifecycle under {@code /v1/admin/events}.
 */
@RestController
@RequestMapping("/v1/admin/events")
public class AdminEventController {

    private final AdminEventService service;

    public AdminEventController(AdminEventService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminEventRow> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public AdminEventDetail detail(@PathVariable Long id) {
        return service.detail(id);
    }

    @PostMapping
    public AdminEventDetail create(@Valid @RequestBody AdminEventUpsertRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public AdminEventDetail update(@PathVariable Long id, @Valid @RequestBody AdminEventUpsertRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/status")
    public AdminEventDetail changeStatus(@PathVariable Long id, @Valid @RequestBody StatusChangeRequest req) {
        return service.changeStatus(id, req.status());
    }

    @PostMapping("/{id}/sections")
    public AdminEventDetail addSection(@PathVariable Long id, @Valid @RequestBody SectionUpsertRequest req) {
        return service.addSection(id, req);
    }

    @PutMapping("/{id}/sections/{section}")
    public AdminEventDetail updateSection(@PathVariable Long id, @PathVariable String section,
                                          @Valid @RequestBody SectionUpdateRequest req) {
        return service.updateSection(id, section, req);
    }

    @DeleteMapping("/{id}/sections/{section}")
    public AdminEventDetail deleteSection(@PathVariable Long id, @PathVariable String section) {
        return service.deleteSection(id, section);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
