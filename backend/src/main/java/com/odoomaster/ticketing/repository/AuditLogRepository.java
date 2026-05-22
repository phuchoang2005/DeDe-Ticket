package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityOrderByCreatedAtDesc(String entity, Pageable pageable);
    Page<AuditLog> findByEntityAndEntityIdOrderByCreatedAtDesc(String entity, Long entityId, Pageable pageable);
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
