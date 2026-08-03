package com.odoomaster.ticketing.audit.internal;

import com.odoomaster.ticketing.audit.internal.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for the AuditLog aggregate.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityOrderByCreatedAtDesc(String entity, Pageable pageable);
    Page<AuditLog> findByEntityAndEntityIdOrderByCreatedAtDesc(String entity, Long entityId, Pageable pageable);
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
