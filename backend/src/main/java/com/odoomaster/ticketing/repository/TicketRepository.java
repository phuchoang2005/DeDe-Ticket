package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the Ticket aggregate.
 */
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByUserIdOrderByIssuedAtDesc(Long userId);
    Page<Ticket> findByUserIdOrderByIssuedAtDesc(Long userId, Pageable pageable);
    Page<Ticket> findByUserIdAndStatusOrderByIssuedAtDesc(Long userId, String status, Pageable pageable);
    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, String status);
    Optional<Ticket> findByIdAndUserId(Long id, Long userId);
    Optional<Ticket> findByQrCode(String qrCode);

    long countByEventId(Long eventId);
    long countByEventIdAndStatus(Long eventId, String status);
    long countByStatus(String status);
    List<Ticket> findByEventId(Long eventId);
}
