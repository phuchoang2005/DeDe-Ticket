package com.odoomaster.ticketing.ticketing.internal;

import com.odoomaster.ticketing.ticketing.internal.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Spring Data JPA repository for the CheckIn aggregate.
 */
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    Optional<CheckIn> findByTicketId(Long ticketId);
    boolean existsByTicketId(Long ticketId);
    long countByTicketIdIn(java.util.List<Long> ticketIds);
    void deleteByTicketIdIn(java.util.List<Long> ticketIds);
}
