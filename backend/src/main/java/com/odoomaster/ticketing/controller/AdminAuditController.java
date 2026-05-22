package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.domain.AuditLog;
import com.odoomaster.ticketing.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/v1/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditController {

    private final AuditLogRepository audits;

    public AdminAuditController(AuditLogRepository audits) {
        this.audits = audits;
    }

    public record AuditView(Long id, Long userId, String action, String entity,
                            Long entityId, String traceId, Instant createdAt) {}

    @GetMapping
    public List<AuditView> list(@RequestParam(required = false) String entity,
                                @RequestParam(required = false) Long entityId,
                                @RequestParam(required = false) Long userId,
                                @RequestParam(defaultValue = "0")  int page,
                                @RequestParam(defaultValue = "50") int size) {
        Pageable p = PageRequest.of(page, Math.min(size, 200));
        Page<AuditLog> rows;
        if (entity != null && entityId != null) {
            rows = audits.findByEntityAndEntityIdOrderByCreatedAtDesc(entity, entityId, p);
        } else if (entity != null) {
            rows = audits.findByEntityOrderByCreatedAtDesc(entity, p);
        } else if (userId != null) {
            rows = audits.findByUserIdOrderByCreatedAtDesc(userId, p);
        } else {
            rows = audits.findAll(p);
        }
        return rows.stream()
                .map(a -> new AuditView(a.getId(), a.getUserId(), a.getAction(),
                        a.getEntity(), a.getEntityId(), a.getTraceId(), a.getCreatedAt()))
                .toList();
    }
}
