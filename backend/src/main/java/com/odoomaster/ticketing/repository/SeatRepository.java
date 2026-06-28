package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the Seat aggregate.
 */
public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findBySectionIdOrderByRowLabelAscSeatNumberAsc(Long sectionId);
    Optional<Seat> findBySectionIdAndRowLabelAndSeatNumber(Long sectionId, String rowLabel, String seatNumber);
}
