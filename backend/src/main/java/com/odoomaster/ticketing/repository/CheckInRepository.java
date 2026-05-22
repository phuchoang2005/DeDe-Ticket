package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    Optional<CheckIn> findByTicketId(Long ticketId);
    boolean existsByTicketId(Long ticketId);
    long countByTicketIdIn(java.util.List<Long> ticketIds);
}
