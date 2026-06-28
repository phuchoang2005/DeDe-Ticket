package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the TicketType aggregate.
 */
public interface TicketTypeRepository extends JpaRepository<TicketType, Long> {
    List<TicketType> findByEventIdOrderByPriceAsc(Long eventId);
    Optional<TicketType> findByEventIdAndName(Long eventId, String name);
    Optional<TicketType> findByEventIdAndNameAndPrice(Long eventId, String name, BigDecimal price);
}
