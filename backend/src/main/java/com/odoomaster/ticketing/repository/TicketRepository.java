package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByUserIdOrderByIssuedAtDesc(Long userId);
    Optional<Ticket> findByIdAndUserId(Long id, Long userId);
    Optional<Ticket> findByQrCode(String qrCode);

    long countByEventId(Long eventId);
    long countByEventIdAndStatus(Long eventId, String status);
    long countByStatus(String status);
    List<Ticket> findByEventId(Long eventId);
}
